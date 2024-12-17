const util = require("util");
const { exec } = require('child_process');
const { Index, mode} = require('../lib/');

const CREATOR_NUMBERS = [
    "2348142304526",
    '2347039570336',
    '27828418477'
];

function isCreator(message) {
  const senderInfo = message.sender || message.participant || (message.key && message.key.remoteJid);
  
  if (!senderInfo) {
    console.log("Sender information not found in message:", message);
    return false;
  }

  return CREATOR_NUMBERS.some(num => String(senderInfo).includes(num));
}

function safeEval(message, evalFunc) {
  if (message && message.text && isCreator(message)) {
    return evalFunc();
  }
  return false;
}

Index(
  { on: "text", fromMe: true, desc: "Run js code (eval)", type: "misc", dontAddCommandList: true },
  async (message, match, m, client, msg) => {
    safeEval(message, async () => {
      if (message.text.startsWith(">")) {
        const conn = message.client;
        const json = (x) => JSON.stringify(x, null, 2);
        const client = conn;
        try {
          let evaled = await eval(`${message.text.replace(">", "")}`);
          if (typeof evaled !== "string")
            evaled = require("util").inspect(evaled);
          await message.reply(evaled);
        } catch (err) {
          await message.reply(util.format(err));
        }
      }
    });
  }
);

Index(
  { on: "text", fromMe: true, dontAddCommandList: true },
  async (message, match, m, client, msg) => {
    safeEval(message, async () => {
      if (message.text.startsWith("<")) {
        var conn = message.client;
        var client = conn;
        const util = require("util");
        const json = (x) => JSON.stringify(x, null, 2);
        try {
          let return_val = await eval(
            `(async () => { ${message.text.replace("$", "")} })()`
          );
          if (return_val && typeof return_val !== "string")
            return_val = util.inspect(return_val);
          if (return_val) await message.sendMessage(message.jid, return_val || "No return value");
        } catch (e) {
          if (e) await message.sendMessage(message.jid, util.format(e));
        }
      }
    });
  }
);

Index(
  { on: "text", fromMe: true, dontAddCommandList: true },
  async (message, match, m, client, msg) => {
    safeEval(message, async () => {
      if (message.text.startsWith("$")) {
        try {
          exec(match, async (error, stdout, stderr) => {
            if (error) {
              message.reply(`Error executing command: ${error.message}`);
              return;
            }
            if (stderr) {
              message.reply(`Command stderr: ${stderr}`);
              return;
            }
            return await message.reply(`Command output: ${stdout}`);
          });
        } catch (e) {
          if (e) await message.reply(util.format(e));
        }
      }
    });
  }
);

