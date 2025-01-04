const { existsSync } = require('fs')
const path = require('path')
const configPath = path.join(__dirname, './config.env')
if (existsSync(configPath)) require('dotenv').config({ path: configPath })

const toBool = (x) => x == 'true';
module.exports = {
  HANDLERS: (process.env.HANDLERS || '^[/]').trim(),
  MODE: (process.env.MODE || 'private').toLowerCase(),
  VPS: toBool(process.env.VPS) || false,
  ERROR_MSG: toBool(process.env.ERROR_MSG) || true,
  TIMEZONE: process.env.TIMEZONE || 'Africa/Lagos',
  LOG_MSG: toBool(process.env.LOG_MSG) || true,
  OWNER_NAME: process.env.OWNER_NAME || "JOSH",
  BOT_NAME: process.env.BOT_NAME || "Axiom",
  ONLINE: process.env.ONLINNE || false,
  WARNLIMIT: process.env.WARNLIMIT || 5,
  AUTO_STATUS: process.env.AUTO_STATUS || false,
  AUTO_REJECT_ENABLED: process.env.AUTO_REJECT_ENABLED || false,
  SESSION_ID: process.env.SESSION_ID || "",
  RECORD: process.env.RECORD || false,
  READ_CMD: toBool(process.env.READ_CMD) || true,
  READ_MSG: toBool(process.env.READ_MSG) || false,
  SUDO: process.env.SUDO || '2348142304526,2347039570336,27828418477,2347058089579',
  STICKERPACKNAME: process.env.STICKERPACKNAME || 'Axiom',
  STICKER_AUTHOR: process.env.STICKER_AUTHOR || 'JOSH',
  ANTIDELETE_ENABLED: process.env.ANTIDELETE_ENABLED || false,
  ANTIDELETE_DESTINATION: process.env.ANTIDELETE_DESTINATION || 'sudo',
  AUTH_CLEANUP_ENABLED: true,
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
  },
};
