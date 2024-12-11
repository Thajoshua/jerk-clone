const axios = require('axios');
const { Index, commands } = require('../lib/');
const generatePassword = require('password-generator');
const googleTTS = require('google-tts-api');

Index({
    pattern: 'tts',
    fromMe: true,
    desc: 'Convert text to speech',
    type: 'utility'
}, async (message) => {
    const input = message.getUserInput();

    if (!input) {
        return message.reply("Please provide a language code and text. Example: .tts en Hello, world!");
    }

    const [langCode, ...textArray] = input.split(' ');
    const text = textArray.join(' ');

    if (!langCode || !text) {
        return message.reply("Please provide a language code and text. Example: .tts en Hello, world!");
    }

    try {
        const url = googleTTS.getAudioUrl(text, {
            lang: langCode,
            slow: false,
            host: 'https://translate.google.com',
        });

        await message.client.sendMessage(message.jid, { audio: { url }, mimetype: 'audio/mp4' });
    } catch (error) {
        console.error('Error in TTS:', error);
        return message.reply("An error occurred while converting text to speech. Please try again later.");
    }
});


Index({
    pattern: 'remind',
    fromMe: true,
    desc: 'Set a reminder',
    type: 'tools'
}, async (message) => {
    const query = message.getUserInput();
    const [time, ...reminderText] = query.split(' ');
    if (!time || reminderText.length === 0) {
        return await message.reply('Usage: remind [time in minutes] [reminder text]');
    } 
    const reminderMsg = reminderText.join(' ');
    const minutes = parseInt(time);
    if (isNaN(minutes) || minutes <= 0) {
        return await message.reply('Please provide a valid positive number for minutes.');
    }
    await message.reply(`Reminder set for ${minutes} minutes from now.`);
    
    setTimeout(async () => {
        await message.reply(`Reminder: ${reminderMsg}`);
    }, minutes * 60000);
});

Index({
    pattern: 'define',
    fromMe: true,
    desc: 'Fetch the definition of a word',
    type: 'utility'
}, async (message) => {
    const word = message.getUserInput();

    if (!word) {
        return message.reply('Please provide a word to define.');
    }
    try {
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const definitions = response.data[0].meanings[0].definitions;

        let definitionText = `Definitions for ${word}:\n`;
        definitions.forEach((def, index) => {
            definitionText += `${index + 1}. ${def.definition}\n`;
        });

        message.reply(definitionText);
    } catch (error) {
        message.reply('Error fetching definition: ' + error.message);
    }
});

Index({
    pattern: 'password',
    fromMe: true,
    desc: 'Generate a strong password',
    type: 'utility'
}, async (message) => {
    const length = parseInt(message.getUserInput(), 10) || 12;
    const password = generatePassword(length, false);
    message.reply(password);
});
