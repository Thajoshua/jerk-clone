  const { exec } = require('child_process');
  const { Index, mode } = require('../lib/');
  const { TelegraPh, updateConfig } = require('../lib/utils');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const axios = require('axios');
  const { numToJid } = require('../lib/index');
  const dotenv = require('dotenv');
  const { DataTypes } = require('sequelize');
  const { sequelize, AliveSettings } = require('../database/database');

  const play = require('play-dl');



  Index({
    pattern: 'disappear',
    fromMe: true,
    desc: 'Set disappearing message duration',
    type: 'utility'
  }, async (message) => {
    try {
        const duration = parseInt(message.getUserInput());
        
        if (isNaN(duration)) {
            return await message.reply(
                '*Disappearing Message Command Usage:*\n\n'
                + '*.disappear 0* - Turn off\n'
                + '*.disappear 86400* - 24 hours\n'
                + '*.disappear 604800* - 7 days\n'
                + '*.disappear 7776000* - 90 days'
            );
        }

        await message.client.updateDefaultDisappearingMode(duration);
        return await message.reply(`Disappearing message duration set to: ${duration} seconds`);
    } catch (error) {
        return await message.reply('Error: ' + (error.message || 'Unknown error occurred'));
    }
  });

  Index({
      pattern: 'play',
      fromMe: true,
      desc: 'Play music from YouTube',
      type: 'media'
  }, async (message) => {
      try {
          const query = message.getUserInput();
          if (!query) return await message.reply('Please provide a song title\nExample: .play despacito');

          await message.reply('🔍 Searching...');
          
          const videos = await play.search(query, { limit: 1 });
          if (!videos.length) {
              return await message.reply('No songs found!');
          }

          const video = videos[0];
          await message.reply(`🎵 Found: ${video.title}\n⌚ Duration: ${video.durationRaw}\n🔄 Downloading...`);

          console.log( video);

          const stream = await play.stream(video.url, {
              discordPlayerCompatibility: true
          });

          const tempDir = path.join(__dirname, '../temp');
          if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir);
          }

          const tmpFile = path.join(tempDir, `${video.id}.mp3`);

          await message.client.sendMessage(message.jid, {
              audio: {
                  url: stream.url
              },
              mimetype: 'audio/mpeg',
              fileName: `${video.title}.mp3`,
              ptt: false
          });

      } catch (error) {
          await message.reply('❌ Error: ' + error.message);
          console.error('Play command error:', error);
      }
  });

  // Helper function for uptime
  function formatUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  }



  Index({
    pattern: 'restart',
    fromMe: mode,
    desc: 'Restart the bot',
    type: 'pm'
  }, async (message, match) => {
    await message.reply('Restarting bot...');
    setTimeout(() => {
      exec('pm2 restart', (error, stdout, stderr) => {
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
    pattern: 'setabt ?(.*)',
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
    if (message.quoted) {
      try {
        await message.client.updateBlockStatus(message.quoted.participant, "block");
        return await message.reply('User blocked successfully.');
      } catch (error) {
        return await message.reply('Failed to block user.');
      }
    }
    const input = message.getUserInput();
    if (input) {
      const userToBlock = input.includes('@') ? input : input + '@s.whatsapp.net';
      try {
        await message.client.updateBlockStatus(userToBlock, "block");
        return await message.reply('User blocked successfully.');
      } catch (error) {
        return await message.reply('Failed to block user.');
      }
    }
    if (message.jid.endsWith('@s.whatsapp.net')) {
      try {
        await message.client.updateBlockStatus(message.jid, "block");
        return await message.reply('User blocked successfully.');
      } catch (error) {
        return await message.reply('Failed to block user.');
      }
    }

    return await message.reply('Please reply to a message, provide the number to block, or use in user chat.');
  });


  Index({
    pattern: 'unblock ?(.*)',
    fromMe: true,
    desc: 'Unblock a user',
    type: 'user'
  }, async (message, match) => {
    if (message.quoted) {
      try {
        await message.client.updateBlockStatus(message.quoted.participant, "unblock");
        return await message.reply('User unblocked successfully.');
      } catch (error) {
        return await message.reply('Failed to unblock user.');
      }
    }
    const input = message.getUserInput();
    if (input) {
      const userToUnblock = input.includes('@') ? input : input + '@s.whatsapp.net';
      try {
        await message.client.updateBlockStatus(userToUnblock, "unblock");
        return await message.reply('User unblocked successfully.');
      } catch (error) {
        return await message.reply('Failed to unblock user.');
      }
    }
    if (message.jid.endsWith('@s.whatsapp.net')) {
      try {
        await message.client.updateBlockStatus(message.jid, "unblock");
        return await message.reply('User unblocked successfully.');
      } catch (error) {
        return await message.reply('Failed to unblock user.');
      }
    }

    return await message.reply('Please reply to a message, provide the number to unblock, or use in user chat.');
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
      const status = await message.client.fetchStatus(userJid).catch(() => ({ status: 'Not available' }));
      const bizProfile = await message.client.getBusinessProfile(userJid).catch(() => null);

      let userInfo = `*User Information*\n\n`;
      userInfo += `• Number: ${userJid.split('@')[0]}\n`;
      userInfo += `• Name: ${bizProfile?.name || 'Unknown'}\n`;
      userInfo += `• About: ${status.status || 'Not available'}\n`;

      if (bizProfile) {
        userInfo += `• Business Description: ${bizProfile.description || 'Not available'}\n`;
        userInfo += `• Category: ${bizProfile.category || 'Not available'}\n`;
        userInfo += `• Email: ${bizProfile.email || 'Not available'}\n`;
        userInfo += `• Website: ${bizProfile.website?.[0] || 'Not available'}\n`;
      }

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

  let autoRejectEnabled = process.env.AUTO_REJECT_ENABLED === 'true';

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
       updateConfig({ AUTO_REJECT_ENABLED: 'true' });
        await message.reply('Auto call reject has been *enabled*');
        break;

      case 'off':
        autoRejectEnabled = false;
        updateConfig({ AUTO_REJECT_ENABLED: 'false' });
        await message.reply('Auto call reject has been *disabled*');
        break;

      case 'status':
        await message.reply(
          '*Auto Call Reject Status*\n\n' +
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
        text: 'Auto reject is enabled. Voice and video calls are not accepted.'
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
const { MODE } = require('../config');

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


  Index({
      pattern: 'getsudo',
      fromMe: true,
      desc: 'List current sudo users',
      type: 'admin'
  }, async (message) => {
      try {
          const configPath = path.join(__dirname, '../config.env');
          const config = dotenv.parse(fs.readFileSync(configPath));
          const currentSudos = config.SUDO ? config.SUDO.split(',') : [];
          
          if (currentSudos.length === 0) {
              return await message.reply('No sudo users found');
          }
          
          await message.reply('*Current Sudo Users:*\n' + currentSudos.join('\n'));
      } catch (error) {
          await message.reply('Error: ' + error.message);
      }
  });

  Index({
      pattern: 'addsudo',
      fromMe: true,
      desc: 'Add a sudo user',
      type: 'admin'
  }, async (message) => {
      if (!message.quoted) return await message.reply('Reply to a user to add as sudo');
      
      try {
          const configPath = path.join(__dirname, '../config.env');
          const config = dotenv.parse(fs.readFileSync(configPath));
          const newNumber = message.quoted.participant.split('@')[0];
          
          if (!newNumber.match(/^\d+$/)) {
              return await message.reply('Invalid phone number');
          }

          const currentSudos = config.SUDO ? config.SUDO.split(',') : [];
          if (currentSudos.includes(newNumber)) {
              return await message.reply('Already a sudo user');
          }
          
          currentSudos.push(newNumber);
          config.SUDO = currentSudos.join(',');
          
          fs.writeFileSync(configPath, 
              Object.entries(config)
                  .map(([key, value]) => `${key}=${value}`)
                  .join('\n')
          );
          
          await message.reply(`Added ${newNumber} as sudo\nRestart bot to apply changes`);
      } catch (error) {
          await message.reply(' Error: ' + error.message);
      }
  });

  Index({
      pattern: 'delsudo',
      fromMe: true,
      desc: 'Remove a sudo user',
      type: 'admin'
  }, async (message) => {
      if (!message.quoted) return await message.reply('Reply to a sudo user to remove');
      
      try {
          const configPath = path.join(__dirname, '../config.env');
          const config = dotenv.parse(fs.readFileSync(configPath));
          const removeNumber = message.quoted.participant.split('@')[0];
          
          const currentSudos = config.SUDO ? config.SUDO.split(',') : [];
          if (!currentSudos.includes(removeNumber)) {
              return await message.reply('User is not a sudo');
          }
          
          config.SUDO = currentSudos.filter(num => num !== removeNumber).join(',');
          fs.writeFileSync(configPath,
              Object.entries(config)
                  .map(([key, value]) => `${key}=${value}`)
                  .join('\n')
          );
          
          await message.reply(`Removed ${removeNumber} from sudo\nRestart bot to apply changes`);
      } catch (error) {
          await message.reply('Error: ' + error.message);
      }
  });



  Index({
    pattern: 'dlvideo ?(.*)',
    fromMe: true,
    desc: 'Download and send video from URL',
    type: 'download'
  }, async (message) => {
    const url = message.getUserInput();
    if (!url) return await message.reply('Please provide a video URL');

    try {
        await message.reply('⬇️ Downloading video...');
        
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            onDownloadProgress: (progressEvent) => {
                const progress = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                if (progress % 25 === 0) {
                    message.reply(`Download: ${progress}%`);
                }
            }
        });

        const buffer = Buffer.from(response.data, 'binary');
        await message.reply('✅ Sending video...');
        
        await message.client.sendMessage(message.jid, {
            video: buffer,
            caption: '📥 Downloaded via bot',
            mimetype: response.headers['content-type']
        });

    } catch (error) {
        await message.reply('❌ Download failed: ' + error.message);
    }
  });

  Index({
    pattern: 'dlimage',
    fromMe: true,
    desc: 'Download and send image from URL',
    type: 'download'
  }, async (message) => {
    const url = message.getUserInput();
    if (!url) return await message.reply('Please provide an image URL');

    try {
        await message.reply('⬇️ Downloading image...');
        
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            onDownloadProgress: (progressEvent) => {
                const progress = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                if (progress % 25 === 0) {
                    message.reply(`Download: ${progress}%`);
                }
            }
        });

        const buffer = Buffer.from(response.data, 'binary');
        await message.client.sendMessage(message.jid, {
            image: buffer,
            caption: '📥 Downloaded via bot',
            mimetype: response.headers['content-type']
        });

    } catch (error) {
        await message.reply('❌ Download failed: ' + error.message);
    }
  });

  Index({
    pattern: 'dlaudio',
    fromMe: true,
    desc: 'Download and send audio from URL',
    type: 'download'
  }, async (message) => {
    const url = message.getUserInput();
    if (!url) return await message.reply('Please provide an audio URL');

    try {
        await message.reply('⬇️ Downloading audio...');
        
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            onDownloadProgress: (progressEvent) => {
                const progress = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                if (progress % 25 === 0) {
                    message.reply(`Download: ${progress}%`);
                }
            }
        });

        const buffer = Buffer.from(response.data, 'binary');
        await message.client.sendMessage(message.jid, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: false
        });

    } catch (error) {
        await message.reply('❌ Download failed: ' + error.message);
    }
  });


