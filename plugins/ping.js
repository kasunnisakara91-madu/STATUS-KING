export default {
  cmd: ['ping'], category: 'main', desc: 'Bot speed',
  run: async ({ sendLogo, m }) => {
    const ms = Date.now() - (Number(m.messageTimestamp) * 1000 || Date.now());
    await sendLogo(`🏓 *Pong!* ${Math.abs(ms)} ms`);
  },
};
