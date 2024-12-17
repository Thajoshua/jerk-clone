require('dotenv').config();

const toBool = (x) => x == 'true';
module.exports = {
  HANDLERS: (process.env.HANDLERS || '^[.]').trim(),
  MODE: (process.env.MODE || 'private').toLowerCase(),
  ERROR_MSG: toBool(process.env.ERROR_MSG) || true,
  LOG_MSG: toBool(process.env.LOG_MSG) || true,
  OWNER_NAME: process.env.OWNER_NAME || "JOSH",
  BOT_NAME: process.env.BOT_NAME || "Axiom",
  auto_status_saver:true,
  ONLINE: process.env.ONLINNE || true,
  SESSION_ID: process.env.SESSION_ID || "vcBqAW5u",
  RECORD: process.env.RECORD || false,
  READ_CMD: toBool(process.env.READ_CMD),
  READ_MSG: toBool(process.env.READ_MSG),
  SUDO: process.env.SUDO || '2348142304526,2347039570336,2347058089579',
  stickerPackName: 'Axiom',
  stickerAuthor: 'JOSH',
  ANTIDELETE_ENABLED: false,
  ANTIDELETE_DESTINATION: 'sudo',
  ANTIBADWORD: {
    enabled: false,
    action: 'warn', // 'warn', 'delete', or 'kick'
    warnLimit: 3,
    badwords: ['fuck'] // Add your list of bad words here
  },
  ANTILINK: {
    enabled: false,
    action: 'delete', // 'warn', 'delete', 'kick'
    warningMessage: 'Sending links is not allowed in this group!',
    whitelistedDomains: ['example.com', 'trusted-site.org'],
    maxWarnings: 3
  }
};
