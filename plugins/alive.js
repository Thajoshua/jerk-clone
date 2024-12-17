const { Index, mode, formatTime } = require('../lib/');

Index({
	pattern: 'ping ?(.*)',
	fromMe: mode,
	desc: 'Bot response in milliseconds.',
	type: 'info'
}, async (message, match, client) => {
	const start = new Date().getTime();
	const msg = await message.reply('*ᴩɪɴɢ...*');
	const end = new Date().getTime();
	const responseTime = end - start;
	await message.reply(`*pong!*\nʟᴀᴛᴇɴᴄʏ: ${responseTime}ms`);
});

const os = require('os');
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

Index({
    pattern: 'sysinfo ?(.*)',
    fromMe: mode,
    desc: 'Displays system information of the host.',
    type: 'utility'
}, async (message, match, client) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpuModel = os.cpus()[0].model;
    const cpuSpeed = os.cpus()[0].speed;
    const uptime = os.uptime();

    const sysInfo = `*System Information*

*OS:* ${os.type()} ${os.release()}
*Architecture:* ${os.arch()}
*CPU:* ${cpuModel}
*CPU Speed:* ${cpuSpeed} MHz
*Total Memory:* ${formatBytes(totalMem)}
*Used Memory:* ${formatBytes(usedMem)}
*Free Memory:* ${formatBytes(freeMem)}
*Uptime:* ${Math.floor(uptime / 3600)} hours, ${Math.floor((uptime % 3600) / 60)} minutes

*Node.js Version:* ${process.version}
*Hostname:* ${os.hostname()}`;

    await message.reply(sysInfo);
});


Index({
    pattern: 'jid',
    fromMe: true,
    desc: 'To get remoteJid',
    type: 'whatsapp'
}, async (message) => {
    try {
        let jid;
        if (message.mentionedJid && message.mentionedJid.length > 0) {
            jid = message.mentionedJid[0];
        } else if (message.quoted && message.quoted.participant) {
            jid = message.quoted.participant;
        } else {
            jid = message.chat;
        }
        await message.reply(`${jid}`);
    } catch (error) {
        console.error('Error retrieving JID:', error);
        await message.reply('Failed to retrieve JID. Error: ' + error.message);
    }
});


Index({
	pattern: 'uptime',
	fromMe: mode,
	desc: 'Get bots runtime',
	type: 'info'
}, async (message, match, client) => {
	await message.sendMessage(message.jid, formatTime(process.uptime()));
})
