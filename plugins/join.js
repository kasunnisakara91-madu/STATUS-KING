export default {
  cmd: ['join'], category: 'owner', desc: 'Join group by link', owner: true,
  run: async ({ sock, text, reply }) => {
    const code = text.split('chat.whatsapp.com/')[1]?.split(/[?\s]/)[0];
    if (!code) return reply('Usage: .join <group link>');
    await sock.groupAcceptInvite(code);
    await reply('✅ Joined');
  },
};
