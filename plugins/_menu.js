const { Index, commands } = require('../lib/');
const os = require('os');
const Config = require('../config');

Index({
    pattern: 'menu',
    fromMe: true,
    desc: 'Displays a list of all available commands',
    dontAddCommandList: true,
    type: 'info'
}, async (message) => {
    const categories = {};

    commands.forEach(cmd => {
        if (!cmd.dontAddCommandList) {
            if (!categories[cmd.type]) {
                categories[cmd.type] = [];
            }
            let commandName;
            if (cmd.pattern instanceof RegExp) {
                commandName = cmd.pattern.toString().split(/\W+/)[1];
            } else if (typeof cmd.pattern === 'string') {
                commandName = cmd.pattern.split('|')[0].trim();
            } else {
                commandName = 'unknown';
            }
            categories[cmd.type].push(commandName);
        }
    });

    const totalMemory = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
    const freeMemory = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
    const usedMemory = (totalMemory - freeMemory).toFixed(2);

    const formatUptime = (seconds) => {
        seconds = Number(seconds);
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`); 
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0) parts.push(`${secs}s`);
        
        return parts.join(' ') || '0s';
    };

    const uptime = formatUptime(Math.floor(process.uptime()));

    let response = `╭─────────────┈⊷
│ 「 *${Config.BOT_NAME}* 」
╰┬────────────┈⊷
┌┤
││◦➛ Owner: ${Config.OWNER_NAME}
││◦➛ User: ${message.pushName} 
││◦➛ Plugins: ${commands.length}
││◦➛ Uptime: ${uptime}
││◦➛ Platform: ${os.platform()}
││
││◦➛ Memory Stats
││◦➛ Total: ${totalMemory} GB
││◦➛ Free: ${freeMemory} GB
││◦➛ Used: ${usedMemory} GB
│╰────────────┈⊷
╰─────────────┈⊷\n\n`;

    for (const [type, cmds] of Object.entries(categories)) {
        response += `╭─────────────┈⊷
│ 「 *${type.toUpperCase()}* 」
╰┬────────────┈⊷
┌┤\n`;
        cmds.forEach(cmd => {
            response += `││◦➛ ${cmd}\n`;
        });
        response += `│╰────────────┈⊷
╰─────────────┈⊷\n\n`;
    }
    await message.reply(response.trim());
});
// ... existing code ...

Index({
    pattern: 'list ?(.*)',  // Modified to accept an optional parameter
    fromMe: true,
    desc: 'Displays all commands or info about a specific command',
    dontAddCommandList: true,
    type: 'info'
}, async (message, match) => {
    const input = message.getUserInput();
    const commandQuery = input?.toLowerCase(); 

    if (commandQuery) {
        const command = commands.find(cmd => {
            let cmdName;
            if (cmd.pattern instanceof RegExp) {
                cmdName = cmd.pattern.toString().split(/\W+/)[1];
            } else if (typeof cmd.pattern === 'string') {
                cmdName = cmd.pattern.split('|')[0].trim();
            }
            return cmdName?.toLowerCase() === commandQuery;
        });

        if (command) {
            let response = `╭───────────────────────⊷
│ *COMMAND INFO* 
├───────────────────────⊷
│ ◦ Command: ${commandQuery}
│ ◦ Description: ${command.desc}
│ ◦ Type: ${command.type}
│ ◦ FromMe: ${command.fromMe ? 'Yes' : 'No'}
╰───────────────────────⊷`;
            return await message.client.sendMessage(message.jid, { text: response.trim() });
        } else {
            return await message.client.sendMessage(message.jid, { text: `❌ Command "${commandQuery}" not found!` });
        }
    }

    // If no specific command was requested, show the full list
    let response = `╭━━━━『 𝘾𝙊𝙈𝙈𝘼𝙉𝘿 𝙇𝙄𝙎𝙏 』━━━━⊷
┃
┃ Here are all available commands:
┃\n`;

    commands.forEach(cmd => {
        if (!cmd.dontAddCommandList) {
            let commandName;
            if (cmd.pattern instanceof RegExp) {
                commandName = cmd.pattern.toString().split(/\W+/)[1];
            } else if (typeof cmd.pattern === 'string') {
                commandName = cmd.pattern.split('|')[0].trim();
            } else {
                commandName = 'unknown';
            }
            response += `┃ ⦿ ${commandName}
┃ ➥ ${cmd.desc}
┃\n`;
        }
    });

    response += `┃
╰━━━━━━━━━━━━━━━━━━━━━⊷`;
    await message.client.sendMessage(message.jid, { text: response.trim() });
});
