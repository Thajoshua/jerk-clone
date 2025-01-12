const { Index } = require('../lib/');


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