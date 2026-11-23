const fs = require('fs');
const cfg = require('../config');
const start = Date.now();
const logo = () => fs.readFileSync(cfg.LOGO);
const up = () => {
  const s = Math.floor((Date.now() - start) / 1000);
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
};
const withLogo = (sock, jid, caption, m) =>
  sock.sendMessage(jid, { image: logo(), caption }, { quoted: m });

module.exports = async function handle({ sock, m, jid, cmd, args, sender, isGroup, isOwner, db }) {
  const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: m });
  const p = cfg.PREFIX;
  switch (cmd) {
    case 'menu': case 'help':
      return withLogo(sock, jid,
`╭━━〔 👑 *${cfg.BOT_NAME}* 〕━━⬣
┃ Prefix : ${p}
┃ Uptime : ${up()}
╰━━━━━━━━━━━━━━⬣

╭─❖ *MAIN*
│ ${p}alive  ${p}ping  ${p}owner
│ ${p}runtime  ${p}menu  ${p}jid
╰─────────
╭─❖ *FUN / TOOLS*
│ ${p}joke  ${p}dice  ${p}flip
│ ${p}rate  ${p}say  ${p}calc  ${p}time
╰─────────
╭─❖ *GROUP*
│ ${p}tagall  ${p}hidetag  ${p}groupinfo
│ ${p}link  ${p}join <link> (owner)
╰─────────
╭─❖ *OWNER*
│ ${p}broadcast  ${p}setstatus  ${p}stats
╰─────────
> ${cfg.BOT_NAME}`, m);

    case 'alive':
      return withLogo(sock, jid, `👑 *${cfg.BOT_NAME}* is alive!\n⏱ Uptime: ${up()}\n🗄 DB: MongoDB ✅`, m);

    case 'ping': {
      const t = Date.now();
      await reply('🏓 Pinging...');
      return reply(`🏓 Pong! ${Date.now() - t} ms`);
    }

    case 'owner':
      await sock.sendMessage(jid, { contacts: { displayName: cfg.OWNER_NAME, contacts: [{ vcard:
        `BEGIN:VCARD\nVERSION:3.0\nFN:${cfg.OWNER_NAME}\nTEL;type=CELL;waid=${cfg.OWNER_NUMBER}:+${cfg.OWNER_NUMBER}\nEND:VCARD` }] } }, { quoted: m });
      return withLogo(sock, jid, `👑 Owner: ${cfg.OWNER_NAME}\nwa.me/${cfg.OWNER_NUMBER}`, m);

    case 'runtime': return reply(`⏱ ${up()}`);
    case 'jid': return reply(jid);
    case 'time': return reply(new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' }));
    case 'say': return reply(args.join(' ') || 'Text දෙන්න');
    case 'dice': return reply(`🎲 ${1 + Math.floor(Math.random() * 6)}`);
    case 'flip': return reply(Math.random() < 0.5 ? '🪙 Heads' : '🪙 Tails');
    case 'rate': return reply(`⭐ ${Math.floor(Math.random() * 101)}%`);
    case 'joke': {
      const j = ['WiFi එකට කතා කළා, signal එකක්වත් දුන්නේ නෑ 😂', 'Bug එකක් fix කළා, තව බග් දෙකක් ආවා 😄'];
      return reply(j[Math.floor(Math.random() * j.length)]);
    }
    case 'calc': {
      const e = args.join(' ');
      if (!/^[0-9+\-*/().%\s]+$/.test(e)) return reply('අංක සහ + - * / විතරයි');
      try { return reply(`= ${Function(`"use strict";return (${e})`)()}`); } catch { return reply('වැරදි expression'); }
    }

    case 'tagall': case 'hidetag': {
      if (!isGroup) return reply('Group එකක විතරයි');
      const md = await sock.groupMetadata(jid);
      const ids = md.participants.map((x) => x.id);
      const body = cmd === 'tagall'
        ? `📢 ${args.join(' ') || 'Attention!'}\n\n` + ids.map((i) => `@${i.split('@')[0]}`).join('\n')
        : args.join(' ') || '👑';
      return sock.sendMessage(jid, { text: body, mentions: ids }, { quoted: m });
    }
    case 'groupinfo': {
      if (!isGroup) return reply('Group එකක විතරයි');
      const md = await sock.groupMetadata(jid);
      return reply(`👥 ${md.subject}\nMembers: ${md.participants.length}\nID: ${jid}`);
    }
    case 'link': {
      if (!isGroup) return reply('Group එකක විතරයි');
      try { return reply('https://chat.whatsapp.com/' + await sock.groupInviteCode(jid)); }
      catch { return reply('Bot admin විය යුතුයි'); }
    }

    case 'join': {
      if (!isOwner) return reply('Owner ට විතරයි');
      const code = (args[0] || '').split('chat.whatsapp.com/')[1] || args[0];
      if (!code) return reply('Link එක දෙන්න');
      try { await sock.groupAcceptInvite(code.trim()); return reply('✅ Joined'); }
      catch (e) { return reply('❌ ' + e.message); }
    }
    case 'broadcast': {
      if (!isOwner) return reply('Owner ට විතරයි');
      const groups = Object.keys(await sock.groupFetchAllParticipating());
      for (const g of groups) {
        await sock.sendMessage(g, { text: `📢 *${cfg.BOT_NAME}*\n\n${args.join(' ')}` });
        await new Promise((r) => setTimeout(r, 1500));
      }
      return reply(`✅ ${groups.length} groups වලට යැවුවා`);
    }
    case 'setstatus':
      if (!isOwner) return reply('Owner ට විතරයි');
      await sock.updateProfileStatus(args.join(' ')); return reply('✅ Updated');
    case 'stats': {
      if (!isOwner) return reply('Owner ට විතරයි');
      const n = await db.collection('stats').countDocuments();
      return reply(`📊 Commands used: ${n}\n⏱ ${up()}`);
    }
    default: return false;
  }
};
