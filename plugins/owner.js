export default {
  cmd: ['owner'], category: 'main', desc: 'Owner contact',
  run: async ({ sendLogo, config }) =>
    sendLogo(`👤 *${config.BOT_NAME} Owner*\n\nwa.me/${config.OWNER[0]}`),
};
