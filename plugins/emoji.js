const { Index } = require('../lib/');
const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');


let autoReactEnabled = false;
const emojis = [
    '👍', '😂', '😍', '🤔', '😎', '😭', '😡', '🙏', '👏', '🎉', 
    '💯', '🔥', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿', '❤️', '💔', '💋', 
    '✨', '🌟', '🎊', '🎈', '🌈', '😇', '🤗', '😜', '🙌', '🤩', 
    '💪', '👐', '👊', '✌️', '🤝', '💼', '🏆', '👑', '💎', '🌹',
    '🌟', '💫', '🕺', '💃', '🎵', '🎤', '📣', '📢', '👀', '🕶️',
    '🍀', '🍭', '🎂', '🍰', '🥳', '🍦', '🍩', '🍪', '🥂', '🍷',
    '🥃', '🍻', '🍺', '🍸', '🍹', '🕯️', '💡', '🧠', '🗣️', '🤯'
];
function enableAutoReact() {
    autoReactEnabled = true;
}
function disableAutoReact() {
    autoReactEnabled = false;
}
function isAutoReactEnabled() {
    return autoReactEnabled;
}
function getRandomEmoji() {
    return emojis[Math.floor(Math.random() * emojis.length)];
}


Index({
    pattern: 'autoreact',
    fromMe: true,
    desc: 'Manage auto-react feature (on/off)',
    type: 'utility'
}, async (message) => {
    const userInput = message.getUserInput();

    if (userInput === 'on') {
        enableAutoReact();
        await message.reply('Auto-react feature has been turned ON.');
    } else if (userInput === 'off') {
        disableAutoReact();
        await message.reply('Auto-react feature has been turned OFF.');
    } else {
        await message.reply('Please use "auto-react on" or "auto-react off" to manage the feature.');
    }
});

async function handleAutoReact(message) {
    if (isAutoReactEnabled()) {
        const randomEmoji = getRandomEmoji();
        await message.react(randomEmoji);
    }
}

module.exports = {
    handleAutoReact,
};


Index({
  pattern: 'groupvcf',
  fromMe: true,
  desc: 'Get all group numbers with names as VCF',
  type: 'group'
}, async (message) => {
  try {
    if (!message.isGroup) {
      return await message.reply('This command can only be used in a group.');
    }

    const groupMetadata = await message.client.groupMetadata(message.jid);
    const participants = groupMetadata.participants;

    let vcfContent = '';
    for (const participant of participants) {
      const number = participant.id.split('@')[0];
      const name = participant.notify || number; 
      vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;TYPE=CELL:${number}\nEND:VCARD\n`;
    }

    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });
    const vcfPath = path.join(tempDir, 'group_contacts.vcf');
    await fs.writeFile(vcfPath, vcfContent);

    await message.reply('Here are the group contacts as a VCF file:');
    await message.client.sendMessage(message.jid, {
      document: { url: vcfPath },
      fileName: 'group_contacts.vcf',
      mimetype: 'text/vcard',
    });

    await fs.unlink(vcfPath);
  } catch (error) {
    console.error('Error in groupvcf command:', error);
    await message.reply('An error occurred while creating the VCF file.');
  }
});
