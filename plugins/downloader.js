const { Index, mode} = require('../lib/');
const {commands} = require('../lib/index');
const {Tiktok,ytv} = require('../lib/down')
const axios = require('axios');
const youtubeSearch = require('youtube-search-api');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const { ssweb } = require('../lib/utils'); 


Index({
  pattern: 'tiktok',
  fromMe: true,
  desc: 'Downloads TikTok video(Without Watermark)',
  type: 'downloader'
}, async (message, match, client) => {
  const input = message.getUserInput().trim();
  if (!input) {
    return await message.reply('Please provide a TikTok URL.');
  }

  try {
    const tiktokData = await Tiktok(input);
    const videoBuffer = await axios.get(tiktokData.watermark, { responseType: 'arraybuffer' }).then(res => res.data);

    await message.sendMedia({
      buffer: videoBuffer,
      caption: `${tiktokData.title}\n\n${tiktokData.author}`,
      mimetype: 'video/mp4'
    });
  } catch (error) {
    console.error('Error fetching TikTok video:', error);
    await message.reply('Failed to fetch TikTok video. Please try again later.');
  }
});


Index({
    pattern: 'pixabay',
    fromMe: true,
    desc: 'Search for images on Pixabay',
    type: 'search'
}, async (message, match) => {
    const query = message.getUserInput();
    if (!query) {
        return await message.reply('Please provide a search query. Usage: !pixabay [search query]');
    }
    try {
        const response = await axios.get(`https://api.maher-zubair.tech/search/pixabay`, {
            params: { q: query }
        });
        if (response.data && response.data.result && response.data.result.length > 0) {
            const imageUrls = response.data.result;
            if (imageUrls.length > 0) {
                for (const imageUrl of imageUrls.slice(0, 5)) { 
                    await message.client.sendMessage(message.jid, { 
                        image: { url: imageUrl },
                        caption: `Image result for "${query}" from Pixabay`
                    });
                }
            } else {
                await message.reply('Sorry, no images were found for your query.');
            }
        } else {
            await message.reply('Failed to fetch images. Please try again later.');
        }
    } catch (error) {
        console.error('Error searching for images:', error);
        await message.reply('An error occurred while processing your request. Please try again later.');
    }
});



Index({
	pattern: 'cmd ?(.*)',
	fromMe: mode,
	desc: 'cmd',
	type: 'info'
}, async (message, match, client) => {
	await message.reply(`${commands.filter(command => command.pattern).length}`);
});


Index({
    pattern: 'image ?(.*)',
    fromMe: true,
    desc: 'Search images on Unsplash',
    type: 'search'
}, async (message, match) => {
    const query = message.getUserInput();
    if (!query) {
        await message.reply('Please provide a search query.');
        return;
    }
    try {
        const response = await axios.get(`https://api.maher-zubair.tech/search/unsplash?q=${encodeURIComponent(query)}`);
        if (response.data && response.data.result && response.data.result.length > 0) {
            const images = response.data.result;
            const shuffledImages = images.sort(() => 0.5 - Math.random());
            const selectedImages = shuffledImages.slice(0, 5); 
            for (const image of selectedImages) {
                await message.client.sendMessage(message.jid, {
                    image: { url: image },
                    caption: `*Search Result for:* ${query}`
                });
            }
        } else {
            await message.reply('No images found for the provided query.');
        }
    } catch (error) {
        console.error('Error fetching images:', error);
        await message.reply('An error occurred while fetching images. Please try again later.');
    }
});



Index({
    pattern: 'ytv',
    fromMe: mode,
    desc: 'Download YouTube videos',
    type: 'downloader'
}, async (message, match) => {
    let [url, quality] = message.getUserInput().split(';');
    if (!url) {
        return await message.reply("Give me a YouTube link\n\nExample: ytv youtube.com/watch?v=xxxxx;480p");
    }
    if (!quality) {
        quality = "360p"; 
    }
    try {
        await message.reply("Downloading video. Please wait...");
        const videoData = await ytv(url, quality);
        if (!videoData || !videoData.dlink) {
            return await message.reply("Failed to fetch video information. Please try again.");
        }
        await message.client.sendMessage(message.jid, {
            video: { url: videoData.dlink },
            caption: `Title: ${videoData.title}\nQuality: ${quality}\nSize: ${videoData.sizes}`,
            mimetype: "video/mp4",
            fileName: `${videoData.title}.mp4`
        });

    } catch (error) {
        console.error('Error:', error);
        await message.reply('An error occurred while processing your request.');
    }
});


let awaitingSelection = false;
let searchResults = null;

