const axios = require('axios');

const clean = (data) => {
    if (!data) return '';
    let regex = /(<([^>]+)>)/gi;
    data = data.replace(/(<br?\s?\/>)/gi, " \n");
    return data.replace(regex, "");
  };
  
  
  async function shortener(url) {
    return url;
  }
  
  
  async function Tiktok(url) {
    const validUrlPattern = /^(https?:\/\/)?(www\.)?(tiktok\.com\/@[\w.]+\/video\/\d+|vm\.tiktok\.com\/[\w\d]+)/;
    if (!validUrlPattern.test(url)) {
      throw new Error('Invalid TikTok URL');
    }
  
    console.log('Extracted URL:', url);
  
    try {
      let response = await axios.post("https://lovetik.com/api/ajax/search", new URLSearchParams({ query: url }));
  
  
      if (response.data.status !== 'ok') {
        throw new Error(response.data.mess || 'Invalid response data');
      }
  
      let result = {};
  
      result.creator = "";
      result.title = clean(response.data.desc);
      result.author = clean(response.data.author);
      result.nowm = await shortener(
        (response.data.links[0]?.a || "").replace("https", "http")
      );
      result.watermark = await shortener(
        (response.data.links[1]?.a || "").replace("https", "http")
      );
      result.audio = await shortener(
        (response.data.links[2]?.a || "").replace("https", "http")
      );
      result.thumbnail = await shortener(response.data.cover);
      return result;
  
    } catch (error) {
      console.error('Error fetching TikTok data:', error);
      throw error;
    }
  }

  // YouTube

  async function ytdlget(url) {
    return new Promise((resolve, reject) => {
        let qu = "query=" + encodeURIComponent(url);

        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://tomp3.cc/api/ajax/search",
            headers: {
                accept: "*/*",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            data: qu,
        };

        axios.request(config)
            .then((response) => {
                resolve(response.data);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function formatYtdata(data, options) {
    const { type, quality } = options;
    const formatted_data = [];

    const processFormat = (format) => {
        const info = {
            vid: data.vid,
            id: format.k,
            size: format.size,
            quality: format.q,
            type: format.f,
        };
        formatted_data.push(info);
    };

    Object.values(data.links.mp4).forEach(processFormat);
    processFormat(data.links.mp3.mp3128);
    processFormat(data.links["3gp"]["3gp@144p"]);
    let formatted = formatted_data;
    if (type) {
        formatted = formatted_data.filter((format) => format.type === type);
    }
    if (quality) {
        formatted = formatted_data.filter((format) => format.quality === quality);
    }
    return formatted;
}

async function ytdlDl(vid, k) {
    const data = `vid=${vid}&k=${encodeURIComponent(k)}`;

    const config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://tomp3.cc/api/ajax/convert",
        headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        data: data,
    };

    try {
        const response = await axios.request(config);
        return response.data;
    } catch (error) {
        console.error(error);
        throw new Error("An error occurred during the request");
    }
}

async function ytv(url, quality = "480p") {
    const data = await ytdlget(url);
    const formatted_data = formatYtdata(data, { type: "mp4", quality });
    const k = formatted_data[0].id;
    const vid = formatted_data[0].vid;
    let response = await ytdlDl(vid, k);
    response = {
        ...response,
        sizes: formatted_data[0].size,
        thumb: `https://i.ytimg.com/vi/${vid}/0.jpg`,
    };
    return response;
}

  module.exports={Tiktok,ytv}