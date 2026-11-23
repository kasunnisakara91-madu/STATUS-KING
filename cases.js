// ➕ Add any `case` here. Return true when handled.
// ctx: sock, m, from, sender, args, text, command, isOwner, isGroup, reply(), sendLogo(), config
export default async function cases(ctx) {
  const { command, text, reply, isOwner } = ctx;
  switch (command) {
    case 'hello':
      await reply('Hello from STATUS KING 👑');
      return true;

    // case 'yourcase':
    //   if (!isOwner) return true;
    //   await reply('...');
    //   return true;

    default:
      return false;
  }
}
