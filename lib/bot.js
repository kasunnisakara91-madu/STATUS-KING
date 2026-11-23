import fs from 'fs';
import pino from 'pino';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, jidNormalizedUser } from '@itsliaaa/baileys';
import config from '../config.js';
import { getAuthState, removeSession } from './session.js';
import { handle } from './handler.js';

const active = new Map();
const retries = new Map();
const logger = pino({ level: 'silent' });
const LOGO = fs.readFileSync(config.LOGO);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const platform = () =>
  process.env.DYNO ? 'Heroku' : process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID ? 'Railway' : 'Local / VPS';

async function onOpen(sock, number) {
  retries.set(number, 0);
  console.log(`🟢 [${number}] CONNECTED as ${sock.user?.id}`);
  await sleep(3000); // let keys sync before first send
  try {
    const me = jidNormalizedUser(sock.user.id);
    const caption =
`👑 *${config.BOT_NAME}* CONNECTED ✅

📱 Number : ${number}
🖥️ Platform : ${platform()}
🔣 Prefix : ${config.PREFIX}
🕒 Time : ${new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}

Type *${config.PREFIX}menu* to start.`;
    await sock.sendMessage(me, { image: LOGO, caption });
    console.log(`📨 [${number}] connect message sent`);
  } catch (e) { console.error(`❌ [${number}] connect message failed:`, e.message); }

  for (const link of config.GROUP_LINKS) {
    const code = link.split('chat.whatsapp.com/')[1]?.split(/[?\s]/)[0];
    if (!code) continue;
    try { await sock.groupAcceptInvite(code); console.log(`👥 joined group ${code}`); }
    catch (e) { console.error(`❌ group join failed (${code}):`, e.message); }
  }
}

function reconnect(number) {
  const n = (retries.get(number) || 0) + 1;
  retries.set(number, n);
  const wait = Math.min(3000 * n, 30000);
  console.log(`🔁 [${number}] reconnecting in ${wait / 1000}s (try ${n})`);
  setTimeout(() => startBot(number).catch((e) => { console.error(`❌ [${number}] start failed:`, e.message); reconnect(number); }), wait);
}

export async function startBot(number, { pair = false } = {}) {
  const { state, saveCreds } = await getAuthState(number);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch { console.log('⚠️ could not fetch WA version, using default'); }

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
  });
  active.set(number, sock);

  sock.ev.on('creds.update', async () => { try { await saveCreds(); } catch (e) { console.error('❌ saveCreds:', e.message); } });

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection) console.log(`🔌 [${number}] ${connection}`);
    if (connection === 'open') return onOpen(sock, number).catch((e) => console.error('[onOpen]', e));
    if (connection === 'close') {
      if (sock.manualStop) return;
      active.delete(number);
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`🔴 [${number}] closed, code=${code} ${lastDisconnect?.error?.message || ''}`);
      if (code === DisconnectReason.loggedOut) { await removeSession(number); console.log(`🗑️ [${number}] logged out, session removed`); return; }
      if (code === DisconnectReason.connectionReplaced) { console.log(`⚠️ [${number}] session opened elsewhere (another running copy?). Stop the other one.`); return; }
      reconnect(number);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) await handle(sock, m).catch((e) => console.error('[handler]', e));
  });

  let code;
  if (pair && !state.creds.registered) {
    await sleep(2500);
    code = await sock.requestPairingCode(number);
  }
  return { sock, code };
}

export async function pairNumber(number) {
  const old = active.get(number);
  if (old?.user) throw new Error('This number is already linked');
  if (old) { old.manualStop = true; old.end?.(); active.delete(number); }
  const { code } = await startBot(number, { pair: true });
  if (!code) throw new Error('Could not get pairing code');
  return code.match(/.{1,4}/g).join('-');
}
