const axios = require('axios');

const getVideoId = (videoUrl) => {
    if (videoUrl.includes('watch?v=')) {
        const id = videoUrl.split('watch?v=')[1] || '';
        return id ? id.split('&')[0] : null;
    }
    if (videoUrl.includes('youtu.be/')) {
        const id = videoUrl.split('youtu.be/')[1] || '';
        return id ? id.split('&')[0] : null;
    }
    if (videoUrl.includes('shorts/')) {
        const id = videoUrl.split('shorts/')[1] || '';
        return id ? id.split('&')[0] : null;
    }
    return null;
};


const fetchVideoData = async (url) => {
    try {
        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch data');
    }
};


const getVideoInfo = async (url) => {
    const videoId = getVideoId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    const videoData = await fetchVideoData(`https://api.y2matego.com/yt/${videoId}`);
    if (videoData.error) {
        throw new Error('Failed to fetch video details');
    }

    const videoFormats = videoData.data.formats
        .filter((f) => f.type === 'videos')
        .map((f) => ({
            id: f.id,
            quality: f.format,
            filesize: f.filesize,
        }));

    const audioFormats = videoData.data.formats
        .filter((f) => f.type === 'audios')
        .map((f) => ({
            id: f.id,
            quality: f.format,
            filesize: f.filesize,
        }));

    return {
        id: videoId,
        title: videoData.data.name,
        duration: videoData.data.duration,
        thumbnail: videoData.data.thumbnail,
        formats: {
            video: videoFormats,
            audio: audioFormats,
        },
    };
};


const getDownloadLink = async (videoId, formatId, type = 'video') => {
    if (!['video', 'audio'].includes(type)) {
        throw new Error('Invalid type parameter. Must be "video" or "audio"');
    }

    const endpoint =
        type === 'video'
            ? `https://api.y2matego.com/yt/${videoId}/videos/${formatId}`
            : `https://api.y2matego.com/yt/${videoId}/audios/${formatId}`;

    const downloadData = await fetchVideoData(endpoint);

    if (downloadData.error) {
        throw new Error('Failed to get download URL');
    }

    if (downloadData.status === 200) {
        return downloadData.data;
    }

    while (true) {
        const statusResult = await fetchVideoData(
            `https://api.y2matego.com/yt/${videoId}/status/${downloadData.data}`
        );

        if (statusResult.error) {
            throw new Error('Failed to check status');
        }

        if (statusResult.status === 200) {
            return statusResult.data;
        }

        if (statusResult.status !== 102) {
            throw new Error('Processing failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
};

module.exports = {
    getVideoInfo,
    getDownloadLink,
};
