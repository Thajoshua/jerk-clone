const { Index} = require('../lib/');
const {getBuffer} = require('../lib/utils')
const axios = require('axios');
const { getVideoInfo, getDownloadLink } = require('../lib/youtube');


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
  pattern: 'pin',
  fromMe: true,
  desc: 'Download Pinterest images. Usage: .pin query count',
  type: 'downloader'
}, async (message, match) => {
  const input = message.getUserInput().split(' ');
  
  const count = !isNaN(input[input.length - 1]) ? parseInt(input.pop()) : 5;
  const query = input.join(' ');
  
  if (!query) {
    return message.reply('_Please provide a search query\nUsage: .pin query count\nExample: .pin dogs 3_');
  }

  try {
    const searchUrl = `https://ideal-robot-production.up.railway.app/pinterest?q=${encodeURIComponent(query)}&count=${count}`;
    const response = await axios.get(searchUrl);
    const results = response.data.results;

    if (!results || results.length === 0) {
      return message.reply('_No images found for your search_');
    }

    await message.reply(`_Downloading ${results.length} Pinterest images for "${query}"..._`);
    for (let i = 0; i < results.length; i++) {
      try {
        const result = results[i];
        const imageResponse = await axios.get(result.url, {
          responseType: 'arraybuffer'
        });

        const caption = `*Pinterest Image ${i + 1}/${results.length}*\n` +
                       `Title: ${result.title || 'Untitled'}\n` +
                       `Search: ${query}`;

        await message.client.sendMessage(message.jid, {
          image: Buffer.from(imageResponse.data),
          caption: caption
        });

      } catch (imageError) {
        console.error(`_Error sending image ${i + 1}:_`, imageError);
        await message.reply(`_Failed to send image ${i + 1}_`);
      }
    }

  } catch (error) {
    console.error('_Error fetching Pinterest results:_', error);
    await message.reply('_Error fetching Pinterest results. Please try again later_');
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
  pattern: 'song',
  fromMe: true,
  desc: 'Download songs',
  type: 'downloader'
}, async (message, match) => {
  const query = message.getUserInput();
  
  if (!query) {
    return message.reply('Please provide a song name\nExample: .song heat waves');
  }

  try {
    const processingMsg = await message.reply('Searching...');
    
    const searchUrl = `https://ideal-robot-production.up.railway.app/search?q=${encodeURIComponent(query)}`;
    const searchResponse = await axios.get(searchUrl);
    
    if (!searchResponse.data?.results?.videos || searchResponse.data.results.videos.length === 0) {
      return message.reply('No results found');
    }

    const firstResult = searchResponse.data.results.videos[0];
    const videoUrl = firstResult.url.trim();
    const title = firstResult.title;
    const duration = firstResult.duration;
    const author = firstResult.author;

    await processingMsg.edit(`Downloading ${title}...`);


    const downloadUrl = `https://ideal-robot-production.up.railway.app/ytaudio?url=${encodeURIComponent(videoUrl)}`;
    const audioResponse = await axios.get(downloadUrl);
    
    if (!audioResponse.data?.result?.downloadUrl) {
      return message.reply('Failed to get download URL');
    }

    const audioBuffer = await getBuffer(audioResponse.data.result.downloadUrl);
    
    if (!audioBuffer) {
      return message.reply('Failed to download audio');
    }

    const caption = `Title: ${title}\n` +
                   `Channel: ${author}\n` +
                   `Duration: ${duration}\n` +
                   `Requested by: ${message.sender.split('@')[0]}`;


    await message.client.sendMessage(message.jid, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      caption: caption
    });


  } catch (error) {
    console.error('Error:', error);
    return message.reply('Error downloading song. Please try again.', { quoted: message });
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

Index({
  pattern: 'ytdl ?(.*)',
  fromMe: true,
  desc: 'Download YouTube videos. Usage: ytdl URL [quality]. Example: ytdl https://youtube.com/... 720p',
  type: 'downloader'
}, async (message, match) => {
  const [url, requestedQuality] = match[1].split(' ');
  
  if (!url) return await message.reply("*Please provide a YouTube URL!*\nUsage: ytdl URL [quality]");
  
  try {
    await message.react('⏳');
    const video = await getVideoInfo(url);
    
    const availableQualities = [...new Set(video.formats.video.map(f => f.quality))];
    
    if (!requestedQuality || !availableQualities.includes(requestedQuality)) {
      const qualityList = availableQualities
        .map(q => `• ${q}`)
        .join('\n');
      
      return await message.reply(
        `*Available Qualities for "${video.title}"*\n\n${qualityList}\n\nUsage: ytdl ${url} [quality]\nExample: ytdl ${url} 720p`
      );
    }
    
    const selectedFormat = video.formats.video.find(f => f.quality === requestedQuality);
    
    if (!selectedFormat) {
      await message.reply(`Error: Quality ${requestedQuality} not available for this video.`);
      await message.react('❌');
      return;
    }

    const downloadLink = await getDownloadLink(video.id, selectedFormat.id);
    const fileSizeMB = (selectedFormat.filesize / (1024 * 1024)).toFixed(2);
    
    await message.reply(
      `Downloading ${video.title} (${fileSizeMB} MB, ${selectedFormat.quality})`
    );
  
    await message.client.sendMessage(message.jid, {
      video: { url: downloadLink },
      caption: video.title,
      mimetype: 'video/mp4',
    });
    
    await message.react('✅');
    setTimeout(() => message.react(''), 3000);
    
  } catch (error) {
    console.error('YTDL Error:', error);
    await message.react('❌');
    await message.reply(`Error: ${error.message}`);
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