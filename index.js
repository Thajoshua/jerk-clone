const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  delay,
  makeCacheableSignalKeyStore,
  generateWAMessageFromContent,
  getContentType,
} = require("@whiskeysockets/baileys");
const { handleAutoReact } = require("./plugins/emoji");
const { handleAntispam, promoListeners } = require("./plugins/group");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const express = require("express");
const NodeCache = require("node-cache");
const config = require("./config");
const { Message, commands, numToJid, PREFIX } = require("./lib/index");
const {
  UserSession,
  checkDatabaseConnection,
  WelcomeSetting,
  sequelize,
} = require("./database/database");
const { handleIncomingCall, mj, system } = require("./plugins/user");
const { handleStatus } = require("./plugins/status");
const { checkForUpdates } = require("./plugins/_update");
const { MakeSession } = require("./lib/session");
const authCleanup = require("./lib/auth-cleanup");
const { log } = require("console");
const { AutoReplyCooldown, AutoReply } = require("./database/Reply");
const { Sequelize } = require("sequelize");

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

const processedSessionId = config.SESSION_ID.replace(/^Axiom_/, "");

if (!fs.existsSync("./auth/creds.json")) {
  MakeSession(processedSessionId, "./auth/creds.json").then(
  console.log("Session Created")
  );
}

async function initializeDatabaseAndPlugins() {
  try {
    // await sequelize.sync();
    // console.log("✓ Database synchronized");

    const pluginFolder = path.join(__dirname, "plugins");
    const files = fs.readdirSync(pluginFolder);

    console.log("⬇ Installing Plugins...");

    files.forEach((plugin) => {
      if (path.extname(plugin).toLowerCase() === ".js") {
        require("./plugins/" + plugin);
        console.log("✓ " + plugin + " Installed");
      }
    });
    console.log("✓ Plugins loaded successfully");
  } catch (error) {
    console.error("Failed to initialize:", error);
    process.exit(1);
  }
}

