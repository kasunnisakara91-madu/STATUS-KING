export default {
  cmd: ['alive'], category: 'main', desc: 'Check bot is online',
  run: async ({ sendLogo, config }) =>
    sendLogo(`👑 *${config.BOT_NAME}* is alive ✅\n\n⏱️ Uptime : ${Math.floor(process.uptime() / 60)} min`),
};
