// const config = require('../config');
// const Index = require('./index').addCommand;
// const isAdmin = require('./utils').isAdmin;

// const antiDemoteConfig = {
//   enabled: false,
// };

// Index({
//   pattern: 'antidemote',
//   fromMe: true,
//   desc: 'Enable or disable anti-demote feature',
//   type: 'admin'
// }, async (message) => {
//   if (!message.isGroup) return await message.reply('This command can only be used in a group.');
//   if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to manage this setting.');

//   const status = await message.getUserInput('Please specify "on" or "off".');
//   if (status === 'on') {
//     antiDemoteConfig.enabled = true;
//     await message.reply('Anti-demote feature enabled.');
//   } else if (status === 'off') {
//     antiDemoteConfig.enabled = false;
//     await message.reply('Anti-demote feature disabled.');
//   } else {
//     await message.reply('Invalid input. Please specify "on" or "off".');
//   }
// });

// Index({
//   on: 'message',
//   fromMe: false,
//   dontAddCommandList: true,
// }, async (message) => {
//   if (antiDemoteConfig.enabled && message.messageStubType === 24) { // 24 is the stub type for demotion
//     const demotedUserJid = message.messageStubParameters[0];
//     if (!await isAdmin(message, message.client.user.id)) return;

//     try {
//       await message.client.groupParticipantsUpdate(message.jid, [demotedUserJid], 'promote');
//       await message.reply(`Promoted ${demotedUserJid} back to admin.`);
//     } catch (error) {
//       await message.reply('Failed to promote the demoted user back to admin. Make sure I have permission to promote members.');
//     }
//   }
// });