const autoResponders = new Map();
const responseCounts = new Map();
const cooldowns = new Map();

Index({
    pattern: 'autoreply',
    fromMe: true,
    desc: 'Configure auto response settings',
    type: 'user'
}, async (message, match) => {
    const args = message.text.split(' ')[1]?.toLowerCase();
    const input = message.text.split(' ').slice(2).join(' ');

    if (!args) {
        return await message.reply(
            '*🤖 Auto Responder Commands*\n\n' +
            '• .autoreply add <trigger>::<response>\n' +
            '• .autoreply remove <trigger>\n' +
            '• .autoreply list\n' +
            '• .autoreply on/off\n' +
            '• .autoreply limit <number>\n' +
            '• .autoreply reset\n' +
            '• .autoreply stats'
        );
    }

    switch (args) {
        case 'add':
            if (!input || !input.includes('::')) {
                return await message.reply('Format: .autoreply add trigger::response');
            }
            const [trigger, response] = input.split('::').map(x => x.trim());
            if (!trigger || !response) {
                return await message.reply('Invalid format! Use trigger::response');
            }

            autoResponders.set(trigger.toLowerCase(), {
                response,
                enabled: true,
                limit: 50,
                cooldown: 10,
                pattern: trigger.includes('*'),
                timestamp: Date.now()
            });
            await message.reply(`✅ Auto response added for: ${trigger}`);
            break;

        case 'remove':
            if (!input) return await message.reply('Specify trigger to remove');
            if (autoResponders.delete(input.toLowerCase())) {
                await message.reply(`✅ Removed auto response for: ${input}`);
            } else {
                await message.reply('❌ No such auto response exists');
            }
            break;

        case 'list':
            const responses = [...autoResponders.entries()]
                .map(([t, v]) => `• ${t} → ${v.response} (${v.enabled ? 'ON' : 'OFF'})`)
                .join('\n');
            await message.reply(responses || 'No auto responses configured');
            break;

        case 'on':
        case 'off':
            if (!input) {
                autoResponders.forEach(v => v.enabled = args === 'on');
                await message.reply(`✅ All auto responses turned ${args.toUpperCase()}`);
            } else {
                const responder = autoResponders.get(input.toLowerCase());
                if (responder) {
                    responder.enabled = args === 'on';
                    await message.reply(`✅ Auto response for "${input}" turned ${args.toUpperCase()}`);
                } else {
                    await message.reply('❌ No such auto response exists');
                }
            }
            break;

        case 'limit':
            if (!input || isNaN(input)) {
                return await message.reply('Specify valid number for limit');
            }
            const limit = parseInt(input);
            autoResponders.forEach(v => v.limit = limit);
            await message.reply(`✅ Response limit set to ${limit}`);
            break;

        case 'reset':
            responseCounts.clear();
            cooldowns.clear();
            await message.reply('✅ Response counters reset');
            break;

        case 'stats':
            const stats = [...autoResponders.entries()]
                .map(([t, v]) => {
                    const count = responseCounts.get(t) || 0;
                    return `• ${t}: ${count}/${v.limit} responses`;
                })
                .join('\n');
            await message.reply(stats || 'No stats available');
            break;
    }
});

