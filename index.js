const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  delay,
  makeCacheableSignalKeyStore,
  generateWAMessageFromContent,
  getContentType
} = require('@whiskeysockets/baileys');
const { handleAutoReact } = require('./plugins/emoji');
const { handleAntispam } = require('./plugins/group');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const express = require("express");
const NodeCache = require("node-cache");
const app = express();
const config = require('./config');
const { Message, commands, numToJid, PREFIX } = require('./lib/index');
const axios = require('axios');
const { sequelize, UserSession, checkDatabaseConnection } = require('./database');
const { handleIncomingCall } = require('./plugins/user');
const { handleStatus } = require('./plugins/status');
const { handleGroupMessage } = require('./plugins/activity');

const port = 3000;

const messageStore = new Map();
global.antideleteEnabled = config.ANTIDELETE_ENABLED;

function cleanupOldMessages() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, msg] of messageStore.entries()) {
    if (msg.messageTimestamp * 1000 < oneHourAgo) {
      messageStore.delete(id);
    }
  }
}

setInterval(cleanupOldMessages, 30 * 60 * 1000);

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Bot Status</title>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
          }
          .container {
            text-align: center;
          }
          .loading {
            font-size: 24px;
            margin-bottom: 20px;
          }
          .loader {
            border: 16px solid #f3f3f3;
            border-radius: 50%;
            border-top: 16px solid #3498db;
            width: 120px;
            height: 120px;
            animation: spin 2s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="loading">Bot is up and running!</div>
          <div class="loader"></div>
        </div>
      </body>
    </html>
  `);
});



function cleanAuthFolder() {
  const authPath = path.join(__dirname, 'auth');
  fs.readdir(authPath, (err, files) => {
    if (err) {
      console.error('Error reading auth directory:', err);
      return;
    }
    files.forEach(file => {
      if (file !== 'creds.json') {
        fs.unlink(path.join(authPath, file), err => {
          if (err) {
            console.error(`Error deleting file ${file}:`, err);
          } else {
            console.log(`Deleted file: ${file}`);
          }
        });
      }
    });
  });
}

function decodeSessionId(encodedSessionId) {
  return Buffer.from(encodedSessionId, 'base64').toString('utf-8');
}

function saveDecodedSession(decodedSession) {
  const authPath = path.join(__dirname, 'auth');
  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
  }
  fs.writeFileSync(path.join(authPath, 'creds.json'), decodedSession);
}

function handleSessionDecoding() {
  if (config.SESSION_ID) {
    try {
      const decodedSession = decodeSessionId(config.SESSION_ID);
      saveDecodedSession(decodedSession);
      console.log('Session successfully decoded and saved.');
    } catch (error) {
      console.error('Error decoding session:', error);
    }
  } else {
    console.log('No SESSION_ID found in config.js');
  }
}


(async () => {
  await checkDatabaseConnection();


  handleSessionDecoding();

  const saveUserSession = async (jid, sessionData) => {
    try {
      await UserSession.upsert({ jid, sessionData });
    } catch (error) {
      console.error('Error saving user session:', error);
    }
  };

  const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const msgRetryCounterCache = new NodeCache();
    const { version, isLatest } = await fetchLatestBaileysVersion();
    const logger = pino({ level: 'silent' });

    const client = makeWASocket({
      logger,
      printQRInTerminal: true,
      downloadHistory: false,
      syncFullHistory: false,
      browser: Browsers.macOS('Desktop'),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      msgRetryCounterCache,
      version,
      getMessage: async (key) =>
        (loadMessage(key.id) || {}).message || { conversation: null },
    });


    fs.readdirSync('./plugins').forEach(plugin => {
      if (path.extname(plugin).toLowerCase() == '.js') {
        require('./plugins/' + plugin);
      }
    });

    client.ev.on('connection.update', async (node) => {
      const { connection, lastDisconnect } = node;
      if (connection == 'open') {
        console.log("Connecting to Whatsapp...");
        console.log('connected');
        await delay(5000);
        const sudo = numToJid(config.SUDO.split(',')[0]) || client.user.id;
        await client.sendMessage(sudo, { 
          text: '*BOT CONNECTED SUCCESSFULLY*\n\n' +
          '```' +
          '╭─❏ BOT INFO ❏\n' +
          '│ PREFIX : ' + PREFIX + '\n' +
          '│ PLUGINS : ' + commands.filter(command => command.pattern).length + '\n' +
          '│ VERSION : ' + require('./package.json').version + '\n' +
          '│ PLATFORM : ' + process.platform + '\n' +
          '│ MEMORY : ' + (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + 'MB\n' +
          '│ UPTIME : ' + Math.floor(process.uptime()) + ' seconds\n' +
          '│ NODE : ' + process.version + '\n' +
          '╰────────────❏\n' +
          '```'
        });
      }
      if (connection === 'close') {
        if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
          await delay(300);
          connectToWhatsApp();
          console.log('reconnecting...');
          console.log(node);
        } else {
          console.log('connection closed');
          console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ')
          await delay(3000);
          process.exit(0);
        }
      }
    });
    

    client.ev.on('creds.update', async (creds) => {
      await saveUserSession(client.user.id, creds);
    });

    const { WelcomeSetting } = require('./database');

    client.ev.on('group-participants.update', async (notification) => {
      if (notification.action === 'add') {
        const groupId = notification.id;
        const newMember = notification.participants[0];

        try {
          const welcomeSetting = await WelcomeSetting.findOne({ where: { groupId } });
          if (welcomeSetting && welcomeSetting.isEnabled) {
            const groupMetadata = await client.groupMetadata(groupId);
            const groupName = groupMetadata.subject;
            const groupDesc = groupMetadata.desc || '';
            const memberCount = groupMetadata.participants.length;

            let welcomeMessage = welcomeSetting.welcomeMessage || `Welcome to the group, @${newMember.split('@')[0]}!`;
            welcomeMessage = welcomeMessage
              .replace('{mention}', `@${newMember.split('@')[0]}`)
              .replace('{group}', groupName)
              .replace('{desc}', groupDesc)
              .replace('{count}', memberCount.toString());

            await client.sendMessage(groupId, { text: welcomeMessage, mentions: [newMember] });
          }
        } catch (error) {
          console.error('Error fetching or sending welcome message:', error);
        }
      }
    });
    
    client.ev.on('messages.upsert', async (upsert) => {
      if (upsert.type !== 'notify') return;
      
      for (const msg of upsert.messages) {
        if (!msg.message) continue;
        const message = new Message(client, msg);
        const messageType = getContentType(msg.message);

        // Handle status broadcast messages
        if (msg.key && msg.key.remoteJid === 'status@broadcast') {
          await handleStatus(msg, client);
          continue; // Skip further processing for status messages
        }

        // Handle group activity tracking
        if (msg.message && msg.key.remoteJid.endsWith('@g.us')) {
          await handleGroupMessage({
            isGroup: true,
            jid: msg.key.remoteJid,
            sender: msg.key.participant || msg.key.remoteJid
          });
        }

        // Auto type/record/online presence updates
        if (config.AUTOTYPE == true) {
          await client.sendPresenceUpdate('composing', message.jid);
          await delay(3000);
          await client.sendPresenceUpdate('paused', message.jid);
        }

        if (config.RECORD == true) {
          await client.sendPresenceUpdate('recording', message.jid);
          await delay(1000);
          await client.sendPresenceUpdate('paused', message.jid);
        }

        if (config.ONLINE == true) {
          await client.sendPresenceUpdate('available', message.jid);
        }

        // Message store handling
        if (messageType !== 'protocolMessage') {
          messageStore.set(msg.key.id, msg);
        }

        // Anti-delete handling
        if (global.antideleteEnabled && messageType === 'protocolMessage' && msg.message.protocolMessage.type === 0) {
          const chatJid = msg.key.remoteJid;
          const deletedMessageId = msg.message.protocolMessage.key.id;
          // console.log(`Deleted message ID: ${deletedMessageId}`);

          const deletedMessage = messageStore.get(deletedMessageId);
          if (deletedMessage) {
            // console.log('Loaded deleted message:', deletedMessage);
            const deletedMessageType = getContentType(deletedMessage.message);
            const sender = deletedMessage.key.fromMe ? client.user.id.split('@')[0] : (deletedMessage.key.participant || chatJid).split('@')[0];
            

            let groupName = '';
            if (message.isGroup) {
              try {
                const groupMetadata = await client.groupMetadata(message.jid);
                groupName = groupMetadata.subject;
              } catch (error) {
                console.error('Error fetching group metadata:', error);
                groupName = 'Unknown group';
              }
            }

            let infoText = `Deleted Message Detected\n\n` +
              `Sender: ${sender}\n` +
              `Deleted at: ${new Date().toLocaleString()}\n` +
              `Group: ${groupName || 'Not A Group'}\n` +
              `Message Type: ${deletedMessageType}\n\n`;

            if (deletedMessageType === 'conversation' || deletedMessageType === 'extendedTextMessage') {
              infoText += `Content: ${deletedMessage.message[deletedMessageType].text || ''}`;
            } else {
              infoText += `Content: Media message (${deletedMessageType})`;
            }

            let destinationJid;
            switch (config.ANTIDELETE_DESTINATION) {
              case 'chat':
                destinationJid = chatJid;
                break;
              case 'sudo':
                destinationJid = numToJid(config.SUDO.split(',')[0]) || client.user.id;
                break;
              default:
                destinationJid = config.ANTIDELETE_DESTINATION;
            }

            await client.sendMessage(destinationJid, { text: infoText });
            const m = generateWAMessageFromContent(destinationJid, deletedMessage.message, {
              userJid: client.user.id,
            });
            await client.relayMessage(destinationJid, m.message, { messageId: m.key.id });
            console.log('Relayed deleted message:', m);
          } else {
            console.log('Deleted message not found in the message store');
          }
        }

        // Handle auto react and antispam
        await handleAutoReact(message);
        await handleAntispam(message);

        const warns = new Map();

        // Anti-badword handler
        const containsBadWord = (text) => {
          // const config = readConfig();
          return config.ANTIBADWORD.badwords.some(word => text.toLowerCase().includes(word.toLowerCase()));
        };

        const warnUser = (jid) => {
          const current = warns.get(jid) || 0;
          warns.set(jid, current + 1);
          return current + 1;
        };

        if (config.ANTIBADWORD.enabled && message.isGroup && !message.fromMe && containsBadWord(message.text)) {
          // const config = readConfig();
          switch (config.ANTIBADWORD.action) {
            case 'warn':
              const warnCount = warnUser(message.sender);
              await message.reply(`⚠️ Warning: Bad word detected. Warning ${warnCount}/${config.ANTIBADWORD.warnLimit}`);
              if (warnCount >= config.ANTIBADWORD.warnLimit) {
                await client.groupParticipantsUpdate(message.jid, [message.sender], 'remove');
                warns.delete(message.sender);
                await message.reply(`User kicked for exceeding warn limit.`);
              }
            // Fall through to delete the message
            case 'delete':
              await message.delete();
              break;
            case 'kick':
              await client.groupParticipantsUpdate(message.jid, [message.sender], 'remove');
              await message.reply(`User kicked for using a bad word.`);
              break;
          }
        }


        if (config.LOG_MSG && !message.data.key.fromMe) {
          let groupName = '';
          if (message.isGroup) {
            try {
              const groupMetadata = await client.groupMetadata(message.jid);
              groupName = groupMetadata.subject;
            } catch (error) {
              console.error('Error fetching group metadata:', error);
              groupName = 'Unknown group';
            }
          }

          console.log(`
----------------------------------------------------
[MESSAGE] Sender: ${message.pushName || message.sender.split('@')[0]} (${message.sender}) 
Message ID: ${message.data.key.id} 
Timestamp: ${new Date(message.data.messageTimestamp * 1000).toLocaleString()} 
Type: ${message.type || 'Unknown'} 
Group: ${groupName || 'Private'} 
Content: ${message.text || message.type || 'No content'}`);
        }

        if (config.READ_MSG == true && message.data.key.remoteJid !== 'status@broadcast') {
          await client.readMessages([message.data.key]);
        }

        // Command handler
        commands.map(async (command) => {
          const messageType = {
            image: 'imageMessage',
            sticker: 'stickerMessage',
            audio: 'audioMessage',
            video: 'videoMessage',
          };

          const isMatch =
            (command.on && messageType[command.on] && message.msg && message.msg[messageType[command.on]] !== null) ||
            (!command.pattern || command.pattern.test(message.text)) ||
            (command.on === 'text' && message.text) ||
            (command.on && !messageType[command.on] && !message.msg[command.on]);

          const isPrivateMode = config.MODE === 'private';
          const isSudoUser = config.SUDO.split(',').map(numToJid).includes(message.sender);

          if (isPrivateMode && !isSudoUser) {
            return;
          }

          if (isMatch) {
            if (command.pattern && config.READ_CMD == true) {
              await client.readMessages([message.data.key]);
            }
            const match = message.text?.match(command.pattern) || '';


            try {
              await command.function(message, match.length === 6 ? (match[3] ?? match[4]) : (match[2] ?? match[3]), client);
            } catch (e) {
              if (config.ERROR_MSG) {
                console.log(e);
                const sudo = numToJid(config.SUDO.split(',')[0]) || client.user.id;
                await client.sendMessage(sudo, { text: '```─━❲ ERROR REPORT ❳━─\n\nMessage : ' + message.text + '\nError : ' + e.message + '\nJid : ' + message.jid + '```' }, { quoted: message.data });
              }
            }
          }
        });
      }
    });

    client.ev.on('call', async (call) => {
        for (let c of call) {
            if (c.status === 'offer') {
                await handleIncomingCall(c, client);
            }
        }
    });

    return client;
  };

  connectToWhatsApp();
  cleanAuthFolder();

  app.listen(port, () => console.log(`Server listening on port http://localhost:${port}!`));
})();

module.exports = {
  toggleAntidelete: (value) => {
    global.antideleteEnabled = value;
  },
  setAntideleteDestination: (destination) => {
    config.ANTIDELETE_DESTINATION = destination;
  }
};