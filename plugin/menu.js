import { plugins } from '../lib/plugins.js';
export default {
  cmd: ['menu', 'help'], category: 'main', desc: 'Show menu',
  run: async ({ sendLogo, config }) => {
    const cats = {};
    for (const p of plugins) (cats[p.category || 'other'] ||= []).push(p);
    let t = `👑 *${config.BOT_NAME}* 👑\n\nPrefix : ${config.PREFIX}\n`;
    for (const [c, list] of Object.entries(cats)) {
      t += `\n╭─❮ *${c.toUpperCase()}* ❯\n`;
      for (const p of list) t += `│ ${config.PREFIX}${p.cmd[0]}${p.desc ? ' - ' + p.desc : ''}\n`;
      t += '╰──────────\n';
    }
    await sendLogo(t);
  },
};
