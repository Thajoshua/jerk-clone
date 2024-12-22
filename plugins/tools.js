const axios = require('axios');
const { Index, commands } = require('../lib/');
const generatePassword = require('password-generator');
const googleTTS = require('google-tts-api');
const { isValidURL, extractURL } = require('../lib/utils');
const { TinyURL } = require('../lib/utils');


Index({
    pattern: 'short',
    fromMe: true,
    desc: 'Shorten a URL using TinyURL',
    type: 'utility'
}, async (message) => {
    const input = message.getUserInput();
    
    if (!input) {
        return await message.reply('Please provide a URL to shorten');
    }

    // Extract URL from the message
    const url = extractURL(input);

    if (!url) {
        return await message.reply('No valid URL found in the message');
    }

    try {
        // Validate the extracted URL
        if (!isValidURL(url)) {
            return await message.reply('Invalid URL format');
        }
        
        const result = await TinyURL(url);
        
        // Prepare the response message
        const responseMessage = `
*URL Shortener:*
-Original URL: ${url}
-Shortened URL: ${result.link}
        `.trim();
        
        // Send the response
        await message.reply(responseMessage);
    } catch (error) {
        console.error('URL Shortening Error:', error);
        await message.reply('Failed to shorten the URL. Please check the URL and try again.');
    }
});



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

        await message.client.sendMessage(message.jid, { audio: { url }, mimetype: "audio/mpeg",   ptt: true,});
    } catch (error) {
        console.error('Error in TTS:', error);
        return message.reply("An error occurred while converting text to speech. Please try again later.");
    }
});




Index({
    pattern: 'npm',
    fromMe: false,
    desc: 'Search npm packages by name.',
    category: 'tools',
}, async (message) => {
    const userInput = await message.getUserInput();
    if (!userInput) return await message.reply('Please provide a package name.📦');

    try {
        const { data } = await axios.get(`https://api.npms.io/v2/search?q=${userInput.trim()}`);

        if (!data.results || data.results.length === 0) {
            return await message.reply('No npm packages found for the given name.');
        }

        let txt = data.results.map((v) => {
            const pkg = v.package;
            return `
Name: ${pkg.name}
Scope: ${pkg.scope}
Version: ${pkg.version}
Description: ${pkg.description || 'No description available.'}
            `;
        }).join("\n\n");

        return await message.reply(txt);
    } catch (error) {
        console.error(error);
        return await message.reply('An error occurred while searching for npm packages. Please try again later.');
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