Index({
    on: 'text',
    fromMe: false,
    dontAddCommandList: true
}, async (message) => {
    if (!message.text) return;
    const text = message.text.toLowerCase();

    for (const [trigger, config] of autoResponders.entries()) {
        if (!config.enabled) continue;

        const matches = config.pattern
            ? new RegExp(trigger.replace(/\*/g, '.*')).test(text)
            : text.includes(trigger);

        if (!matches) continue;

        const now = Date.now();
        const cooldownKey = `${trigger}-${message.sender}`;
        const lastUsed = cooldowns.get(cooldownKey) || 0;
        if (now - lastUsed < config.cooldown * 1000) continue;

        const count = responseCounts.get(trigger) || 0;
        if (count >= config.limit) continue;

        cooldowns.set(cooldownKey, now);
        responseCounts.set(trigger, count + 1);

        await message.reply(config.response);
        break;
    }
});


let alwaysOnline = process.env.ONLINE === 'true';

Index({
    pattern: 'alwaysonline ?(.*)',
    fromMe: true,
    desc: 'Set always online status',
    type: 'misc'
}, async (message, match) => {
    const cmd = message.getUserInput()?.toLowerCase();

    if (!cmd || !['on', 'off', 'status'].includes(cmd)) {
        return await message.reply(
            '*📱 Always Online Settings*\n\n' +
            'Commands:\n' +
            '├ .alwaysonline on - Enable always online\n' +
            '├ .alwaysonline off - Disable always online\n' +
            '└ .alwaysonline status - Check current setting\n\n' +
            'Current Status: ' + (alwaysOnline ? 'Enabled ✅' : 'Disabled ❌')
        );
    }

    switch (cmd) {
        case 'on':
            alwaysOnline = true;
            updateConfig({ ONLINE: 'true' });
            await message.reply('✅ Always online has been *enabled*');
            break;

        case 'off':
            alwaysOnline = false;
            updateConfig({ ONLINE: 'false' });
            await message.reply('❌ Always online has been *disabled*');
            break;

        case 'status':
            await message.reply(
                '*📱 Always Online Status*\n\n' +
                `Status: ${alwaysOnline ? 'Enabled ✅' : 'Disabled ❌'}`
            );
            break;
    }
});

