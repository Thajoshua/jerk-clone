const { Index, mode } = require('../lib/');
const figlet = require('figlet');
const util = require('util');
const figletAsync = util.promisify(figlet);
const math = require('mathjs');


Index({
    pattern: 'hackerman',
    fromMe: mode,
    desc: 'Converts text into hacker-style text.',
    type: 'cool'
}, async (message, match, client) => {
    const input = message.getUserInput();
    if (!input) {
        return await message.reply('Please provide text to convert. Usage: .hackerman [text]');
    }
    const hackerMap = {
        'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7',
        'A': '4', 'E': '3', 'I': '1', 'O': '0', 'S': '5', 'T': '7'
    };
    const hackerText = input.split('').map(char => hackerMap[char] || char).join('');
    await message.reply(`*H4ck3rm4n T3xt:*\n\n${hackerText}`);
});

Index({
    pattern: 'vaporwave',
    fromMe: mode,
    desc: 'Converts text to vaporwave aesthetic.',
    type: 'cool'
}, async (message, match, client) => {
    const input = message.getUserInput();
    if (!input) {
        return await message.reply('Please provide text to vaporwave-ify. Usage: .vaporwave [text]');
    }
    const vaporwaved = input.split('').join(' ').toUpperCase();
    await message.reply(`*Ｖａｐｏｒｗａｖｅ  Ｔｅｘｔ：*\n\n${vaporwaved}`);
});


Index({
    pattern: 'ascii',
    fromMe: mode,
    desc: 'Generates ASCII art from text.',
    type: 'cool'
}, async (message, match, client) => {
    const input = message.getUserInput();
    if (!input) {
        return await message.reply('Please provide text to convert. Usage: .ascii [text]');
    }
    try {
        const result = await figletAsync(input);
        await message.reply('```' + result + '```');
    } catch (err) {
        await message.reply('Error generating ASCII art. Please try again.');
    }
});