(async () => {
  await checkDatabaseConnection();

  const saveUserSession = async (jid, sessionData) => {
    try {
      await UserSession.upsert({ jid, sessionData });
    } catch (error) {
      console.error("Error saving user session:", error);
    }
  };

  const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const msgRetryCounterCache = new NodeCache();
    const { version, isLatest } = await fetchLatestBaileysVersion();
    const logger = pino({ level: "silent" });

    const client = makeWASocket({
      logger,
      printQRInTerminal: false,
      downloadHistory: false,
      syncFullHistory: false,
      browser: Browsers.macOS("Desktop"),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      msgRetryCounterCache,
      version,
      getMessage: async (key) =>
        (loadMessage(key.id) || {}).message || { conversation: null },
    });

    authCleanup.start(client);
    await initializeDatabaseAndPlugins();

    client.ev.on("connection.update", async (node) => {
      const { connection, lastDisconnect } = node;
      if (connection == "open") {
        console.log("Connecting to Whatsapp...");
        console.log("connected");
        await delay(5000);
        const sudo = numToJid(config.SUDO.split(",")[0]) || client.user.id;

        let updateStatus;
        try {
          updateStatus = await checkForUpdates();
        } catch (error) {
          console.log("Update check failed:", error);
        }

        let updateInfo = "";
        if (updateStatus?.hasUpdates) {
          updateInfo = "\n\n" + updateStatus.updateText;
        }

        await client.sendMessage(sudo, {
          text:
            "*AXIOM CONNECTED*\n\n" +
            "```" +
            "╭─❏ BOT INFO ❏\n" +
            "│ PREFIX : " +
            PREFIX +
            "\n" +
            "│ PLUGINS : " +
            commands.filter((command) => command.pattern).length +
            "\n" +
            "│ VERSION : " +
            require("./package.json").version +
            "\n" +
            "│ PLATFORM : " +
            process.platform +
            "\n" +
            "│ MODE : " +
            config.MODE +
            "\n" +
            "│ MEMORY : " +
            (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) +
            "MB\n" +
            "│ UPTIME : " +
            Math.floor(process.uptime()) +
            " seconds\n" +
            "│ NODE : " +
            process.version +
            "\n" +
            "╰────────────❏\n" +
            "```" +
            updateInfo,
        });
      }
      if (connection === "close") {
        if (
          lastDisconnect.error?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
          await delay(300);
          connectToWhatsApp();
          console.log("reconnecting...");
          console.log(node);
        } else {
          console.log("connection closed");
          console.log(
            "connection closed due to ",
            lastDisconnect.error,
            ", reconnecting "
          );
          await delay(3000);
          process.exit(0);
        }
      }
    });

    client.ev.on("creds.update", async (creds) => {
      await saveUserSession(client.user.id, creds);
    });

    client.ev.on("group-participants.update", async (notification) => {
      if (notification.action === "add") {
        const groupId = notification.id;
        const newMember = notification.participants[0];

        try {
          const welcomeSetting = await WelcomeSetting.findOne({
            where: { groupId },
          });
          if (welcomeSetting && welcomeSetting.isEnabled) {
            const groupMetadata = await client.groupMetadata(groupId);
            const groupName = groupMetadata.subject;
            const groupDesc = groupMetadata.desc || "";
            const memberCount = groupMetadata.participants.length;

            let welcomeMessage =
              welcomeSetting.welcomeMessage ||
              `Welcome to the group, @${newMember.split("@")[0]}!`;
            welcomeMessage = welcomeMessage
              .replace("{mention}", `@${newMember.split("@")[0]}`)
              .replace("{group}", groupName)
              .replace("{desc}", groupDesc)
              .replace("{count}", memberCount.toString());

            await client.sendMessage(groupId, {
              text: welcomeMessage,
              mentions: [newMember],
            });
          }
        } catch (error) {
          console.error("Error fetching or sending welcome message:", error);
        }
      }

      try {
        if (promoListeners.has(notification.id)) {
          if (
            notification.action === "promote" ||
            notification.action === "demote"
          ) {
            const participant = notification.participants[0];
            const userName = participant.split("@")[0];

            const text =
              notification.action === "promote"
                ? `@${userName} has been promoted to admin`
                : `@${userName} has been demoted`;

            await client.sendMessage(notification.id, {
              text,
              mentions: [participant],
            });
          }
        }
      } catch (error) {
        console.error("Error in promotion watcher:", error);
      }
    });

    client.ev.on("messages.upsert", async (upsert) => {
      if (upsert.type !== "notify") return;

      for (const msg of upsert.messages) {
        if (!msg.message) continue;
        const message = new Message(client, msg);
        const messageType = getContentType(msg.message);

        // try {
        //   let messageText = "";
        //   if (messageType === "conversation") {
        //     messageText = msg.message.conversation;
        //   } else if (messageType === "extendedTextMessage") {
        //     messageText = msg.message.extendedTextMessage.text;
        //   } else {
        //     continue;
        //   }

        //   if (message.isGroup === true ) continue;
        //   if (msg.key.fromMe || !msg.message?.conversation) continue;

        //   messageText = messageText.toLowerCase();
        //   const currentTime = new Date();

        //   const replies = await AutoReply.findAll({
        //     where: { isEnabled: true },
        //   });

        //   for (const reply of replies) {
        //     if (messageText.includes(reply.trigger)) {
        //       const cooldown = await AutoReplyCooldown.findOne({
        //         where: {
        //           userId: message.sender,
        //           replyId: reply.id,
        //           expiresAt: {
        //             [Sequelize.Op.gt]: currentTime,
        //           },
        //         },
        //       });

        //       if (cooldown) {
        //         continue;
        //       }

        //       await reply.update({
        //         uses: reply.uses + 1,
        //         lastUsed: currentTime,
        //       });

        //       await AutoReplyCooldown.create({
        //         userId: message.sender,
        //         replyId: reply.id,
        //         expiresAt: new Date(currentTime.getTime() + reply.cooldown),
        //       });

        //       await client.readMessages([message.data.key]);
        //       await message.reply(reply.response);
        //       break;
        //     }
        //   }
        // } catch (error) {
        //   console.error("Error in auto reply handler:", error);
        // }

        try {
          let messageText = "";
          if (messageType === "conversation") {
            messageText = msg.message.conversation;
          } else if (messageType === "extendedTextMessage") {
            messageText = msg.message.extendedTextMessage.text;
          } else {
            continue;
          }

          messageText = messageText.toLowerCase();
          const currentTime = new Date();

          const replies = await AutoReply.findAll({
            where: { isEnabled: true },
          });

          for (const reply of replies) {
            if (messageText.includes(reply.trigger)) {
              const cooldown = await AutoReplyCooldown.findOne({
                where: {
                  userId: message.sender,
                  replyId: reply.id,
                  expiresAt: {
                    [Sequelize.Op.gt]: currentTime,
                  },
                },
              });

              if (cooldown) {
                continue; 
              }

              if(msg.key.fromMe || !msg.message?.conversation){
                continue;
              }

              if (message.isGroup === true){
                continue;
              }

              await reply.update({
                uses: reply.uses + 1,
                lastUsed: currentTime,
              });

              await AutoReplyCooldown.upsert({
                userId: message.sender,
                replyId: reply.id,
                expiresAt: new Date(currentTime.getTime() + reply.cooldown),
              });

              await client.readMessages([message.data.key]);
              await message.reply(reply.response);
              break;
            }
          }
        } catch (error) {
          console.error("Error in auto reply handler:", error);
        }

        if (msg.key && msg.key.remoteJid === "status@broadcast") {
          await handleStatus(msg, client);
          continue;
        }
        if (config.AUTOTYPE == true) {
          await client.sendPresenceUpdate("composing", message.jid);
          await delay(3000);
          await client.sendPresenceUpdate("paused", message.jid);
        }

        if (config.RECORD == true) {
          await client.sendPresenceUpdate("recording", message.jid);
          await delay(1000);
          await client.sendPresenceUpdate("paused", message.jid);
        }

        if (config.ONLINE == true) {
          await client.sendPresenceUpdate("available", message.jid);
        }

        if (messageType !== "protocolMessage") {
          messageStore.set(msg.key.id, msg);
        }

        if (
          global.antideleteEnabled &&
          messageType === "protocolMessage" &&
          msg.message.protocolMessage.type === 0
        ) {
          const chatJid = msg.key.remoteJid;
          const deletedMessageId = msg.message.protocolMessage.key.id;
          // console.log(`Deleted message ID: ${deletedMessageId}`);

          const deletedMessage = messageStore.get(deletedMessageId);
          if (deletedMessage) {
            // console.log('Loaded deleted message:', deletedMessage);
            const deletedMessageType = getContentType(deletedMessage.message);
            const sender = deletedMessage.key.fromMe
              ? client.user.id.split("@")[0]
              : (deletedMessage.key.participant || chatJid).split("@")[0];

            let groupName = "";
            if (message.isGroup) {
              try {
                const groupMetadata = await client.groupMetadata(message.jid);
                groupName = groupMetadata.subject;
              } catch (error) {
                console.error("Error fetching group metadata:", error);
                groupName = "Unknown group";
              }
            }

            let infoText =
              `Deleted Message Detected\n\n` +
              `Sender: ${sender}\n` +
              `Deleted at: ${new Date().toLocaleString()}\n` +
              `Group: ${groupName || "Not A Group"}\n` +
              `Message Type: ${deletedMessageType}\n\n`;

            if (
              deletedMessageType === "conversation" ||
              deletedMessageType === "extendedTextMessage"
            ) {
              infoText += `Content: ${
                deletedMessage.message[deletedMessageType].text || ""
              }`;
            } else {
              infoText += `Content: Media message (${deletedMessageType})`;
            }

            let destinationJid;
            switch (config.ANTIDELETE_DESTINATION) {
              case "chat":
                destinationJid = chatJid;
                break;
              case "sudo":
                destinationJid =
                  numToJid(config.SUDO.split(",")[0]) || client.user.id;
                break;
              default:
                destinationJid = config.ANTIDELETE_DESTINATION;
            }

            await client.sendMessage(destinationJid, { text: infoText });
            const m = generateWAMessageFromContent(
              destinationJid,
              deletedMessage.message,
              {
                userJid: client.user.id,
              }
            );
            await client.relayMessage(destinationJid, m.message, {
              messageId: m.key.id,
            });
            console.log("Relayed deleted message:", m);
          } else {
            console.log("Deleted message not found in the message store");
          }
        }

        // Handle auto react and antispam
        await handleAutoReact(message);
        await handleAntispam(message);

        const warns = new Map();

        // Anti-badword handler
        const containsBadWord = (text) => {
          // const config = readConfig();
          return config.ANTIBADWORD.badwords.some((word) =>
            text.toLowerCase().includes(word.toLowerCase())
          );
        };

        const warnUser = (jid) => {
          const current = warns.get(jid) || 0;
          warns.set(jid, current + 1);
          return current + 1;
        };

        if (
          config.ANTIBADWORD.enabled &&
          message.isGroup &&
          !message.fromMe &&
          containsBadWord(message.text)
        ) {
          // const config = readConfig();
          switch (config.ANTIBADWORD.action) {
            case "warn":
              const warnCount = warnUser(message.sender);
              await message.reply(
                `⚠️ Warning: Bad word detected. Warning ${warnCount}/${config.ANTIBADWORD.warnLimit}`
              );
              if (warnCount >= config.ANTIBADWORD.warnLimit) {
                await client.groupParticipantsUpdate(
                  message.jid,
                  [message.sender],
                  "remove"
                );
                warns.delete(message.sender);
                await message.reply(`User kicked for exceeding warn limit.`);
              }
            // Fall through to delete the message
            case "delete":
              await message.delete();
              break;
            case "kick":
              await client.groupParticipantsUpdate(
                message.jid,
                [message.sender],
                "remove"
              );
              await message.reply(`User kicked for using a bad word.`);
              break;
          }
        }

        if (config.LOG_MSG && !message.data.key.fromMe) {
          let groupName = "";
          if (message.isGroup) {
            try {
              const groupMetadata = await client.groupMetadata(message.jid);
              groupName = groupMetadata.subject;
            } catch (error) {
              console.error("Error fetching group metadata:", error);
              groupName = "Unknown group";
            }
          }

          console.log(`
----------------------------------------------------
[MESSAGE] Sender: ${message.pushName || message.sender.split("@")[0]} (${
            message.sender
          }) 
Message ID: ${message.data.key.id} 
Timestamp: ${new Date(message.data.messageTimestamp * 1000).toLocaleString()} 
Type: ${message.type || "Unknown"} 
Group: ${groupName || "Private"} 
Content: ${message.text || message.type || "No content"}`);
        }

        if (
          config.READ_MSG == true &&
          message.data.key.remoteJid !== "status@broadcast"
        ) {
          await client.readMessages([message.data.key]);
        }

        // Command handler
        commands.map(async (command) => {
          const messageType = {
            image: "imageMessage",
            sticker: "stickerMessage",
            audio: "audioMessage",
            video: "videoMessage",
          };

          // const isMatch =
          //   (command.on && messageType[command.on] && message.msg && message.msg[messageType[command.on]] !== null) ||
          //   (!command.pattern || command.pattern.test(message.text)) ||
          //   (command.on === 'text' && message.text) ||
          //   (command.on && !messageType[command.on] && !message.msg[command.on]);

          const isMatch =
            (command.on &&
              messageType[command.on] &&
              message.msg &&
              message.msg[messageType[command.on]] !== null) ||
            !command.pattern ||
            (command.pattern.test(message.text) &&
              message.text.toLowerCase().split(/\s+/)[0] ===
                (
                  PREFIX + command.pattern.source.split(/\W+/)[1]
                ).toLowerCase()) ||
            (command.on === "text" && message.text) ||
            (command.on &&
              !messageType[command.on] &&
              !message.msg[command.on]);

          const isPrivateMode = config.MODE === "private";
          const isSudoUser = config.SUDO.split(",")
            .map(numToJid)
            .includes(message.sender);

          if (isPrivateMode && !isSudoUser) {
            return;
          }

          if (isMatch) {
            if (command.pattern && config.READ_CMD == true) {
              await client.readMessages([message.data.key]);
            }
            const match = message.text?.match(command.pattern) || "";

            try {
              await command.function(
                message,
                match.length === 6
                  ? match[3] ?? match[4]
                  : match[2] ?? match[3],
                client
              );
            } catch (e) {
              if (config.ERROR_MSG) {
                console.log(e);
                const sudo =
                  numToJid(config.SUDO.split(",")[0]) || client.user.id;
                await client.sendMessage(
                  sudo,
                  {
                    text:
                      "```─━❲ ERROR REPORT ❳━─\n\nMessage : " +
                      message.text +
                      "\nError : " +
                      e.message +
                      "\nJid : " +
                      message.jid +
                      "```",
                  },
                  { quoted: message.data }
                );
              }
            }
          }
        });
      }
    });

    client.ev.on("call", async (call) => {
      for (let c of call) {
        if (c.status === "offer") {
          await handleIncomingCall(c, client);
        }
      }
    });

    return client;
  };

  connectToWhatsApp();
})();

module.exports = {
  toggleAntidelete: (value) => {
    global.antideleteEnabled = value;
  },
  setAntideleteDestination: (destination) => {
    config.ANTIDELETE_DESTINATION = destination;
  },
};
