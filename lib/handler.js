import fs from 'fs';
import { jidNormalizedUser } from '@itsliaaa/baileys';
import config from '../config.js';
import { plugins } from './plugins.js';
import cases from '../cases.js';

const LOGO = fs.readFileSync(config.LOGO);

export async function handle(sock, m) {
  if (!m.message) return;
  const from = m.key.remoteJid;

  if (from === 'status@broadcast') {
    if (config.AUTO_STATUS_SEEN) await sock.readMessages([m.key]).catch(() => {});
    if (config.AUTO_STATUS_LIKE && !m.key.fromMe)
      await sock.sendMessage(from, { react: { text: '💚', key: m.key } },
        { statusJidList: [m.key.participant, jidNormalizedUser(sock.user.id)] }).catch(() => {});
    return;
  }

  let msg = m.message;
  if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
  if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
  const body = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption ||
    msg.videoMessage?.caption || msg.buttonsResponseMessage?.selectedButtonId ||
    msg.listResponseMessage?.singleSelectReply?.selectedRowId || '';
  if (!body.startsWith(config.PREFIX)) return;

  const [cmd, ...args] = body.slice(config.PREFIX.length).trim().split(/\s+/);
  const sender = m.key.participant || from;
  const num = sender.split('@')[0].split(':')[0];
  const ctx = {
    sock, m, from, sender, args, config,
    command: cmd.toLowerCase(),
    text: args.join(' '),
    isGroup: from.endsWith('@g.us'),
    isOwner: m.key.fromMe || config.OWNER.includes(num),
    reply: (text) => sock.sendMessage(from, { text }, { quoted: m }),
    sendLogo: (caption) => sock.sendMessage(from, { image: LOGO, caption }, { quoted: m }),
  };

  if (await cases(ctx)) return;                                   // cases.js first
  const p = plugins.find((x) => x.cmd.includes(ctx.command));     // then plugins/
  if (!p) return;
  if (p.owner && !ctx.isOwner) return ctx.reply('❌ Owner only command.');
  await p.run(ctx);
}