// Index({
//   pattern: 'testctx',
//   fromMe: true,
//   desc: 'Test different contextInfo parameters',
//   type: 'misc'
// }, async (message, match) => {
//   try {
//       const mentionedJid = [message.sender];
      
//       // Test 1: Basic mention
//       await message.client.sendMessage(message.jid, {
//           text: 'Test 1: Basic Mention\n@user',
//           contextInfo: {
//               mentionedJid: mentionedJid
//           }
//       });

//       // Test 2: Quote with mention
//       await message.client.sendMessage(message.jid, {
//           text: 'Test 2: Quote with Mention\n@user',
//           contextInfo: {
//               mentionedJid: mentionedJid,
//               quotedMessage: {
//                   conversation: "This is a quoted message"
//               },
//               participant: message.sender,
//               remoteJid: message.jid
//           }
//       });

//       // Test 3: Forward message
//       await message.client.sendMessage(message.jid, {
//           text: 'Test 3: Forwarded Message',
//           contextInfo: {
//               isForwarded: true,
//               forwardingScore: 2,
//               participant: message.sender
//           }
//       });

//       // Test 4: Stanza ID
//       await message.client.sendMessage(message.jid, {
//           text: 'Test 4: Message with Stanza ID',
//           contextInfo: {
//               stanzaId: 'custom-stanza-id',
//               participant: message.sender,
//               quotedMessage: {
//                   conversation: "Testing stanza ID"
//               }
//           }
//       });

