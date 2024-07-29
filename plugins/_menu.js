const { Index, commands } = require('../lib/');
const os = require('os');
const Config = require('../config');

const styles = [
    { bullet: '◦➛', border: '═', header: '〘', footer: '〙' },
    { bullet: '→', border: '─', header: '《', footer: '》' },
    { bullet: '•', border: '=', header: '[', footer: ']' },
    { bullet: '»', border: '─', header: '{', footer: '}' }
];
let styleIndex = 0;

Index({
    pattern: 'menu',
    fromMe: true,
    desc: 'Displays a list of all available commands',
    dontAddCommandList: true,
    type: 'info'
}, async (message) => {
    const currentStyle = styles[styleIndex];
    styleIndex = (styleIndex + 1) % styles.length;

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
        const pad = (s) => (s < 10 ? '0' + s : s);
        const hours = pad(Math.floor(seconds / 3600));
        const minutes = pad(Math.floor((seconds % 3600) / 60));
        const secs = pad(seconds % 60);
        return `${hours}:${minutes}:${secs}`;
    };

    const uptime = formatUptime(Math.floor(process.uptime()));

    let response = `╭${currentStyle.border.repeat(3)}${currentStyle.header} ${Config.BOT_NAME} ${currentStyle.footer}${currentStyle.border.repeat(3)}⊷❍
┃✧╭──────────────
┃✧│ Owner : ${Config.OWNER_NAME}
┃✧│ User : ${message.pushName}
┃✧│ Plugins : ${commands.length}
┃✧│ Runtime : ${uptime}
┃✧│ Platform : ${os.platform()}
┃✧│ Total RAM : ${totalMemory} GB
┃✧│ Available RAM : ${freeMemory} GB
┃✧│ Used RAM : ${usedMemory} GB
┃✧│
┃✧│  ▎▍▌▌▉▏▎▌▉▐▏▌▎
┃✧│  ▎▍▌▌▉▏▎▌▉▐▏▌▎
┃✧│   ${message.pushName}
┃✧│
┃✧╰───────────────
╰${currentStyle.border.repeat(25)}⊷❍\n\n`;

    for (const [type, cmds] of Object.entries(categories)) {
        response += `╭${currentStyle.border.repeat(4)}${currentStyle.header} ${type.toUpperCase()} ${currentStyle.footer}${currentStyle.border.repeat(4)}⊷❍
│✧╭─────────────────
│✧│`;
        cmds.forEach(cmd => {
            response += `\n│✧│ ${currentStyle.bullet} ${cmd}`;
        });
        response += `\n┃✧╰─────────────────
╰${currentStyle.border.repeat(19)}⊷❍\n\n`;
    }
    await message.reply(response.trim());
});

Index({
    pattern: 'list',
    fromMe: true,
    desc: 'Displays a list of all available commands with descriptions',
    dontAddCommandList: true,
    type: 'info'
}, async (message) => {
    let response = `╭═══〘 COMMAND LIST 〙═══⊷❍
┃╭─────────────────\n`;

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
        response += `┃│ ◦➛ ${commandName}\n┃│   ${cmd.desc}\n┃│\n`;
    }
});

    response += `┃╰─────────────────
╰═════════════════⊷❍`;
    await message.client.sendMessage(message.jid, { text: response.trim() });
});
