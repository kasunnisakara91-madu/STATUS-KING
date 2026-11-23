import fs from 'fs';
import pino from 'pino';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore } from '@itsliaaa/baileys';
import config from '../config.js';
import { getAuthState, removeSession } from './session.js';
import { handle } from './handler.js';

const active = new Map();
const logger = pino({ level: 'silent' });
const LOGO = fs.readFileSync(config.LOGO);

const platform = () =>
  process.env.DYNO ? 'Heroku' : process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID ? 'Railway' : 'Local / VPS';

async function onOpen(sock, number) {
  console.log(`🟢 ${number} connected`);
  const me = sock.user.id.split(':')[0] + '@s.whatsapp.net';
  const caption =
`👑 *${config.BOT_NAME}* CONNECTED ✅

📱 Number : ${number}
🖥️ Platform : ${platform()}
🔣 Prefix : ${config.PREFIX}
🕒 Time : ${new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}

Type *${config.PREFIX}menu* to start.`;
  await sock.sendMessage(me, { image: LOGO, caption }).catch(() => {});
  for (const link of config.GROUP_LINKS) {
    const code = link.split('chat.whatsapp.com/')[1]?.split(/[?\s]/)[0];
    if (code) await sock.groupAcceptInvite(code).catch(() => {});
  }
}

export async function startBot(number, { pair = false } = {}) {
  const { state, saveCreds } = await getAuthState(number);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version, logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
  });
  active.set(number, sock);

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') await onOpen(sock, number);
    if (connection === 'close') {
      if (sock.manualStop) return;
      active.delete(number);
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) await removeSession(number);
      else setTimeout(() => startBot(number).catch(console.error), 3000);
    }
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) await handle(sock, m).catch((e) => console.error('[handler]', e.message));
  });

  let code;
  if (pair && !state.creds.registered) {
    await new Promise((r) => setTimeout(r, 2500));
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
