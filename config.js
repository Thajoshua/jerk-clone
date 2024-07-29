require('dotenv').config();

const toBool = (x) => x == 'true';
module.exports = {
  HANDLERS: (process.env.HANDLERS || '^[.]').trim(),
  MODE: (process.env.MODE || 'private').toLowerCase(),
  ERROR_MSG: toBool(process.env.ERROR_MSG) || true,
  LOG_MSG: toBool(process.env.LOG_MSG) || true,
  OWNER_NAME: process.env.OWNER_NAME || "JOSH",
  BOT_NAME: process.env.BOT_NAME || "Axiom",
  SESSION_ID: ' eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiNFBrV2ZkeU1WZ0tkYW1LSG9lcyt5MUlFNDZtNHhDYTdaVlpDUFpTRHJIRT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiL0taTnpod3IzUjNuRVdRRkM5LzlsS1M2dlZCVENRUlZnalU3S3pLdXN6ST0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJNTVF0alg0MzRRNTBuMm10di9mbVdKaXRJNGxQRVprK3Z0UzZwY1MzSEVvPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiI0MFozdHJsZkNiUUt4eXVHVmp6ZlVXY1U3UHBjc3liL3dDc1NYN1JoU2hjPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IjhEblJCZC9KT1c1MzlFb3BpMTFjbjE5V3U2L3dYZG5YQ2hUeG85MkhJMFU9In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6ImV0dkdObkdjOVlrZ2lkRE1PYldEL09UOUoyNXM5eVdxUEtBNStXRVdlMmM9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoibUlnVHhCbEVuOHdrbFV2ZHhVMU9Wc3FkV20zekkyb21NbHFmbkkrc0JrYz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiWW04dVBBb0YzeUtNUjJJV3lUMkFIWngrTk9kT25RcEt1WEhEczJOWVoxZz0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6ImV5YnBVMTN5ZzhVOXdCY3FtNEhqWlNoSkd1UGFPcS84dTNBM29SQU5PSEpzOHR6UEU1TUgvZUdUelBJS1ljR2xYNVBjcGtCaHF0eU1zNWhZZTRxR0JRPT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6MTY2LCJhZHZTZWNyZXRLZXkiOiJ6MldzMzZDTGlxRnVJaEtmbm90ZkFvYmxlY3p3TmVpSnA4ekY3UzkyRzRRPSIsInByb2Nlc3NlZEhpc3RvcnlNZXNzYWdlcyI6W10sIm5leHRQcmVLZXlJZCI6MzEsImZpcnN0VW51cGxvYWRlZFByZUtleUlkIjozMSwiYWNjb3VudFN5bmNDb3VudGVyIjowLCJhY2NvdW50U2V0dGluZ3MiOnsidW5hcmNoaXZlQ2hhdHMiOmZhbHNlfSwiZGV2aWNlSWQiOiJjbFlILVFvTFRHMkxoQ1ctamxsSE5nIiwicGhvbmVJZCI6IjExZTEyZmNmLWQyODktNGNhYy05YWNmLWY0NWRkODdlYWY1MiIsImlkZW50aXR5SWQiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJwbmxLOFZPOTdVL3NMWHdnaDhLWldMTmlhUm89In0sInJlZ2lzdGVyZWQiOmZhbHNlLCJiYWNrdXBUb2tlbiI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6Iks1VitQVThYRkszTVpkUDNsWlZpaU5icDdRYz0ifSwicmVnaXN0cmF0aW9uIjp7fSwiYWNjb3VudCI6eyJkZXRhaWxzIjoiQ0lxNDFlb0dFTnp2bXJVR0dBRWdBQ2dBIiwiYWNjb3VudFNpZ25hdHVyZUtleSI6ImtqS01aZlYzakhJMzZDUEt0clNJeVZlTDRLZnhpeGt1SlAxUmhoblJtem89IiwiYWNjb3VudFNpZ25hdHVyZSI6Ijh6Yi9oQXM4VFVSUlZlVllJYXIrZlFnQ0xxSkNOWDRacmhSMUdsZDI2akFsTGthakF5bHBycngxWWo4RHhzdTBZRHBlTU9tZ1VKSW0yUWZRQzlYeUFRPT0iLCJkZXZpY2VTaWduYXR1cmUiOiJpTEhhMEJUMVhlQmRyU2tNcUpXdTZSV1JFSlRxQUtKV0FpU0NpcHI1R3dGWGpnS2FZazZHUWRHY08zZENSQ0hLVGhBV1FsemVadE1yVW1WTWpFMndCUT09In0sIm1lIjp7ImlkIjoiMjM0NzA1ODA4OTU3OTo3NEBzLndoYXRzYXBwLm5ldCIsImxpZCI6IjU5Nzc3NzkxMDM3NTI2Ojc0QGxpZCJ9LCJzaWduYWxJZGVudGl0aWVzIjpbeyJpZGVudGlmaWVyIjp7Im5hbWUiOiIyMzQ3MDU4MDg5NTc5Ojc0QHMud2hhdHNhcHAubmV0IiwiZGV2aWNlSWQiOjB9LCJpZGVudGlmaWVyS2V5Ijp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQlpJeWpHWDFkNHh5TitnanlyYTBpTWxYaStDbjhZc1pMaVQ5VVlZWjBaczYifX1dLCJwbGF0Zm9ybSI6ImFuZHJvaWQiLCJyb3V0aW5nSW5mbyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkNBc0lEUT09In0sImxhc3RBY2NvdW50U3luY1RpbWVzdGFtcCI6MTcyMjIwMjA4MSwibGFzdFByb3BIYXNoIjoiMXloSVJBIiwibXlBcHBTdGF0ZUtleUlkIjoiQUFBQUFDYlAifQ==',
  auto_status_saver:true,
  ONLINE: process.env.ONLINNE || true,
  RECORD: process.env.RECORD || false,
  READ_CMD: toBool(process.env.READ_CMD),
  READ_MSG: toBool(process.env.READ_MSG),
  SUDO: process.env.SUDO || '2348050907760,2347039570336,2347058089579',
  stickerPackName: 'Axiom',
  stickerAuthor: 'JOSH',
  ANTIDELETE_ENABLED: true,
  ANTIDELETE_DESTINATION: 'sudo',
  ANTIBADWORD: {
    enabled: true,
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

