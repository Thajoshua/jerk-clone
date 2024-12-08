const { exec } = require('child_process');
const { Index, mode } = require('../lib/');
const { TelegraPh } = require('../lib/utils');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { numToJid } = require('../lib/index');

Index({
  pattern: 'restart',
  fromMe: mode,
  desc: 'Restart the bot',
  type: 'pm'
}, async (message, match) => {
  await message.reply('Restarting bot...');
  setTimeout(() => {
    exec('pm2 restart bot', (error, stdout, stderr) => {
      if (error) {
        console.error('Error restarting bot:', error);
        return message.reply(`Failed to restart bot: ${error.message}`);
      }
      console.log('Bot restarted successfully.');
    });
  }, 1000);
  process.exit(0);
});


Index({
  pattern: 'setsabout ?(.*)',
  fromMe: true,
  desc: 'Set your WhatsApp status',
  type: 'user'
}, async (message, match) => {
  const newStatus = message.getUserInput();
  if (!newStatus) return await message.reply('Please provide the new status text.');
  
  try {
      await message.client.updateProfileStatus(newStatus);
      await message.reply('Status updated successfully.');
  } catch (error) {
      await message.reply('Failed to update status.');
  }
});


Index({
  pattern: 'setname ?(.*)',
  fromMe: true,
  desc: 'Set your WhatsApp display name',
  type: 'user'
}, async (message) => {
  const newName = message.getUserInput();
  if (!newName) return await message.reply('Please provide the new display name.');
  
  try {
      await message.client.updateProfileName(newName);
      await message.reply('Display name updated successfully.');
  } catch (error) {
      await message.reply('Failed to update display name.');
  }
});



Index({
  pattern: 'block ?(.*)',
  fromMe: true,
  desc: 'Block a user',
  type: 'user'
}, async (message, match) => {
  const userToBlock = message.reply_message ? message.reply_message.sender : message.getUserInput();;
  if (!userToBlock) return await message.reply('Please reply to a message or provide the number to block.');
  
  try {
      await message.client.updateBlockStatus(userToBlock, "block");
      await message.reply('User blocked successfully.');
  } catch (error) {
      await message.reply('Failed to block user.');
  }
});


Index({
  pattern: 'unblock ?(.*)',
  fromMe: true,
  desc: 'Unblock a user',
  type: 'user'
}, async (message, match) => {
  const userToUnblock = message.reply_message ? message.reply_message.sender : message.getUserInput();
  if (!userToUnblock) return await message.reply('Please reply to a message or provide the number to unblock.');
  
  try {
      await message.client.updateBlockStatus(userToUnblock, "unblock");
      await message.reply('User unblocked successfully.');
  } catch (error) {
      await message.reply('Failed to unblock user.');
  }
});



