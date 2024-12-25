const { exec } = require('child_process');
const { Index, mode } = require('../lib/');
const { TelegraPh } = require('../lib/utils');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { numToJid } = require('../lib/index');
const { DataTypes } = require('sequelize');
const { sequelize, AliveSettings } = require('../database');

// Helper function for uptime
function formatUptime() {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Store the auto reject state
let autoRejectEnabled = false;

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





Index({
  pattern: 'userinfo',
  fromMe: false,
  desc: 'Display information about the user',
  type: 'utility'
}, async (message) => {
  try {
    const userInput = await message.getUserInput();
    
    const userJid = userInput 
      ? `${userInput}@s.whatsapp.net` 
      : message.sender;

    const ppUrl = await message.client.profilePictureUrl(userJid, 'image').catch(() => null);
    let userInfo = `*User Information*\n\n`;
    userInfo += `• Name: ${message.pushName || 'Unknown'}\n`;
    userInfo += `• Number: ${userJid.split('@')[0]}\n`;

    if (ppUrl) {
      await message.client.sendMessage(message.chat, {
        image: { url: ppUrl },
        caption: userInfo
      });
    } else {
      await message.reply(userInfo);
    }
  } catch (error) {
    console.error('Error in userinfo command:', error);
    await message.reply('Could not retrieve user information.');
  }
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


Index({
  pattern: 'anticall',
  fromMe: true,
  desc: 'Configure auto call reject settings',
  type: 'admin'
}, async (message) => {
  const input = message.getUserInput()?.toLowerCase().trim();

  if (!input || !['on', 'off', 'status'].includes(input)) {
    return await message.reply(
      '*🔄 Auto Call Reject Settings*\n\n' +
      'Commands:\n' +
      '├ .autocall on - Enable auto call reject\n' +
      '├ .autocall off - Disable auto call reject\n' +
      '└ .autocall status - Check current status\n\n' +
      'Current Status: ' + (autoRejectEnabled ? 'Enabled ✅' : 'Disabled ❌')
    );
  }

  switch (input) {
    case 'on':
      autoRejectEnabled = true;
      await message.reply('✅ Auto call reject has been *enabled*');
      break;

    case 'off':
      autoRejectEnabled = false;
      await message.reply('❌ Auto call reject has been *disabled*');
      break;

    case 'status':
      await message.reply(
        '*🔄 Auto Call Reject Status*\n\n' +
        `Status: ${autoRejectEnabled ? 'Enabled ✅' : 'Disabled ❌'}`
      );
      break;
  }
});

async function handleIncomingCall(call, client) {
  if (!autoRejectEnabled) return;
  try {
    await client.rejectCall(call.id, call.from);
    await client.sendMessage(call.from, {
      text: '❌ Auto reject is enabled. Voice and video calls are not accepted.'
    });
    
    console.log('Rejected call from:', call.from);
  } catch (error) {
    console.error('Error rejecting call:', error);
  }
}

Index({
  pattern: 'joke',
  fromMe: true,
  desc: 'Get a random joke',
  type: 'fun'
}, async (message) => {
  try {
      const response = await fetch('https://official-joke-api.appspot.com/random_joke');
      if (!response.ok) throw new Error('Network response was not ok');
      const joke = await response.json();

      await message.reply(`Here's a joke for you:\n\n${joke.setup}\n\n${joke.punchline}`);
  } catch (error) {
      console.error(error);
      await message.reply("Sorry, I couldn't fetch a joke at the moment. Please try again later.");
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
  pattern: 'forward ?(.*)',
  fromMe: true,
  desc: 'Forward a message to one or multiple numbers/groups',
  type: 'utility'
}, async (message, match) => {
  try {
    if (!message.quoted) {
      return await message.reply('Please reply to a message to forward it.');
    }

    // Get the target JIDs
    const targetJids = message.getUserInput();
    if (!targetJids) {
      return await message.reply('Please provide number(s)/group ID(s) to forward to.\n\nExample:\n.forward 1234567890,987654321\n.forward 1234567890');
    }

    // Split and format JIDs
    const jids = targetJids.split(',').map(jid => {
      jid = jid.trim();
      if (!jid.includes('@')) {
        return jid.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      }
      return jid;
    });

    let messageContent;
    const quotedType = message.quotedType;
    if (quotedType === 'conversation' || quotedType === 'extendedTextMessage') {
      messageContent = {
        text: message.quotedText
      };
    } else if (message.quoted.message) {
      const buffer = await message.downloadMediaMessage();
      if (quotedType === 'imageMessage') {
        messageContent = {
          image: buffer,
          caption: message.quoted.message.imageMessage?.caption || ''
        };
      } else if (quotedType === 'videoMessage') {
        messageContent = {
          video: buffer,
          caption: message.quoted.message.videoMessage?.caption || ''
        };
      } else if (quotedType === 'audioMessage') {
        messageContent = {
          audio: buffer,
          mimetype: 'audio/mp4'
        };
      } else if (quotedType === 'stickerMessage') {
        messageContent = {
          sticker: buffer
        };
      } else if (quotedType === 'documentMessage') {
        messageContent = {
          document: buffer,
          mimetype: message.quoted.message.documentMessage?.mimetype,
          fileName: message.quoted.message.documentMessage?.fileName
        };
      }
    }

    if (!messageContent) {
      message.react('❌')
      return await message.reply('Unsupported message type for forwarding');
    }

    // Forward to all JIDs
    let successCount = 0;
    let failedJids = [];

    for (const jid of jids) {
      try {
        await message.client.sendMessage(jid, messageContent);
        successCount++;
      } catch (error) {
        failedJids.push(jid);
        console.error(`Failed to forward to ${jid}:`, error);
      }
    }

    // Send status report
    let statusMessage = `Forward Status:\n✅ Successfully sent to ${successCount}/${jids.length} recipients`;
    if (failedJids.length > 0) {
      statusMessage += `\n❌ Failed to send to:\n${failedJids.join('\n')}`;
    }

    await message.react(failedJids.length === 0 ? '✅' : '⚠️');
    await message.reply(statusMessage);
    
    setTimeout(() => {
      message.react('');
    }, 3000);

  } catch (error) {
    message.react('❌')
    console.error('Forward command error:', error);
    await message.reply('Failed to forward message: ' + error.message);
  }
});


Index({
  pattern: "setpp",
  fromMe: true,
  desc: "Set profile picture",
  type: "user",
},
async (message) => {
  if (!message.quoted ){
    return await message.reply("_Reply to a photo_");
  }
  let buff = await message.downloadMediaMessage();
  await message.setPP(message.user, buff);
  return await message.reply("_Profile Picture Updated_");
}
);

let gis = require("g-i-s");

const sendfromurl = async (message, url) => {
  let buff = await axios.get(url, { responseType: 'arraybuffer' });
  await message.sendMedia({
    buffer: Buffer.from(buff.data),
    mimetype: 'image/jpeg',
    caption: message.quotedText
  });
}

Index({
  pattern: "img",
  fromMe: true,
  desc: "Google Image search",
  type: "downloader",
}, async (message, match, m) => {
  const input = message.getUserInput();
  if (!input) return await message.sendMessage(message.jid,"Enter Search Term,number");
  let [query, amount] = input.split(",");
  let result = await gimage(query, amount);
  await message.sendMessage(
    message.jid,
      `_Downloading ${amount || 5} images for ${query}_`
    );
    for (let i of result) {
      await sendfromurl(message, i);
    }
  }
);

async function gimage(query, amount = 5) {
  let list = [];
  return new Promise((resolve, reject) => {
    gis(query, async (error, result) => {
      for (
        var i = 0;
        i < (result.length < amount ? result.length : amount);
        i++
      ) {
        list.push(result[i].url);
        resolve(list);
      }
    });
  });
}

Index({
  pattern: 'vv',
  fromMe: true,
  desc: 'Get media from view once message',
  type: 'utility'
}, async (message) => {
  if (!message.quoted) {
    return await message.reply('Please reply to a view once message');
  }

  if (message.quotedType !== 'viewOnceMessage' && message.quotedType !== 'viewOnceMessageV2') {
    return await message.reply('This is not a view once message');
  }

  try {
    let viewOnceMsg = message.quoted.message.viewOnceMessage || message.quoted.message.viewOnceMessageV2;
    // console.log(`View Once Message: ${JSON.stringify(viewOnceMsg)}`);
    if (viewOnceMsg.message) {
      if (viewOnceMsg.message.imageMessage) {
        const imageMessage = viewOnceMsg.message.imageMessage;
        const caption = imageMessage.caption || '';
        const filepath = await message.downloadAndSaveMediaMessage(imageMessage, path.join(os.tmpdir(), 'image'));
        
        await message.client.sendMessage(message.jid, {
          image: { url: filepath },
          caption: caption
        });
      } 
      else if (viewOnceMsg.message.videoMessage) {
        const videoMessage = viewOnceMsg.message.videoMessage;
        const caption = videoMessage.caption || '';
        const filepath = await message.downloadAndSaveMediaMessage(videoMessage, path.join(os.tmpdir(), 'video'));
        
        await message.client.sendMessage(message.jid, {
          video: { url: filepath },
          caption: caption
        });
      }
      else {
        return await message.reply('No media found in view once message');
      }
    }
  } catch (error) {
    console.error('Error handling view once message:', error);
    await message.reply('Failed to handle view once message');
  }
});

module.exports = {
  handleIncomingCall
};