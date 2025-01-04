const { getContentType, jidNormalizedUser,downloadMediaMessage, generateForwardMessageContent, generateWAMessageFromContent, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Base = require('./Base');
const ReplyMessage = require('./ReplyMessage');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const os = require('os');
const FileType = require('file-type'); // Import the whole module

function addFooter(text) {
    return `${text}\n\n> Powered by Axiom-Md`;
}

class Message extends Base {
    constructor(client, data) {
        super(client);
        if (data) { this.patch(data); }
    }

    patch(data) {
        this.user = this.client.user.id;""
        this.id = data.key?.id;
        this.jid = this.chat = data.key?.remoteJid;
        this.fromMe = data.key?.fromMe;
        this.sender = jidNormalizedUser(this.fromMe && this.client.user.id || this.participant || data.key.participant || this.chat || '');
        this.pushName = data.pushName || this.client.user.name || '';
        this.message = this.text = data.message?.extendedTextMessage?.text || data.message?.imageMessage?.caption || data.message?.videoMessage?.caption || data.message?.listResponseMessage?.singleSelectReply?.selectedRowId || data.message?.buttonsResponseMessage?.selectedButtonId || data.message?.templateButtonReplyMessage?.selectedId || data.message?.editedMessage?.message?.protocolMessage?.editedMessage?.conversation || data.message?.conversation;
        this.data = data;
        this.type = getContentType(data.message);
        this.timestamp = data.messageTimestamp;
            this.isForwarded = !!data.message?.extendedTextMessage?.contextInfo?.isForwarded;
            this.chatName = data.message?.extendedTextMessage?.contextInfo?.participant || '';
            this.mentionsEveryone = this.text?.includes('@everyone') || false;
            this.quotedStanzaId = data.message?.extendedTextMessage?.contextInfo?.stanzaId || null;
            this.isStatusUpdate = this.jid === 'status@broadcast';
            this.urls = this.text ? this.text.match(/https?:\/\/[^\s]+/g) || [] : [];
            this.hasMedia = !!data.message?.imageMessage || 
                            !!data.message?.videoMessage || 
                            !!data.message?.audioMessage || 
                            !!data.message?.documentMessage;
        
            this.mediaType = this.hasMedia ? (
                data.message?.imageMessage ? 'image' :
                data.message?.videoMessage ? 'video' :
                data.message?.audioMessage ? 'audio' :
                data.message?.documentMessage ? 'document' : null
            ) : null;
            this.fileName = data.message?.documentMessage?.fileName || null;
            this.isEphemeral = !!data.message?.messageContextInfo?.expiration;
            this.expirationTime = data.message?.messageContextInfo?.expiration || null;
            this.emojis = this.text ? this.text.match(/[\p{Emoji_Presentation}\p{Emoji}\u200d]+/gu) || [] : [];
            this.isPoll = !!data.message?.pollCreationMessage;
            if (this.isPoll) {
                this.pollQuestion = data.message.pollCreationMessage.name || '';
                this.pollOptions = data.message.pollCreationMessage.options.map(opt => opt.optionName) || [];
            }
        this.msg = data.message[this.type];
        this.mention = this.msg?.contextInfo?.mentionedJid || false;
        this.isGroup = this.chat.endsWith('@g.us');
        this.isPm = this.chat.endsWith('@s.whatsapp.net');
        this.isBot = this.id.startsWith('BAE5') && this.id.length === 16;
        const sudo = config.SUDO.split(',') || config.SUDO + ',0';
        this.isSudo = [jidNormalizedUser(this.client.user.id), ...sudo].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(this.sender);
        this.quoted = null;
        if (data.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            this.quoted = {
            key: data.message.extendedTextMessage.contextInfo.stanzaId,
            participant: data.message.extendedTextMessage.contextInfo.participant,
            message: data.message.extendedTextMessage.contextInfo.quotedMessage,
            };
            this.quotedIsBot = this.quoted.key?.startsWith('BAE5') && this.quoted.key?.length === 16;
            this.quotedType = getContentType(this.quoted.message);
            this.quotedMsg = this.quoted.message[this.quotedType];
            this.quotedText = this.quotedType === 'conversation' ? this.quotedMsg : 
                              this.quotedType === 'extendedTextMessage' ? this.quotedMsg.text :
                              this.quotedType === 'imageMessage' ? this.quotedMsg.caption :
                              this.quotedType === 'viewOnceMessage' ? this.quotedMsg.caption :
                              this.quotedType === 'viewOnceMessageV2' ? this.quotedMsg.caption :
                              this.quotedType === 'videoMessage' ? this.quotedMsg.caption : '';
            this.mediaType = this.quotedType === 'imageMessage' ? 'image' :
                             this.quotedType === 'videoMessage' ? 'video' :
                             this.quotedType === 'viewOnceMessage' ? 'image' :
                             this.quotedType === 'viewOnceMessageV2' ? 'image' : '';
        }
        this.command = this.text?.trim().split(/\s+/);
        return super.patch(data);
    }
    
    getUserInput() {
        if (this.command && this.command.length > 1) {
            return this.command.slice(1).join(' ').trim();
        }
        return '';
    }

    async sendFromUrl(url) {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer'
            });
    
            const contentType = response.headers['content-type'];
            const buffer = Buffer.from(response.data, 'binary');
            
            let type = 'document';
            if (contentType.includes('image')) type = 'image';
            if (contentType.includes('video')) type = 'video';
            if (contentType.includes('audio')) type = 'audio';
            
            await this.client.sendMessage(this.jid, {
                [type]: buffer,
                caption: this.text || '',
                mimetype: contentType
            });
    
            return true;
        } catch (error) {
            console.error('Error in sendFromUrl:', error);
            throw error;
        }
    }


    async download(){
      let bx = await downloadMediaMessage(this.quoted, "buffer", {} , this.client);
      return bx
    }
    
    async downloadMediaMessage() {
        try {
            let messageToDownload;

            if (this.hasMedia) {
                messageToDownload = this.data;
            } else if (this.quoted && (
                this.quotedType === 'imageMessage' || 
                this.quotedType === 'videoMessage' ||
                this.quotedType === 'stickerMessage'
            )) {
                messageToDownload = {
                    message: this.quoted.message,
                    key: this.quoted.key,
                    participant: this.quoted.participant
                };
            } else {
                throw new Error('No media found in the message or quoted message');
            }

            
            const buffer = await downloadMediaMessage(
                messageToDownload,
                'buffer',
                {},
                {
                    logger: console,
                    reuploadRequest: this.client.updateMediaMessage
                }
            );
            return buffer;
        } catch (error) {
            console.error('Error downloading media:', error);
            throw error;
        }
    }


    async downloadAndSaveMediaMessage(mediaMessage, filename, attachExtension = true) {
        try {
            let quoted = mediaMessage.msg ? mediaMessage.msg : mediaMessage;
            let mime = (mediaMessage.msg || mediaMessage).mimetype || '';
            let messageType = mediaMessage.mtype ? mediaMessage.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(quoted, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            const type = await FileType.fromBuffer(buffer); // Use the correct method name
            const ext = type ? type.ext : 'bin';
            const trueFileName = attachExtension ? `${filename}.${ext}` : filename;
            await fs.writeFile(trueFileName, buffer);
            return trueFileName;
        } catch (error) {
            console.error('Error downloading and saving media:', error);
            throw error;
        }
    }

    async reply(text, options = {}) {
        const Text = text;
        const message = await this.client.sendMessage(this.jid, { text: Text }, { quoted: this.data, ...options });
        return new Message(this.client, message);
    }


    async send(jid, text, opt = {}) {
        try {
            const recipient = jid ? jidNormalizedUser(jid) : this.jid;
            if (!recipient) {
                throw new Error('Recipient JID is not defined.');
            }

            const footerText = addFooter(text);
            const messageOptions = { text: footerText, ...opt };
            const sentMessage = await this.client.sendMessage(recipient, messageOptions);
            return new Message(this.client, sentMessage);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
    
    async delete() {
        return await this.client.sendMessage(this.jid, { delete: { ...this.data.key, participant: this.sender } });
    }

    async edit(text) {
        return await this.client.sendMessage(this.jid, { 
            text: text, 
            edit: this.data.key 
        });
    }

    async add(jid) {
        return await this.client.groupParticipantsUpdate(this.jid, jid, "add");
    }

    async sendMessage(jid, text, options = {}) {
        try {
            let messageOptions = { text };
            
            if (options.contextInfo) {
                messageOptions.contextInfo = options.contextInfo;
            }
    
            const message = await this.client.sendMessage(
                jid, 
                messageOptions,
                { ...options }
            );
            
            return new Message(this.client, message);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async sendMedia(options) {
        try {
            if (!options || !options.mimetype) {
                throw new Error('Invalid options or mimetype is not defined.');
            }
            
            let message;
            
            if (options.url) {
                message = {
                    image: { url: options.url },
                    caption: options.caption,
                    mimetype: options.mimetype
                };
            } else if (options.buffer) {
                message = {
                    image: options.buffer,
                    caption: options.caption,
                    mimetype: options.mimetype
                };
            } else {
                throw new Error('Either url or buffer must be provided.');
            }
    
            if (options.mimetype.startsWith('video')) {
                message.video = message.image;
                delete message.image;
            } else if (options.mimetype.startsWith('audio')) {
                message.audio = message.image;
                delete message.image;
            } else if (options.mimetype.startsWith('application')) {
                message.document = message.image;
                delete message.image;
            }   
            if (options.contextInfo) {
                message.contextInfo = options.contextInfo;
            }
    
            const sentMessage = await this.client.sendMessage(this.jid, message);
            return new Message(this.client, sentMessage);
        } catch (error) {
            console.error('Error sending media:', error);
            throw error;
        }
    }

    async getGroupMetadata(jid) {
        try {
            console.log('Fetching group metadata for JID:', jid);
            const metadata = await client.groupMetadata(jid);
            console.log('Group metadata fetched successfully');
            return metadata;
        } catch (error) {
            console.error('Error fetching group metadata:', error);
            return null;
        }
    }

    matchContent(pattern) {
        if (typeof pattern === 'string') {
            return this.message.includes(pattern);
        } else if (pattern instanceof RegExp) {
            return pattern.test(this.message);
        }
        return false;
    }

    createContextInfo(options = {}) {
        return {
            externalAdReply: {
                title: options.title || "JOSH",
                body: options.body || "",
                mediaType: options.mediaType || 1,
                renderLargerThumbnail: options.renderLargerThumbnail || false,
                showAdAttribution: options.showAdAttribution || true,
                sourceUrl: options.sourceUrl || "https://your-bot-website.com"
            }
        };
    }

    async kick(jid) {
        return await this.client.groupParticipantsUpdate(this.jid, [jid], "remove");
    }

    async pin() {
        try {
            await this.client.chatModify({
                pin: true
            }, this.jid, []);

            return 'Message pinned successfully.';
        } catch (error) {
            console.error('Error pinning message:', error);
            return 'Failed to pin the message. Please try again later.';
        }
    }

    async promote(jid) {
        try {
            await this.client.groupParticipantsUpdate(this.chat, [jid], 'promote');
            return `Promoted ${jid} successfully.`;
        } catch (error) {
            console.error('Error promoting participant:', error);
            return 'Failed to promote the participant. Please try again later.';
        }
    }

    async demote(jid) {
        try {
            await this.client.groupParticipantsUpdate(this.chat, [jid], 'demote');
            return `Demoted ${jid} successfully.`;
        } catch (error) {
            console.error('Error demoting participant:', error);
            return 'Failed to demote the participant. Please try again later.';
        }
    }

    async makeAdmin(jid) {
        try {
            await this.client.groupParticipantsUpdate(this.chat, [jid], 'promote');
            return `Made ${jid} an admin successfully.`;
        } catch (error) {
            console.error('Error making participant an admin:', error);
            return 'Failed to make the participant an admin. Please try again later.';
        }
    }

    async setPP(jid, pp) {
        const profilePicture = Buffer.isBuffer(pp) ? pp : { url: pp };
        await this.client.updateProfilePicture(jid, profilePicture);
    }

    async react(emoji) {
        try {
            await this.client.sendMessage(this.jid, {
                react: {
                    text: emoji,
                    key: this.data.key
                }
            });
        } catch (error) {
            console.error('Error reacting to message:', error);
            return 'Failed to react to the message. Please try again later.';
        }
    }

    isPollUpdate() {
        return !!this.data.message?.pollUpdateMessage;
    }

    createPoll(name, options) {
        return this.client.sendMessage(this.jid, {
            poll: {
                name: name,
                values: options,
                selectableCount: 1
            }
        });
    }
}

module.exports = Message;
