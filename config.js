const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
export default {
  BOT_NAME: 'STATUS KING',
  PREFIX: process.env.PREFIX || '.',
  OWNER: list(process.env.OWNER || '94700000000'),           // owner numbers (country code, no +)
  MONGO_URI: process.env.MONGO_URI || '',                    // empty = local file sessions
  GROUP_LINKS: list(process.env.GROUP_LINKS || ''),          // auto join invite links
  AUTO_STATUS_SEEN: (process.env.AUTO_STATUS_SEEN || 'true') === 'true',
  AUTO_STATUS_LIKE: (process.env.AUTO_STATUS_LIKE || 'false') === 'true',
  LOGO: './public/logo.jpg',
  PORT: process.env.PORT || 3000,
};
