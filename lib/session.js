const axios = require('axios');
const fs = require('fs');
const { writeFile } = require('fs/promises');

    async function MakeSession(session_id, authFile) {
        try {
            const response = await axios.get(`https://session-wine.vercel.app/retrieve/${session_id}`, {
                headers: {
                    'x-api-key': '8dEZvgJU6Ew2LRoa1zniL0iAUVEtDRGY', 
                },
            });
            const base64Data = response.data.base64Data;
            const decodedData = Buffer.from(base64Data, 'base64');
            await writeFile(authFile, decodedData);

            console.log('Auth file successfully loaded!');
        } catch (err) {
            console.error('Error retrieving session:', err);
            throw err;
        }
    }

    module.exports={
        MakeSession
    }

