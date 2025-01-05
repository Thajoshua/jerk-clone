const { Index} = require('../lib/');
const fg = require('api-dylux');
const axios = require('axios');
const { index, log } = require('mathjs');

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
  pattern: 'tikvideo', 
  fromMe: true,
  desc: 'Download TikTok video using the link provided.',
  type: 'download'
}, async (message, match) => {
  const link = message.getUserInput();

  if (!link) {
    return await message.reply('Please provide a TikTok video link.');
  }

  try {
    const url = `https://popular-anastassia-dolnard285-511c3281.koyeb.app/Tiktok?url=${encodeURIComponent(link)}`;
    const response = await axios.get(url);
  
    const videoData = response.data.result.data;
    const videoUrl = videoData.play;

    const caption = `${videoData.title}`

    await message.reply(`Downloading video of \n\n ${videoData.title}`);
    await message.sendMedia({
      url: videoUrl,
      mimetype: 'video/mp4',
      caption: caption,
      contextInfo: {
        externalAdReply: {
          title: videoData.title,
          body: `Creator: ${response.data.creator}`,
          renderLargerThumbnail: true,
          thumbnailUrl: videoData.cover,
          mediaType: 1,
          mediaUrl: videoData.cover,
        }
      }
    });
  } catch (error) {
    await message.reply(error.message);
  }
});

Index({
  pattern: 'tikaudio', 
  fromMe: true,
  desc: 'Download TikTok audio using the link provided.',
  type: 'download'
}, async (message, match) => {
  const link = message.getUserInput();

  if (!link) {
    return await message.reply('Please provide a TikTok video link.');
  }

  try {
    const url = `https://popular-anastassia-dolnard285-511c3281.koyeb.app/Tiktok?url=${encodeURIComponent(link)}`;
    const response = await axios.get(url);
  
    const videoData = response.data.result.data;
    const audioUrl = videoData.music;

    await message.reply(`Downloading audio of \n\n ${videoData.title}`);
    await message.sendMedia({
      url: audioUrl,
      mimetype: 'audio/mpeg',
      contextInfo: {
        externalAdReply: {
          title: videoData.title,
          body: `Creator: ${response.data.creator}`,
          renderLargerThumbnail: true,
          thumbnailUrl: videoData.cover,
          mediaType: 1,
          mediaUrl: videoData.cover,
        }
      }
    });
  } catch (error) {
    await message.reply(error.message);
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
      return await message.reply('Please provide a search query.');
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


const { getVideoInfo, getDownloadLink } = require('../lib/youtube');


Index({
    on: 'message',
    fromMe: false,
    dontAddCommandList: true
}, async (message) => {
    if (global.waiting && global.waiting.jid === message.jid) {
        global.waiting.resolve(message);
        global.waiting = null;
    }
});

Index({
    pattern: 'ytdl',
    fromMe: true,
    desc: 'Download YouTube videos with quality selection',
    type: 'downloader'
}, async (message, match) => {
    const url = message.getUserInput();
    if (!url) return await message.reply("*Please provide a YouTube URL!*");

    try {
        await message.react('⏳');
        const video = await getVideoInfo(url);
        
        const qualities = video.formats.video
            .map((f, i) => `${i + 1}. ${f.quality} (${(f.filesize / (1024 * 1024)).toFixed(2)} MB)`)
            .join('\n');

        await message.reply(
            `*🎥 ${video.title}*\n\n` +
            `*Duration:* ${video.duration}\n\n` +
            `*Available Qualities:*\n${qualities}\n\n` +
            `Reply with number to download (1-${video.formats.video.length})`
        );

        global.waiting = {
            jid: message.jid,
            resolve: null
        };

        const response = await new Promise((resolve, reject) => {
            global.waiting.resolve = resolve;
            setTimeout(() => {
                if (global.waiting) {
                    global.waiting = null;
                    reject(new Error('Response timeout'));
                }
            }, 30000); 
        });

        if (!response || isNaN(response.text)) {
            await message.reply('Invalid selection! Process cancelled.');
            return;
        }

        const choice = parseInt(response.text) - 1;
        if (choice < 0 || choice >= video.formats.video.length) {
            await message.reply('Invalid quality number! Process cancelled.');
            return;
        }

        await message.react('📥');
        const selectedFormat = video.formats.video[choice];
        const downloadLink = await getDownloadLink(video.id, selectedFormat.id);
        console.log('Download link:', downloadLink);
        console.log('Download link:', video);

        await message.sendMedia({
            video: { url: downloadLink.url },
            caption: `*${video.title}*\n\n` +
                    `*Quality:* ${selectedFormat.quality}\n` +
                    `*Size:* ${(selectedFormat.filesize / (1024 * 1024)).toFixed(2)} MB\n\n` +
                    `> Powered by Axiom-Md`,
            mimetype: 'video/mp4'
        });

        await message.react('✅');
        setTimeout(() => message.react(''), 3000);

    } catch (error) {
        console.error('YTDL Error:', error);
        await message.react('❌');
        await message.reply(`Error: ${error.message}`);
        global.waiting = null;
    }
});


Index({
  pattern: 'igdl',
  fromMe: true,
  desc: 'Download Instagram videos/photos',
  type: 'downloader'
}, async (message, match) => {
  const link = message.getUserInput();
  
  if (!link) {
      return await message.reply('Please provide an Instagram link.');
  }

  try {
      await message.react('⏳');
      const url = `https://popular-anastassia-dolnard285-511c3281.koyeb.app/instagram?url=${encodeURIComponent(link)}`;
      const response = await axios.get(url);
      
      if (!response.data.result) {
          throw new Error('Failed to fetch media');
      }

      const mediaData = response.data.result;
      await message.reply(`_*Downloading*_`);
      
      if (mediaData.videoUrl) {
          await message.client.sendMessage(message.jid,{
              video: { url: mediaData.videoUrl},
              caption: mediaData.title || 'Powered by Axiom-Md',
              mimetype: 'video/mp4',
              contextInfo: {
                  externalAdReply: {
                      title: 'Instagram Video',
                      body: `Creator: Master-j`,
                      renderLargerThumbnail: true,
                      thumbnailUrl: mediaData.thumbnail,
                      mediaType: 1,
                      mediaUrl: mediaData.thumbnail,
                  },
              }
          });
      } 
      await message.react('✅');
      setTimeout(() => message.react(''), 3000);

  } catch (error) {
      console.error('Instagram Download Error:', error);
      await message.react('❌');
      await message.reply('Error downloading media: ' + error.message);
  }
});