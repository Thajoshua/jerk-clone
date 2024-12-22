const { Index} = require('../lib/');
const fg = require('api-dylux');
const axios = require('axios');

Index({
  pattern: 'yta',
  fromMe: true,
  desc: 'Download audio from YouTube based on a provided URL',
  type: 'downloader'
}, async (message, match) => {
  try {
    const url = message.getUserInput();

    if (!url) {
      return await message.reply('Please provide a valid YouTube URL. Usage: .play <YouTube URL>');
    }

    const processingReaction = await message.react('⏳');

    fg.yta(url)
      .then(async data => {
        const audioUrl = data.dl_url;
        console.log(data);

        await message.react('📥');
        await message.reply(`Downloading ${data.title}...`);

        await message.sendMedia({
          url: audioUrl,
          caption: data.title,
          mimetype: 'audio/mpeg',
        });

        await message.react('✅');
        setTimeout(async () => {
          await message.react('');
        }, 3000);

      })
      .catch(async e => {
        await message.react('❌');
        await message.reply('Error: ' + e.message);
        setTimeout(async () => {
          await message.react('');
        }, 3000);
      });
  } catch (error) {
    console.error('Error in YouTube download:', error);
    await message.react('❌');
    await message.reply('An error occurred while processing the request. Please try again later.');
  }
});


Index({
  pattern: 'tiktok', 
  fromMe: true,
  desc: 'Download TikTok video using the link provided.',
  type: 'download'
}, async (message, match) => {
  let link = message.getUserInput();
  if (!link) return await message.reply("Please provide a TikTok video link.\n\nExample: .tikt https://vm.tiktok.com/xxxxx");

  try {
    const processingReaction = await message.react('⏳');
    
    const data = await fg.tiktok(link);
    if (!data || !data.result || !data.result.play) {
      await message.react('❌');
      await message.reply(`Failed to fetch video information.\n\nResponse:\n${JSON.stringify(data, null, 2)}`);
      setTimeout(async () => {
        await message.react('');
      }, 3000);
      return;
    }

    await message.react('📥');
    await message.reply(`Downloading ${data.result.title}...`);

    await message.client.sendMessage(message.jid, {
      video: { url: data.result.play },
      caption: `Title: ${data.result.title}\n\n> Powered by Axiom-Md,`,
      mimetype: "video/mp4",
      fileName: `${data.result.title || 'TikTok Video AXIOM'}.mp4`
    });

    await message.react('✅');
    setTimeout(async () => {
      await message.react('');
    }, 3000);

  } catch (error) {
    await message.react('❌');
    await message.reply(`Error occurred:\n\n${error.message}`);
  }
});




Index({
    pattern: "lyrics",
    fromMe: true,
    desc: "Fetch song lyrics",
    type: "search",
}, async (message, match) => {
    try {
        let songName = message.getUserInput()?.trim();
        
        if (!songName) {
            return await message.reply('Please provide a song name to fetch the lyrics.');
        }

        let apiUrl = `https://api.popcat.xyz/lyrics?song=${encodeURIComponent(songName)}`;
        let response = await axios.get(apiUrl);
        message.react('⏳');
        let data = response.data;

        if (data && data.lyrics) {
            let { title, image, artist, lyrics } = data;

            await message.client.sendMessage(message.jid, {
                text: `*Title:* ${title}\n*Artist:* ${artist}\n\n*Lyrics:*\n${lyrics}`,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: `Artist: ${artist}\nPowered by Axiom-Md,`,
                        renderLargerThumbnail: true,
                        thumbnailUrl: image,
                        mediaType: 1,
                        mediaUrl: image,
                        sourceUrl: image
                    }
                }
            });
            await message.react('✅');
            setTimeout(async () => {
              await message.react('');
            }, 3000);
        } else {
            await message.reply('No lyrics found.');
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        await message.reply('An error occurred while fetching the lyrics. Please try again later.');
    }
});


Index({
  pattern: 'modsearch',
  fromMe: true,
  desc: 'Search for apps on HappyMod',
  type: 'utility'
}, async (message, match) => {
  try {
    const query = message.getUserInput();

    if (!query) {
      return await message.reply('Please provide a search query. Usage: .modsearch <query>');
    }

    const processingReaction = await message.react('🔍');

    const apiUrl = `https://itzpire.com/search/happymod?query=${encodeURIComponent(query)}`;
    const response = await axios.get(apiUrl);

    if (response.data.status !== 'success' || !response.data.data.length) {
      await message.react('❌');
      await message.reply('No results found for your query. Please refine your search and try again.');
      setTimeout(async () => {
        await message.react('');
      }, 3000);
      return;
    }

    const results = response.data.data.slice(0, 5).map((item, index) => {
      return `*${index + 1}. ${item.title}*\nRating: ${item.rating}\n[Download Here](${item.link})`;
    }).join('\n');

    await message.reply(`*HappyMod Search Results for "${query}":*\n\n${results}`);
    await message.react('✅');
    setTimeout(async () => {
      await message.react('');
    }, 3000);

  } catch (error) {
    console.error('Error in modsearch command:', error);
    await message.react('❌');
    await message.reply('An error occurred while processing your request. Please try again later.');
  }
});


Index({
    pattern: 'ytv',
    fromMe: true,
    desc: 'Download YouTube videos',
    type: 'downloader'
}, async (message, match) => {
    let url = message.getUserInput();

    if (!url) {
        return await message.reply("Please provide a YouTube link.\n\nExample: ytv youtube.com/watch?v=xxxxx");
    }

    try {
        const processingReaction = await message.react('⏳');
        
        const videoData = await fg.ytv(url);
        console.log(videoData);
        
        if (!videoData || !videoData.dl_url) {
            await message.react('❌');
            await message.reply("Failed to fetch video information. Please try again.");
            setTimeout(async () => {
              await message.react('');
            }, 3000);
            return;
        }

        await message.react('📥');
        await message.client.sendMessage(message.jid, {
            video: { url: videoData.dl_url },
            caption: `🎥 *${videoData.title}*\n\n📁 *Size*: ${videoData.size}\n\n> Powered by Axiom-Md,`,
            mimetype: "video/mp4",
            fileName: `${videoData.title}.mp4`,
        });

        await message.react('✅');
        setTimeout(async () => {
          await message.react('');
        }, 3000);

    } catch (error) {
        console.error('Error:', error);
        await message.react('❌');
        await message.reply('An error occurred while processing your request.');
    }
});