//       // Test 5: Various flags
//       await message.client.sendMessage(message.jid, {
//           text: 'Test 5: Various Flags',
//           contextInfo: {
//               isForwarded: true,
//               forwardingScore: 5,
//               mentionedJid: mentionedJid,
//               participant: message.sender,
//               quotedMessage: {
//                   conversation: "Multiple context parameters"
//               },
//               expiration: 86400,
//               ephemeralSettingTimestamp: Date.now(),
//               disappearingMode: {
//                   initiator: message.sender
//               }
//           }
//       });

//       await message.reply('✅ Context tests completed');
      
//   } catch (error) {
//       console.error('Context test error:', error);
//       await message.reply('❌ Error during context tests: ' + error.message);
//   }
// });




Index({
  pattern: 'settings ?(.*)',
  fromMe: true,
  desc: 'Configure bot settings',
  vpsOnly: true,
  type: 'owner'
}, async (message, match) => {
  const input = message.getUserInput()?.toLowerCase().trim();
  const [cmd, ...args] = input ? input.split(' ') : [];

  let settings = {
      PREFIX: process.env.HANDLERS || '^[/]',
      BOT_NAME: process.env.BOT_NAME || 'Axiom',
      MODE:process.env.MODE || 'public',
      LOG_MSG: process.env.LOG_MSG === 'true',
      AUTO_TYPE: process.env.AUTO_TYPE === 'true',
      RECORD: process.env.RECORD === 'true',
      READ_MSG: process.env.READ_MSG === 'true',
      READ_CMD: process.env.READ_CMD === 'true'
  };

  if (!cmd || cmd === 'status') {
      return await message.reply(
          '*⚙️ Bot Settings*\n\n' +
          'Prefix: ' + settings.PREFIX + '\n' +
          'Bot Name: ' + settings.BOT_NAME + '\n' +
          'Mode: ' + settings.MODE + '\n' +
          'Log Messages: ' + (settings.LOG_MSG ? '✅' : '❌') + '\n' +
          'Auto Typing: ' + (settings.AUTO_TYPE ? '✅' : '❌') + '\n' +
          'Auto Recording: ' + (settings.RECORD ? '✅' : '❌') + '\n' +
          'Read Messages: ' + (settings.READ_MSG ? '✅' : '❌') + '\n' +
          'Read Commands: ' + (settings.READ_CMD ? '✅' : '❌') + '\n\n' +
          '*Commands:*\n' +
          '• .settings prefix <newprefix>\n' +
          '• .settings botname <newname>\n' +
          '• .settings mode <public/private>\n' +
          '• .settings logmsg on/off\n' +
          '• .settings autotype on/off\n' +
          '• .settings record on/off\n' +
          '• .settings readmsg on/off\n' +
          '• .settings readcmd on/off'
      );
  }

  switch (cmd) {
      case 'prefix':
          const newPrefix = args[0];
          if (!newPrefix) return await message.reply('Please provide a new prefix');
          updateConfig({ HANDLERS: newPrefix });
          await message.reply(`✅ Prefix updated to: ${newPrefix}`);
          break;

      case 'botname':
          const newName = args.join(' ');
          if (!newName) return await message.reply('Please provide a new bot name');
          updateConfig({ BOT_NAME: newName });
          await message.reply(`✅ Bot name updated to: ${newName}`);
          break;

      case 'mode':
          const newMode = args[0];
          if (!newMode) return await message.reply('Please provide a new mode');
          updateConfig({ MODE: newMode });
          await message.reply(`✅ Mode updated to: ${newMode}`);
          break;

      case 'logmsg':
          if (!args[0] || !['on', 'off'].includes(args[0])) {
              return await message.reply('Please specify on or off');
          }
          updateConfig({ LOG_MSG: args[0] === 'on' ? 'true' : 'false' });
          await message.reply(`✅ Log messages ${args[0] === 'on' ? 'enabled' : 'disabled'}`);
          break;

      case 'autotype':
          if (!args[0] || !['on', 'off'].includes(args[0])) {
              return await message.reply('Please specify on or off');
          }
          updateConfig({ AUTO_TYPE: args[0] === 'on' ? 'true' : 'false' });
          await message.reply(`✅ Auto typing ${args[0] === 'on' ? 'enabled' : 'disabled'}`);
          break;

      case 'record':
          if (!args[0] || !['on', 'off'].includes(args[0])) {
              return await message.reply('Please specify on or off');
          }
          updateConfig({ RECORD: args[0] === 'on' ? 'true' : 'false' });
          await message.reply(`✅ Auto recording ${args[0] === 'on' ? 'enabled' : 'disabled'}`);
          break;

      case 'readmsg':
          if (!args[0] || !['on', 'off'].includes(args[0])) {
              return await message.reply('Please specify on or off');
          }
          updateConfig({ READ_MSG: args[0] === 'on' ? 'true' : 'false' });
          await message.reply(`✅ Read messages ${args[0] === 'on' ? 'enabled' : 'disabled'}`);
          break;

      case 'readcmd':
          if (!args[0] || !['on', 'off'].includes(args[0])) {
              return await message.reply('Please specify on or off');
          }
          updateConfig({ READ_CMD: args[0] === 'on' ? 'true' : 'false' });
          await message.reply(`✅ Read commands ${args[0] === 'on' ? 'enabled' : 'disabled'}`);
          break;

      default:
          await message.reply('Invalid command. Use .settings to see available options.');
  }
});

  module.exports = {
    handleIncomingCall
  };