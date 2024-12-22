const { Index, mode } = require('../lib/');
const figlet = require('figlet');
const util = require('util');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const figletAsync = util.promisify(figlet);
const { toggleAntidelete, setAntideleteDestination } = require('../index');
const config = require('../config');
const math = require('mathjs');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const Jimp = require('jimp');

// Helper function to convert WebP to MP4
async function convertWebpToMp4(webpBuffer) {
    try {
        // Create temporary files
        const tempWebpPath = path.join(__dirname, `../temp/${Date.now()}.webp`);
        const tempMp4Path = path.join(__dirname, `../temp/${Date.now()}.mp4`);

        // Write the WebP buffer to a temporary file
        await fs.promises.writeFile(tempWebpPath, webpBuffer);
  // Convert WebP to MP4 using ffmpeg
        await execAsync(`ffmpeg -i ${tempWebpPath} -vf "format=yuv420p" -movflags +faststart ${tempMp4Path}`);
        const mp4Buffer = await fs.promises.readFile(tempMp4Path);
        await fs.promises.unlink(tempWebpPath);
        await fs.promises.unlink(tempMp4Path);

        return mp4Buffer;
    } catch (error) {
        throw new Error(`Conversion failed: ${error.message}`);
    }
}

function webp2mp4File(path) {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append('new-image-url', '');
        form.append('new-image', fs.createReadStream(path));
        
        axios({
            method: 'post',
            url: 'https://s6.ezgif.com/webp-to-mp4',
            data: form,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${form._boundary}`
            }
        }).then(({ data }) => {
            const bodyFormThen = new FormData();
            const $ = cheerio.load(data);
            const file = $('input[name="file"]').attr('value');
            bodyFormThen.append('file', file);
            bodyFormThen.append('convert', "Convert WebP to MP4!");
            
            axios({
                method: 'post',
                url: 'https://ezgif.com/webp-to-mp4/' + file,
                data: bodyFormThen,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${bodyFormThen._boundary}`
                }
            }).then(({ data }) => {
                const $ = cheerio.load(data);
                const result = 'https:' + $('div#output > p.outfile > video > source').attr('src');
                resolve({
                    status: true,
                    message: "Created By Axiom-MD",
                    result: result
                });
            }).catch(reject);
        }).catch(reject);
    });
}

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



Index({
    pattern: 'sticker ?(.*)',
    fromMe: true,
    desc: 'Create a sticker from image/video. Use pack;author to set metadata',
    type: 'media'
}, async (message, match) => {
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
        const [pack, author] = (message.getUserInput() || '').split(';');
        const buffer = await message.downloadMediaMessage();
        const sticker = new Sticker(buffer, {
            pack: pack || 'AXIOM',
            author: author || 'AXIOM',
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
    pattern: 'take ?(.*)',
    fromMe: true,
    desc: 'Change sticker metadata. Reply to a sticker with pack;author',
    type: 'media'
}, async (message, match) => {
    if (!message.quoted || message.quotedType !== 'stickerMessage') {
        await message.reply('Please reply to a sticker to change its metadata.');
        return;
    }
    try {
        const [pack, author] = (message.getUserInput() || '').split(';');
        const buffer = await message.downloadMediaMessage();
        const sticker = new Sticker(buffer, {
            pack: pack || 'AXIOM',
            author: author || 'AXIOM',
            type: StickerTypes.FULL,
            categories: ['🤖', '👍'],
            quality: 50,
            background: 'transparent'
        });
        const stickerBuffer = await sticker.toBuffer();
        await message.client.sendMessage(message.jid, { sticker: stickerBuffer });
    } catch (error) {
        console.error('Error modifying sticker:', error);
        await message.reply('Failed to modify sticker. Error: ' + error.message);
    }
});

Index({
    pattern: 'toimg',
    fromMe: true,
    desc: 'Convert sticker to image',
    type: 'media'
}, async (message) => {
    if (!message.quoted || message.quotedType !== 'stickerMessage') {
        await message.reply('Please reply to a sticker to convert it to an image.');
        return;
    }
    try {
        const buffer = await message.downloadMediaMessage();
        await message.client.sendMessage(message.jid, { image: buffer, caption: 'Converted sticker to image' });
    } catch (error) {
        console.error('Error converting sticker to image:', error);
        await message.reply('Failed to convert sticker to image.');
    }
});

const webp2mp4 = async (buff) => {
    let buffer = await webp2mp4File(buff);
    return buffer;
}

Index({
    pattern: "mp4",
    fromMe: mode,
    desc: "Changes sticker to Video",
    type: "converter",
  },
  async (message) => {
    if (!message.quoted)
      return await message.reply("_Reply to a sticker_");
    if (message.quotedType !== "stickerMessage")
      return await message.reply("_Not a sticker_");
    let buff = await message.downloadMediaMessage();
    let buffer = await webp2mp4(buff);
    return await message.sendMessage(buffer, {}, "video");
  }
);



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

Index({
    pattern: 'textsticker ?(.*)',
    fromMe: true,
    desc: 'Create a sticker from text. Usage: .textsticker text;pack;author',
    type: 'media'
}, async (message, match) => {
    try {
        const input = message.getUserInput();
        if (!input) {
            await message.reply('Please provide text to convert. Usage: .textsticker text;pack;author');
            return;
        }
        const [text, pack, author] = input.split(';');
        const image = new Jimp(512, 512, 0x00000000);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const textWidth = Jimp.measureText(font, text);
        const textHeight = Jimp.measureTextHeight(font, text, textWidth);
        const x = (512 - textWidth) / 2;
        const y = (512 - textHeight) / 2;
        image.print(font, x, y, text);
        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        const sticker = new Sticker(buffer, {
            pack: pack || 'AXIOM',
            author: author || 'AXIOM',
            type: StickerTypes.FULL,
            categories: ['🤖', '👍'],
            quality: 50,
            background: 'transparent'
        });

        const stickerBuffer = await sticker.toBuffer();
        await message.client.sendMessage(message.jid, { sticker: stickerBuffer });
    } catch (error) {
        console.error('Error creating text sticker:', error);
        await message.reply('Failed to create text sticker. Error: ' + error.message);
    }
});