function getUptime() {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

function loadUserConfig() {
  const configPath = path.join(__dirname, 'alive_config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return {
    message: "I'm alive!\n@username\nUptime: @uptime",
    profilePicUrl: '',
    customFields: {}
  };
}

function replacePlaceholders(message, data) {
  return message.replace(/@(\w+)/g, (match, key) => {
    return data[key] || match;
  });
}

Index({
  pattern: 'alive',
  fromMe: true,
  desc: 'Show bot status, set custom message, profile picture, and fields',
  type: 'info'
}, async (message) => {
  const config = loadUserConfig();
  const input = message.getUserInput();
  const [command, ...args] = input ? input.split(' ') : [];

  switch (command) {
    case 'set':
      if (args.length === 0) return message.reply('Please provide the alive message. Usage: .alive set Your custom message here');
      config.message = args.join(' ');
      fs.writeFileSync(path.join(__dirname, 'alive_config.json'), JSON.stringify(config, null, 2));
      return message.reply('Alive message updated successfully');

    case 'pic':
      if (args.length === 0) return message.reply('Please provide the profile picture URL. Usage: .alive pic https://example.com/your-image.jpg');
      config.profilePicUrl = args[0];
      fs.writeFileSync(path.join(__dirname, 'alive_config.json'), JSON.stringify(config, null, 2));
      return message.reply('Alive profile picture updated successfully');

    case 'field':
      if (args.length < 2) return message.reply('Please provide the field name and value. Usage: .alive field fieldname fieldvalue');
      const [fieldName, ...fieldValue] = args;
      config.customFields[fieldName] = fieldValue.join(' ');
      fs.writeFileSync(path.join(__dirname, 'alive_config.json'), JSON.stringify(config, null, 2));
      return message.reply(`Custom field "${fieldName}" added successfully`);

    default:
      const data = {
        username: message.pushName,
        uptime: getUptime(),
        ...config.customFields
      };

      const response = replacePlaceholders(config.message, data);

      if (config.profilePicUrl) {
        try {
          const { data } = await axios.get(config.profilePicUrl, { responseType: 'arraybuffer' });
          await message.sendMedia({
            buffer: Buffer.from(data),
            mimetype: 'image/jpeg',
            caption: response
          });
        } catch (error) {
          console.error('Error fetching profile picture:', error);
          await message.reply(response + '\n(Failed to load profile picture)');
        }
      } else {
        await message.reply(response);
      }
  }
});


Index({
  pattern: 'userinfo',
  fromMe: true,
  desc: 'Display information about the user',
  type: 'utility'
}, async (message) => {
  const { jid, pushName } = message;
  const ppUrl = await message.client.profilePictureUrl(jid, 'image');

  const userInfo = `
      Name: ${pushName || 'Unknown'}
      ID: ${jid}
      Profile Picture: ${ppUrl || 'No profile picture available'}
  `;

  await message.reply(userInfo);
});


Index({
  pattern: 'save',
  fromMe: true,
  desc: 'Save any type of message to user DM',
  type: 'utility'
}, async (message) => {
  if (!message.quoted) {
    return await message.reply('Please reply to a message to save it.');
  }
  try {
    const quotedMessage = message.quoted.message;
    const mediaType = message.quotedType;
    const userDM = message.sender;

    if (mediaType === 'conversation' || mediaType === 'extendedTextMessage') {
      const textToSave = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
      await message.client.sendMessage(userDM, { text: textToSave });
    } else if (mediaType === 'imageMessage' || mediaType === 'videoMessage' || mediaType === 'audioMessage' || mediaType === 'documentMessage') {
      const buffer = await message.downloadMediaMessage();
      const caption = quotedMessage[mediaType]?.caption || '';

      let messageContent;
      if (mediaType === 'imageMessage') {
        messageContent = {
          image: buffer,
          caption: caption
        };
      } else if (mediaType === 'videoMessage') {
        messageContent = {
          video: buffer,
          caption: caption
        };
      } else if (mediaType === 'audioMessage') {
        messageContent = {
          audio: buffer,
          mimetype: 'audio/mp4'
        };
      } else if (mediaType === 'documentMessage') {
        messageContent = {
          document: buffer,
          mimetype: quotedMessage[mediaType]?.mimetype,
          fileName: quotedMessage[mediaType]?.fileName
        };
      }

      await message.client.sendMessage(userDM, messageContent);
    } else {
      return await message.reply('Unsupported message type for saving.');
    }
  } catch (error) {
    console.error('Error in save command:', error);
    await message.reply('Failed to save the message. Please try again.');
  }
});


Index({
  pattern: 'link ?(.*)',
  fromMe: true,
  desc: 'Upload file to Telegra.ph, and get the link',
  type: 'media',
}, async (message, match) => {
  if (!message.quoted) {
    await message.reply('Please send a media file to upload.');
    return;
  }

  const filePath = path.resolve(__dirname, `upload_${Date.now()}`);
  const buffer = await message.downloadMediaMessage();
  fs.writeFileSync(filePath, buffer);

  try {
    const result = await TelegraPh(filePath);
    await message.reply(`${result}`);
  } catch (error) {
    console.error('Error uploading file:', error);
    await message.reply('There was an error uploading the file.');
  } finally {
    fs.unlinkSync(filePath);
  }
});


Index({
  pattern: 'suggestion',
  fromMe: false,
  desc: 'Send your support, complaint, or suggestion to the bot owner',
  type: 'utility'
}, async (message) => {
  const userInput = message.getUserInput();
  const senderJid = message.data.key.remoteJid;
  const userMessage = userInput.trim();

  if (!userMessage) {
    await message.reply('Please provide a message to send your suggestion.');
    return;
  }

  const ownerJid = numToJid('2348142304526');
  const senderNumber = senderJid.split('@')[0];

  const forwardMessage = `*New Suggestion/Complaint*\n\n` +
    `*From:* ${senderNumber}\n` +
    `*Message:* ${userMessage}`;

  await message.client.sendMessage(ownerJid, { text: forwardMessage });
  await message.reply('Your message has been sent successfully!');
});
