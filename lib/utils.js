const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config');
const BodyForm = require('form-data');

exports.getJson = async (url, options = {}) => {
	try {
		const response = await axios({
			method: 'GET',
			url: url,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
			},
			...options
		})
		return response.data;
	} catch (error) {
		return error;
	}
}

exports.postJson = async (url, postData, options = {}) => {
	try {
		const response = await axios.request({
			url: url,
			data: JSON.stringify(postData),
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			...options
		});
		return response.data;
	} catch (error) {
		return error;
	}
}

exports.writeJsonFiles = function(jsonObj, directoryPath) {
	for (const key in jsonObj) {
		if (jsonObj.hasOwnProperty(key)) {
			const filename = key + '.json';
			const filePath = path.join(directoryPath, filename);
			const content = JSON.stringify(jsonObj[key], null, 2);
			fs.writeFile(filePath, content, 'utf8', () => {});
		}
	}
}


exports.formatTime = function(seconds) {
  seconds = Number(seconds);
  var d = Math.floor(seconds / (3600 * 24));
  var h = Math.floor((seconds % (3600 * 24)) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = Math.floor(seconds % 60);
  var dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
  var hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
  var mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
  var sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
}

exports.sleep = async (ms) => {
return new Promise(resolve => setTimeout(resolve, ms));
}

exports.parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
}


exports.fetchBuffer = async (url, options) => {
	try {
		options ? options : {}
		const res = await axios({
			method: "GET",
			url,
			headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36",
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (err) {
		return err
	}
}

exports.TelegraPh = function (Path) {
    return new Promise(async (resolve, reject) => {
        if (!fs.existsSync(Path)) return reject(new Error("File not Found"));
        try {
            const form = new BodyForm();
            form.append("file", fs.createReadStream(Path));
            const data = await axios({
                url: "https://telegra.ph/upload",
                method: "POST",
                headers: {
                    ...form.getHeaders()
                },
                data: form
            });
            return resolve("https://telegra.ph" + data.data[0].src);
        } catch (err) {
            return reject(new Error(String(err)));
        }
    });
};


const decodeJid = (jid) => {
	if (!jid) return jid;
	if (/:\d+@/gi.test(jid)) {
	  const decode = jidDecode(jid) || {};
	  return decode.user && decode.server
		? `${decode.user}@${decode.server}`
		: jid;
	} else {
	  return jid;
	}
  };


exports.isAdmin = async function isAdmin(client, groupId) {
	try {
	  const group = await client.groupMetadata(groupId);
	  return group.participants
		.filter(participant => participant.admin !== null)
		.map(participant => participant.id);
	} catch (error) {
	  console.error('Error fetching group metadata:', error);
	  return [];
	}
  };

  exports.ssweb = (url, device = 'desktop') => {
     return new Promise((resolve, reject) => {
          const base = 'https://www.screenshotmachine.com'
          const param = {
            url: url,
            device: device,
            cacheLimit: 0
          }
          axios({url: base + '/capture.php',
               method: 'POST',
               data: new URLSearchParams(Object.entries(param)),
               headers: {
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
               }
          }).then((data) => {
               const cookies = data.headers['set-cookie']
               if (data.data.status == 'success') {
                    axios.get(base + '/' + data.data.link, {
                         headers: {
                              'cookie': cookies.join('')
                         },
                         responseType: 'arraybuffer'
                    }).then(({ data }) => {
                        result = {
                            status: 200,
                            result: data
                        }
                         resolve(result)
                    })
               } else {
                    reject({ status: 404, statuses: `Link Error`, message: data.data })
               }
          }).catch(reject)
     })
}
  

exports.numToJid = num => num + '@s.whatsapp.net';
exports.sudoIds = async (client) => (await client.onWhatsApp(...config.SUDO.split(',').concat(client.user.id))).map(({ jid }) => jid);