Index({
    pattern: '8ball',
    fromMe: mode,
    desc: 'Ask the Magic 8-Ball a question.',
    type: 'cool'
}, async (message, match, client) => {
    const input = message.getUserInput();
    
    if (!input) {
        return await message.reply('Please ask a question. Usage: .8ball [your question]');
    }

    const responses = [
        "It is certain.", "Without a doubt.", "You may rely on it.",
        "Ask again later.", "Cannot predict now.", "Better not tell you now.",
        "Don't count on it.", "My reply is no.", "My sources say no."
        // Add more responses
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await message.reply(`*🎱 Magic 8-Ball says:*\n\n${randomResponse}`);
});


Index({
    pattern: 'calc',
    fromMe: mode,
    desc: 'Performs advanced mathematical calculations.',
    type: 'advanced tools'
}, async (message, match, client) => {
    const input = message.getUserInput();
    if (!input) {
        return await message.reply('Please provide a mathematical expression. Usage: .calc [expression]');
    }
    try {
        const result = math.evaluate(input);
        await message.reply(`*🧮 Calculator:*\n\nExpression: ${input}\nResult: ${result}`);
    } catch (error) {
        await message.reply('Error in calculation. Please check your expression and try again.');
    }
});




Index({
    pattern: 'msginfo',
    fromMe: true,
    desc: 'Get detailed information about the message',
    type: 'utility'
}, async (message) => {
    const info = [
        `Sender: ${message.pushName} (${message.sender})`,
        `Timestamp: ${new Date(message.timestamp * 1000).toLocaleString()}`,
        `Is Forwarded: ${message.isForwarded}`,
        `Chat Type: ${message.isGroup ? 'Group' : 'Private'}`,
        `Has Media: ${message.hasMedia}`,
        `Media Type: ${message.mediaType || 'None'}`,
        `URLs: ${message.urls.join(', ') || 'None'}`,
        `Emojis Used: ${message.emojis.join(' ') || 'None'}`,
        `Is Ephemeral: ${message.isEphemeral}`,
        `Expiration Time: ${message.expirationTime ? new Date(message.expirationTime * 1000).toLocaleString() : 'N/A'}`
    ].join('\n');

    await message.reply(info);
});

Index({
    pattern: 'quote',
    fromMe: true,
    desc: 'Get information about the quoted message',
    type: 'utility'
}, async (message) => {
    if (!message.quoted) {
        await message.reply('Please reply to a message to use this command.');
        return;
    }
    let quoteInfo = [
        `Quoted Message Type: ${message.quotedType}`,
        `Quoted Message Text: ${message.quotedText}`,
        `Quoted Message Sender: ${message.quoted.participant}`,
        `Quoted Message ID: ${message.quoted.key}`
    ];
    if (message.quotedType === 'imageMessage' || message.quotedType === 'videoMessage') {
        quoteInfo.push(`Caption: ${message.quotedMsg.caption || 'No caption'}`);
    }
    if (message.quotedType === 'stickerMessage') {
        quoteInfo.push(`Is Animated: ${message.quotedMsg.isAnimated ? 'Yes' : 'No'}`);
    }
    await message.reply(quoteInfo.join('\n'));
    await message.reply('This is a reply to the quoted message', { quoted: message.quoted });
});

Index({
    pattern: 'mediainfo',
    fromMe: true,
    desc: 'Get information about quoted media',
    type: 'utility'
}, async (message) => {
    if (!message.quoted || !['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage'].includes(message.quotedType)) {
        await message.reply('Please reply to a media message (image, video, audio, or sticker) to get its info.');
        return;
    }
    let mediaInfo = [
        `Media Type: ${message.quotedType}`,
        `File Size: ${message.quotedMsg.fileSize || 'Unknown'} bytes`,
        `MIME Type: ${message.quotedMsg.mimetype || 'Unknown'}`
    ];
    if (message.quotedType === 'imageMessage' || message.quotedType === 'videoMessage') {
        mediaInfo.push(`Caption: ${message.quotedMsg.caption || 'No caption'}`);
    }
    if (message.quotedType === 'videoMessage' || message.quotedType === 'audioMessage') {
        mediaInfo.push(`Duration: ${message.quotedMsg.seconds || 'Unknown'} seconds`);
    }
    if (message.quotedType === 'stickerMessage') {
        mediaInfo.push(`Is Animated: ${message.quotedMsg.isAnimated ? 'Yes' : 'No'}`);
    }
    await message.reply(mediaInfo.join('\n'));
});

const { Sticker, StickerTypes } = require('wa-sticker-formatter');


Index({
    pattern: 'sticker',
    fromMe: true,
    desc: 'Create a sticker from an image, video, or quoted media',
    type: 'media'
}, async (message) => {
    let mediaMessage = null;
    if (message.hasMedia && (message.mediaType === 'image' || message.mediaType === 'video')) {
        mediaMessage = message;
    } else if (message.quoted) {
        if (message.quotedType === 'imageMessage' || message.quotedType === 'videoMessage') {
            mediaMessage = message.quoted;
        }
    }
    if (!mediaMessage) {
        await message.reply('Please send an image or short video, or reply to one with this command to create a sticker.');
        return;
    }
    try {
        const buffer = await message.downloadMediaMessage();
        const sticker = new Sticker(buffer, {
            pack: config.stickerPackName,
            author: config.stickerAuthor,
            type: StickerTypes.FULL,
            categories: ['🤖', '👍'],
            quality: 50,
            background: 'transparent'
        });
        const stickerBuffer = await sticker.toBuffer();
        await message.client.sendMessage(message.jid, { sticker: stickerBuffer });
    } catch (error) {
        console.error('Error creating sticker:', error);
        await message.reply('Failed to create sticker. Error: ' + error.message);
    }
});


Index({
    pattern: 'setgpp',
    fromMe: true,
    desc: 'Change group profile picture',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) {
        await message.reply('This command can only be used in a group.');
        return;
    }

    if (!message.hasMedia && !message.quoted) {
        await message.reply('Please send an image or reply to an image to set it as group profile picture.');
        return;
    }

    try {
        const buffer = await message.downloadMediaMessage();
        await message.setPP(message.jid, buffer);
        await message.reply('Group profile picture updated successfully!');
    } catch (error) {
        console.error('Error setting group profile picture:', error);
        await message.reply('Failed to set group profile picture. Error: ' + error.message);
    }
});
;



const { toggleAntidelete, setAntideleteDestination } = require('../index');
const config = require('../config');

Index({
    pattern: 'antidelete ?(.*)',
    fromMe: true,
    desc: 'Toggle antidelete feature or set destination',
    type: 'admin'
}, async (message, match) => {
    const command = message.getUserInput().toLowerCase().trim();

    if (command === 'on') {
        toggleAntidelete(true);
        return await message.reply('Antidelete feature has been enabled.');
    } else if (command === 'off') {
        toggleAntidelete(false);
        return await message.reply('Antidelete feature has been disabled.');
    } else if (command === 'chat') {
        setAntideleteDestination('chat');
        return await message.reply('Antidelete messages will be sent to the chat where deletion occurred.');
    } else if (command === 'sudo') {
        setAntideleteDestination('sudo');
        return await message.reply('Antidelete messages will be sent to the sudo user.');
    } else if (command && command.includes('@')) {
        setAntideleteDestination(command);
        return await message.reply(`Antidelete messages will be sent to ${command}.`);
    } else {
        const status = global.antideleteEnabled ? 'enabled' : 'disabled';
        const destination = config.ANTIDELETE_DESTINATION;
        return await message.reply(`Antidelete is currently ${status}.\nCurrent destination: ${destination}\n\nUsage:\n.antidelete on - Enable antidelete\n.antidelete off - Disable antidelete\n.antidelete chat - Send to current chat\n.antidelete sudo - Send to sudo user\n.antidelete jid - Send to specific JID`);
    }
});
