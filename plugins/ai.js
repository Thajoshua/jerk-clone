const { Index, mode} = require('../lib/');
const axios = require('axios');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');


Index({
    pattern: 'chat',
    fromMe: mode,
    desc: 'Generate text using GPT-4',
    type: 'AI'
}, async (message, match) => {
    const userInput = message.getUserInput();
    if (!userInput) {
        return await message.reply('Please provide a text prompt. Usage: !gpt4 [text]');
    }

    try {
        await message.reply('Generating text, please wait...');

        const response = await axios.get(`https://widipe.com/gpt4`, {
            params: { text: userInput }
        });

        console.log('API response:', response.data);

        if (response.data && response.data.status && response.data.result) {
            const generatedText = response.data.result;

            await message.client.sendMessage(
                message.jid,
                { text: generatedText }
            );

        } else {
            await message.reply('Failed to generate text. Please check the text prompt and try again.');
        }
    } catch (error) {
        console.error('Error generating text:', error);
        await message.reply('An error occurred while processing your request. Please try again later.');
    }
});



Index({
    pattern: 'dalle',
    fromMe: mode,
    desc: 'Generate images using DALL-E',
    type: 'AI'
}, async (message, match) => {
    const userInput = message.getUserInput();
    if (!userInput) {
        return await message.reply('Please provide a text prompt. Usage: !dalle [text]');
    }

    try {
        await message.reply('Generating the image, please wait...');

        const response = await axios.get(`https://widipe.com/dalle`, {
            params: { text: userInput },
            responseType: 'arraybuffer'  
        });

        console.log('API response:', response.data);

        if (response.data) {
            const buff = Buffer.from(response.data, 'binary');

            await message.client.sendMessage(
                message.jid,
                { image: buff, caption: userInput  }
            );

            const buttons = [
                {
                    type: "url",
                    params: {
                        display_text: "Visit Website",
                        url: "https://www.example.com", 
                    },
                },
            ];

            const buttonMessage = createInteractiveMessage({
                jid: message.jid,
                button: buttons,
                header: {
                    title: "DALL-E Image Generator",
                    subtitle: "Image Generated",
                },
                footer: {
                    text: "Click the button below to visit the website.",
                },
                body: {
                    text: "Dall-E Interface",
                },
            });

            await message.client.relayMessage(buttonMessage.key.remoteJid, buttonMessage.message, { messageId: buttonMessage.key.id });

        } else {
            await message.reply('Failed to generate the image. Please check the text prompt and try again.');
        }
    } catch (error) {
        console.error('Error generating image:', error);
        await message.reply('An error occurred while processing your request. Please try again later.');
    }
});

function createInteractiveMessage(data, options = {}) {
    const { jid, button, header, footer, body } = data;
    let buttons = [];
    for (let i = 0; i < button.length; i++) {
        let btn = button[i];
        let Button = {};
        Button.buttonParamsJson = JSON.stringify(btn.params);
        switch (btn.type) {
            case "copy":
                Button.name = "cta_copy";
                break;
            case "url":
                Button.name = "cta_url";
                break;
            case "location":
                Button.name = "send_location";
                break;
            case "address":
                Button.name = "address_message";
                break;
            case "call":
                Button.name = "cta_call";
                break;
            case "reply":
                Button.name = "quick_reply";
                break;
            case "list":
                Button.name = "single_select";
                break;
            default:
                Button.name = "quick_reply";
                break;
        }
        buttons.push(Button);
    }
    const mess = {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    body: proto.Message.InteractiveMessage.Body.create({ ...body }),
                    footer: proto.Message.InteractiveMessage.Footer.create({ ...footer }),
                    header: proto.Message.InteractiveMessage.Header.create({ ...header }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        buttons: buttons,
                    }),
                }),
            },
        },
    };
    let optional = generateWAMessageFromContent(jid, mess, options);
    return optional;
}