Index({
  pattern: 'ytsearch ?(.*)',
  fromMe: true,
  desc: 'Search for videos on YouTube',
  type: 'search'
}, async (message, match) => {
  try {
    const query = message.getUserInput();
    if (!query) {
      return await message.reply('Please provide a search query. Usage: .ytsearch <query>');
    }

    await message.reply(`Searching YouTube for: "${query}"`);

    const results = await youtubeSearch.GetListByKeyword(query, false, 5);

    if (!results || results.items.length === 0) {
      return await message.reply('No results found for your search query.');
    }

    let response = '🔎 *YouTube Search Results*\n\n';
    
    results.items.forEach((video, index) => {
      response += `${index + 1}. *${video.title}*\n`;
      response += `    Channel: ${video.channelTitle}\n`;
      response += `    Duration: ${video.length.simpleText}\n\n`;
    });

    response += 'Reply with the number of the video you want to download (1-5), or type "cancel" to exit.';

    await message.reply(response);

    awaitingSelection = true;
    searchResults = results.items;

  } catch (error) {
    console.error('Error in YouTube search command:', error);
    await message.reply('An error occurred while searching YouTube. Please try again later.');
  }
});

Index({
  on: 'message',
  fromMe: false,
  dontAddCommandList: true,
}, async (message) => {
  if (!awaitingSelection || !searchResults) return;

  const selection = message.text.trim();

  if (selection.toLowerCase() === 'cancel') {
    awaitingSelection = false;
    searchResults = null;
    return await message.reply('Search cancelled.');
  }

  const index = parseInt(selection) - 1;
  if (isNaN(index) || index < 0 || index >= searchResults.length) {
    return await message.reply('Invalid selection. Please select a number between 1 and 5.');
  }

  try {
    const selectedVideo = searchResults[index];
    await message.reply(`Downloading: ${selectedVideo.title}`);

    const videoUrl = `https://www.youtube.com/watch?v=${selectedVideo.id}`;

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path.join(tempDir, `${selectedVideo.id}.mp4`);

    const videoStream = ytdl(videoUrl, { filter: 'audioandvideo', format: 'mp4' });
    const writeStream = fs.createWriteStream(filePath);

    videoStream.pipe(writeStream);

    writeStream.on('finish', async () => {
      await message.sendMedia({
        url: filePath,
        caption: selectedVideo.title,
        mimetype: 'video/mp4'
      });

      fs.unlinkSync(filePath);
    });

    writeStream.on('error', async (error) => {
      console.error('Error in YouTube download:', error);
      await message.reply('An error occurred while downloading the video. Please try again later.');
      awaitingSelection = false;
      searchResults = null;
    });

  } catch (error) {
    console.error('Error in YouTube download:', error);
    await message.reply('An error occurred while downloading the video. Please try again later.');
    awaitingSelection = false;
    searchResults = null;
  }
});



Index({
  pattern: 'ytaudio ?(.*)',
  fromMe: true,
  desc: 'Download audio from YouTube based on a search query',
  type: 'search'
}, async (message, match) => {
  try {
    const query = message.getUserInput();
    if (!query) {
      return await message.reply('Please provide a search query. Usage: .ytaudio <query>');
    }

    const results = await youtubeSearch.GetListByKeyword(query, false, 1);

    if (!results || results.items.length === 0) {
      return await message.reply('No results found for your search query.');
    }

    const selectedVideo = results.items[0];
    await message.reply(`Downloading: ${selectedVideo.title}`);

    const videoUrl = `https://www.youtube.com/watch?v=${selectedVideo.id}`;

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path.join(tempDir, `${selectedVideo.id}.mp3`);

    const videoStream = ytdl(videoUrl, { filter: 'audioonly' });
    const writeStream = fs.createWriteStream(filePath);

    videoStream.pipe(writeStream);

    writeStream.on('finish', async () => {
      await message.sendMedia({
        url: filePath,
        caption: selectedVideo.title,
        mimetype: 'audio/mpeg'
      });

      fs.unlinkSync(filePath);
    });

    writeStream.on('error', async (error) => {
      console.error('Error in YouTube download:', error);
      await message.reply('An error occurred while downloading the song. Please try again later.');
    });

  } catch (error) {
    console.error('Error in YouTube download:', error);
    await message.reply('An error occurred while downloading the song. Please try again later.');
  }
});


Index({
  pattern: 'screenshot|ss',
  fromMe: true,
  desc: 'Take a screenshot of a webpage',
  type: 'utility'
}, async (message, match, client) => {
  const input = message.getUserInput().trim();
  const [url, device = 'desktop'] = input.split(' ');
  if (!url) {
    return await client.sendMessage(message.chat, { text: 'Please provide a URL.' }, { quoted: message.data });
  }
  try {
    const result = await ssweb(url, device);
    if (result.status !== 200) {
      return await client.sendMessage(message.chat, { text: `Error: ${result.message || 'Unable to take screenshot.'}` }, { quoted: message.data });
    }
    const screenshotPath = path.join(__dirname, 'screenshot.png');
    fs.writeFileSync(screenshotPath, result.result);
    await client.sendMessage(message.chat, { image: { url: screenshotPath }, caption: `Screenshot of ${url}` }, { quoted: message.data });
    fs.unlink(screenshotPath, (err) => {
      if (err) console.error('Error deleting screenshot file:', err);
    });
  } catch (error) {
    await client.sendMessage(message.chat, { text: 'Error taking or sending the screenshot. Please try again later.' }, { quoted: message.data });
    console.log(error);
  }
});
