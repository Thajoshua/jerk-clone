const { Index, mode } = require('../lib/');
const axios = require('axios');
const { isAdmin } = require('../lib/utils');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const { WelcomeSetting } = require('../database/database');
const config = require('../config');

const welcomeDB = new Map();
const userWarnings = new Map();

Index({
    pattern: 'antispam',
    fromMe: true,
    desc: 'Set antispam settings for the group',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) {
        await message.reply('This command can only be used in a group.');
        return;
    }
    const input = message.getUserInput();
    const [action, limit, duration] = input.split(' ');
    if (!action || !['kick', 'warn', 'delete'].includes(action) || !limit || !duration) {
        await message.reply('Usage: .antispam <action> <limit> <duration>\nActions: kick, warn, delete\nExample: .antispam warn 5 30');
        return;
    }
    message.client.antispam = message.client.antispam || {};
    message.client.antispam[message.jid] = { action, limit: parseInt(limit), duration: parseInt(duration) };
    await message.reply(`Antispam settings updated. Action: ${action}, Limit: ${limit} messages, Duration: ${duration} seconds`);
});

async function handleAntispam(message) {
    if (!message.isGroup || !message.client.antispam || !message.client.antispam[message.jid]) return;
    const settings = message.client.antispam[message.jid];
    const now = Date.now();
    if (!userWarnings.has(message.jid)) userWarnings.set(message.jid, new Map());
    const groupWarnings = userWarnings.get(message.jid);
    if (!groupWarnings.has(message.sender)) {
        groupWarnings.set(message.sender, { count: 1, timestamp: now });
    } else {
        const userWarning = groupWarnings.get(message.sender);
        if (now - userWarning.timestamp > settings.duration * 1000) {
            userWarning.count = 1;
            userWarning.timestamp = now;
        } else {
            userWarning.count++;
        }
        if (userWarning.count > settings.limit) {
            switch (settings.action) {
                case 'kick':
                    await message.kick(message.sender);
                    await message.reply(`@${message.sender.split('@')[0]} has been kicked for spamming.`);
                    break;
                case 'warn':
                    await message.reply(`@${message.sender.split('@')[0]}, this is a warning. Stop spamming or you may be kicked.`);
                    break;
                case 'delete':
                    await message.delete();
                    break;
            }
            groupWarnings.delete(message.sender);
        }
    }
}

Index({
    pattern: 'add ?(.*)',
    fromMe: true,
    desc: 'Add members to the group',
    type: 'group'
}, async (message, match) => {
    if (!message.isGroup) {
        return await message.reply('This command can only be used in groups.');
    }

    // Check if bot is admin
    const groupMetadata = await message.client.groupMetadata(message.jid);
    const botId = message.client.user.id.split(':')[0];
    const botIsAdmin = groupMetadata.participants.some(p => 
        (p.id.split('@')[0] === botId.split('@')[0]) && 
        (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!botIsAdmin) {
        return await message.reply("I'm not an admin.");
    }

    // Get numbers to add
    let numbers;
    if (message.quoted) {
        numbers = [message.quoted.participant];
    } else {
        const input = message.getUserInput();
        if (!input) {
            return await message.reply('Enter the numbers you want to add separated by commas.');
        }
        numbers = input.replace(/[^0-9,]/g, '').split(',').map(num => num.trim());
    }

    if (!numbers || numbers.length === 0) {
        return await message.reply("Please provide valid numbers to add.");
    }

    // Convert numbers to WhatsApp format
    const formattedNumbers = numbers.map(num => `${num}@s.whatsapp.net`);

    // Check if numbers exist on WhatsApp
    const onWhatsApp = await message.client.onWhatsApp(...formattedNumbers);
    const validNumbers = onWhatsApp
        .filter(contact => contact.exists)
        .map(contact => contact.jid)
        .filter(jid => jid !== message.client.user.jid);

    if (!validNumbers || validNumbers.length === 0) {
        return await message.reply("These numbers don't exist on WhatsApp.");
    }

    // Status messages
    const messages = {
        '403': "Couldn't add. Invite sent!",
        '408': "Couldn't add because they left the group recently. Try again later.",
        '401': "Couldn't add because they blocked the bot number.",
        '200': "Added to the group.",
        '409': "Already in the group."
    };

    try {
        // Add participants
        const results = await message.client.groupParticipantsUpdate(message.jid, validNumbers, 'add');
        
        // Prepare response message
        let responseMsg = '';
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const number = validNumbers[i].split('@')[0];
            const status = result.status || '200';
            responseMsg += `@${number}: ${messages[status]}\n`;
        }

        // Send response with mentions
        await message.client.sendMessage(message.jid, {
            text: responseMsg.trim(),
            mentions: validNumbers
        });

    } catch (error) {
        console.error('Error adding members:', error);
        await message.reply('Failed to add members. Make sure the numbers are valid and the bot has permission.');
    }
});

Index({
    pattern: 'kick',
    fromMe: true,
    desc: 'Kick a user from the group',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) {
        return await message.reply('This command can only be used in groups.');
    }

    // Check if bot is admin
    const groupMetadata = await message.client.groupMetadata(message.jid);
    const botId = message.client.user.id.split(':')[0];
    const botIsAdmin = groupMetadata.participants.some(p => 
        (p.id.split('@')[0] === botId.split('@')[0]) && 
        (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!botIsAdmin) {
        return await message.reply("I'm not an admin.");
    }

    // Handle replied message
    if (message.quoted) {
        if (message.quoted.participant === message.client.user.id) {
            return false; // Don't kick if it's bot's message
        }
        
        try {
            await message.client.sendMessage(message.jid, {
                text: `@${message.quoted.participant.split('@')[0]}, Kicked From The Group`,
                mentions: [message.quoted.participant]
            });
            
            await message.client.groupParticipantsUpdate(
                message.jid, 
                [message.quoted.participant], 
                'remove'
            );
        } catch (error) {
            console.error('Error kicking user:', error);
            return await message.reply('Failed to kick the user.');
        }
    }
    // Handle mentioned users
    else if (message.mentions && message.mentions.length > 0) {
        try {
            let mentionText = '';
            message.mentions.forEach(user => {
                mentionText += `@${user.split('@')[0]},`;
            });

            await message.client.sendMessage(message.jid, {
                text: `${mentionText} Kicked From The Group`,
                mentions: message.mentions
            });

            await message.client.groupParticipantsUpdate(
                message.jid,
                message.mentions,
                'remove'
            );
        } catch (error) {
            console.error('Error kicking mentioned users:', error);
            return await message.reply('Failed to kick mentioned users.');
        }
    }
    // If no user is specified
    else {
        return await message.reply('*Give me a user!*\nReply to a message or mention users to kick.');
    }
});


Index({
    pattern: 'promote',
    fromMe: true,
    desc: 'Promote a member to admin',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    try {
        const groupMetadata = await message.client.groupMetadata(message.jid);
        const botId = message.client.user.id.split(':')[0];
        const participants = groupMetadata.participants || [];
        const botIsAdmin = participants.some(p => 
            (p.id.split('@')[0] === botId.split('@')[0]) && 
            (p.admin === 'admin' || p.admin === 'superadmin')
        );
        if (!botIsAdmin) {
            return await message.reply('I need to be an admin to promote members.');
        }
        if (!message.quoted) return await message.reply('Please reply to the message of the user you want to promote.');
        await message.client.groupParticipantsUpdate(
            message.jid, 
            [message.quoted.participant || message.quoted.sender], 
            'promote'
        );
        await message.reply('User promoted to admin successfully.');
    } catch (error) {
        console.error('Error promoting user:', error);
        await message.reply('Failed to promote user. Make sure I have permission to promote members.');
    }
});


Index({
    pattern: 'demote',
    fromMe: true,
    desc: 'Promote a member to admin',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    try {
        const groupMetadata = await message.client.groupMetadata(message.jid);
        const botId = message.client.user.id.split(':')[0];
        const participants = groupMetadata.participants || [];
        const botIsAdmin = participants.some(p => 
            (p.id.split('@')[0] === botId.split('@')[0]) && 
            (p.admin === 'admin' || p.admin === 'superadmin')
        );
        if (!botIsAdmin) {
            console.log('Bot admin status check failed');
            return await message.reply('I need to be an admin to demote members.');
        }
        if (!message.quoted) return await message.reply('Please reply to the message of the user you want to demote.');
        await message.client.groupParticipantsUpdate(
            message.jid, 
            [message.quoted.participant || message.quoted.sender], 
            'demote'
        );
        await message.reply('User demote to member successfully.');
    } catch (error) {
        console.error('Error demoting user:', error);
        await message.reply('Failed to demote user. Make sure I have permission to demote members.');
    }
});



Index({
    pattern: 'mute',
    fromMe: true,
    desc: 'Mute the group (only admins can send messages)',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to mute the group.');
    try {
        await message.client.groupSettingUpdate(message.jid, 'announcement');
        await message.reply('Group muted. Only admins can send messages now.');
    } catch (error) {
        await message.reply('Failed to mute the group. Make sure I have permission to change group settings.');
    }
});


Index({
    pattern: 'automute',
    fromMe: true,
    desc: 'Schedule automatic muting of the group (only admins can send messages)',
    type: 'group'
}, async (message, match) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to mute the group.');
    const [startTime, endTime] =  message.getUserInput().trim().split(',');
    if (!startTime || !endTime) return await message.reply('Please provide start and end times in 24-hour format. Example: .automute 22:00,06:00');

    try {
        const start = moment.tz(startTime, 'HH:mm', 'Africa/Lagos');
        const end = moment.tz(endTime, 'HH:mm', 'Africa/Lagos');
        schedule.scheduleJob(`${start.minutes()} ${start.hours()} * * *`, async () => {
            await message.client.groupSettingUpdate(message.jid, 'announcement');
            await message.reply('Group auto-muted. Only admins can send messages now.');
        });
        schedule.scheduleJob(`${end.minutes()} ${end.hours()} * * *`, async () => {
            await message.client.groupSettingUpdate(message.jid, 'not_announcement');
            await message.reply('Group auto-unmuted. Everyone can send messages now.');
        });
        await message.reply(`Auto-mute scheduled. Group will be muted from ${startTime} to ${endTime} (Nigeria time) daily.`);
    } catch (error) {
        await message.reply('Failed to schedule auto-mute. Make sure the time format is correct and I have permission to change group settings.');
    }
});


Index({
    pattern: 'unmute',
    fromMe: true,
    desc: 'Unmute the group (allow all participants to send messages)',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to unmute the group.');
    try {
        await message.client.groupSettingUpdate(message.jid, 'not_announcement');
        await message.reply('Group unmuted. All participants can send messages now.');
    } catch (error) {
        await message.reply('Failed to unmute the group. Make sure I have permission to change group settings.');
    }
});


Index({
    pattern: 'invite',
    fromMe: true,
    desc: 'Get the group invite link',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to get the invite link.');
    try {
        const inviteCode = await message.client.groupInviteCode(message.jid);
        await message.reply(`https://chat.whatsapp.com/${inviteCode}`);
    } catch (error) {
        await message.reply('Failed to get the invite link. Make sure I have permission to do this.');
    }
});


Index({
    pattern: 'subject ?(.*)',
    fromMe: true,
    desc: 'Change the group subject (name)',
    type: 'group'
}, async (message, match) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to change the group subject.');
    const newSubject = message.getUserInput();
    if (!newSubject) return await message.reply('Please provide the new group subject.');
    
    try {
        await message.client.groupUpdateSubject(message.jid, newSubject);
        await message.reply(`Group subject changed to: ${newSubject}`);
    } catch (error) {
        await message.reply('Failed to change the group subject. Make sure I have permission to do this.');
    }
});


Index({
    pattern: 'desc ?(.*)',
    fromMe: true,
    desc: 'Change the group description',
    type: 'group'
}, async (message, match) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to change the group description.');
    const newDesc = message.getUserInput();
    if (!newDesc) return await message.reply('Please provide the new group description.');
    try {
        await message.client.groupUpdateDescription(message.jid, newDesc);
        await message.reply('Group description updated successfully.');
    } catch (error) {
        await message.reply('Failed to change the group description. Make sure I have permission to do this.');
    }
});


Index({
    pattern: 'groupinfo',
    fromMe: true,
    desc: 'Get detailed information about the group',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    try {
        const groupMetadata = await message.client.groupMetadata(message.jid);
        const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        let infoText = `*Group Name:* ${groupMetadata.subject}\n`;
        infoText += `*Group ID:* ${groupMetadata.id}\n`;
        infoText += `*Created On:* ${new Date(groupMetadata.creation * 1000).toLocaleString()}\n`;
        infoText += `*Created By:* ${groupMetadata.owner}\n`;
        infoText += `*Participant Count:* ${groupMetadata.participants.length}\n`;
        infoText += `*Admin Count:* ${admins.length}\n`;
        infoText += `*Description:* ${groupMetadata.desc}\n`;
        await message.reply(infoText);
    } catch (error) {
        await message.reply('Failed to get group information.');
    }
});



Index({
    pattern: 'tagall ?(.*)',
    fromMe: true,
    desc: 'Tag all group members',
    type: 'group'
}, async (message, match) => {
    if (!message.isGroup) {
        return await message.reply('This command can only be used in groups.');
    }
    try {
        const groupMetadata = await message.client.groupMetadata(message.jid);
        const participants = groupMetadata.participants;
        const mentionedJid = participants.map(p => p.id);

        const customMessage = match || 'Group Announcement';

        let teks = `*${customMessage}*\n\n`;
        
        for (let i = 0; i < participants.length; i++) {
            const member = participants[i];
            teks += `@${member.id.split('@')[0]}\n`;
        }

        await message.client.sendMessage(message.jid, {
            text: teks,
            mentions: mentionedJid
        });

    } catch (error) {
        console.error('Error in tagall:', error);
        await message.reply('Error tagging members: ' + error.message);
    }
});

Index({
    pattern: 'tag',
    fromMe: true,
    desc: 'Tag all members in replied message',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) {
        return await message.reply('This command can only be used in groups.');
    }
    if (!message.quoted) {
        return await message.reply('Please reply to a message to tag all members.');
    }

    try {
        const groupMetadata = await message.client.groupMetadata(message.jid);
        const participants = groupMetadata.participants;
        const mentionedJid = participants.map(p => p.id);

        const quotedContent = message.quotedText || 'Group Mention';

        await message.client.sendMessage(message.jid, {
            text: quotedContent,
            mentions: mentionedJid,
            quoted: message.data
        });

    } catch (error) {
        console.error('Error in tag:', error);
        await message.reply('Error creating tag message: ' + error.message);
    }
});


Index({
    pattern: 'revoke',
    fromMe: true,
    desc: 'Revoke group invite link',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to revoke the invite link.');
    
    try {
        await message.client.groupRevokeInvite(message.jid);
        await message.reply('Group invite link revoked successfully.');
    } catch (error) {
        await message.reply('Failed to revoke group invite link.');
    }
});


Index({
    pattern: 'groupsetting ?(.*)',
    fromMe: true,
    desc: 'Change group settings (editinfo)',
    type: 'group'
}, async (message, match) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to change group settings.');
    const option = message.getUserInput()?.toLowerCase();
    if (!option || (option !== 'all' && option !== 'admin')) {
        return await message.reply('Please specify the option: all or admin');
    }
    try {
        await message.client.groupSettingUpdate(message.jid, option === 'all' ? 'unlocked' : 'locked');
        await message.reply(`Group edit info setting changed to: ${option}`);
    } catch (error) {
        await message.reply('Failed to change group settings.');
    }
});


Index({
    pattern: 'poll',
    fromMe: true,
    desc: 'Create a poll in the group',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    
    const query = message.getUserInput();
    const [question, ...options] = query.split('|').map(item => item.trim());
    
    if (!question || options.length < 2) {
        return await message.reply('Usage: poll Question | Option1 | Option2 | ...');
    }
    
    try {
        await message.client.sendMessage(message.jid, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1
            }
        });
    } catch (error) {
        await message.reply('Failed to create poll.');
    }
});


Index({
  pattern: 'antilink',
  fromMe: true,
  desc: 'Configure antilink settings',
  type: 'admin'
}, async (message) => {
  const args = message.getUserInput().split(' ');
  const action = args[0];
  const value = args.slice(1).join(' ');

  if (!action) {
    return await message.reply(`Current antilink settings:
Enabled: ${config.ANTILINK.enabled}
Action: ${config.ANTILINK.action}
Max Warnings: ${config.ANTILINK.maxWarnings}
Whitelisted domains: ${config.ANTILINK.whitelistedDomains.join(', ')}

Usage:
.antilink enable/disable
.antilink action warn/delete/kick
.antilink warnmsg Your custom warning message
.antilink maxwarnings 5
.antilink whitelist add example.com
.antilink whitelist remove example.com`);
  }

  switch (action) {
    case 'enable':
      config.ANTILINK.enabled = true;
      await message.reply('Antilink has been enabled.');
      break;
    case 'disable':
      config.ANTILINK.enabled = false;
      await message.reply('Antilink has been disabled.');
      break;
    case 'action':
      if (['warn', 'delete', 'kick'].includes(value)) {
        config.ANTILINK.action = value;
        await message.reply(`Antilink action set to: ${value}`);
      } else {
        await message.reply('Invalid action. Use warn, delete, or kick.');
      }
      break;
    case 'warnmsg':
      config.ANTILINK.warningMessage = value;
      await message.reply('Warning message updated.');
      break;
    case 'maxwarnings':
      const max = parseInt(value);
      if (isNaN(max) || max < 1) {
        await message.reply('Please provide a valid number greater than 0.');
      } else {
        config.ANTILINK.maxWarnings = max;
        await message.reply(`Max warnings set to: ${max}`);
      }
      break;
    case 'whitelist':
      const subAction = args[1];
      const domain = args[2];
      if (subAction === 'add') {
        config.ANTILINK.whitelistedDomains.push(domain);
        await message.reply(`${domain} added to whitelist.`);
      } else if (subAction === 'remove') {
        config.ANTILINK.whitelistedDomains = config.ANTILINK.whitelistedDomains.filter(d => d !== domain);
        await message.reply(`${domain} removed from whitelist.`);
      } else {
        await message.reply('Invalid subaction. Use add or remove.');
      }
      break;
    default:
      await message.reply('Invalid action. Use enable, disable, action, warnmsg, maxwarnings, or whitelist.');
  }
});


const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
const warnings = new Map();

Index({
  on: 'message',
  fromMe: false,
  dontAddCommandList: true,
}, async (message) => {
  if (!config.ANTILINK.enabled || !message.isGroup) return;

  const groupMetadata = await message.client.groupMetadata(message.jid);
  const isAdmin = groupMetadata.participants.some(p => p.id === message.sender && p.admin);

  if (isAdmin) return;

  const matches = message.text.match(urlRegex);
  if (!matches) return;

  const isWhitelisted = matches.every(url => {
    const domain = new URL(url).hostname;
    return config.ANTILINK.whitelistedDomains.some(whitelisted => domain.includes(whitelisted));
  });

  if (isWhitelisted) return;

  const userId = message.sender;
  const userWarnings = warnings.get(userId) || 0;

  if (userWarnings >= config.ANTILINK.maxWarnings) {
    if (config.ANTILINK.action === 'kick') {
      await message.kick(userId);
      await message.reply(`@${userId.split('@')[0]} has been kicked for sending too many links.`);
    } else {
      await message.reply(`@${userId.split('@')[0]} has reached the maximum number of warnings.`);
    }
    warnings.delete(userId);
  } else {
    warnings.set(userId, userWarnings + 1);

    if (config.ANTILINK.action === 'delete') {
      await message.delete();
    }

    if (config.ANTILINK.action === 'warn' || config.ANTILINK.action === 'delete') {
      await message.reply(`${config.ANTILINK.warningMessage}\n\nWarnings: ${userWarnings + 1}/${config.ANTILINK.maxWarnings}`);
    }
  }
});



Index({
  pattern: 'kickcountry',
  fromMe: true,
  desc: 'Kick members from a specific country',
  type: 'admin'
}, async (message) => {
  if (!message.isGroup) {
    return await message.reply('This command can only be used in groups.');
  }

  const countryCode = message.getUserInput().trim();
  if (!countryCode) {
    return await message.reply('Please provide a country code. Usage: .kickcountry +234');
  }
  try {
    const groupMetadata = await message.client.groupMetadata(message.jid);
    const participants = groupMetadata.participants;
    let kickedCount = 0;
    const kickPromises = [];
    for (let participant of participants) {
      const userJid = participant.id;
      const phoneNumber = '+' + userJid.split('@')[0];
      if (phoneNumber.startsWith(countryCode)) {
        kickPromises.push(
          message.client.groupParticipantsUpdate(message.jid, [userJid], "remove")
            .then(() => {
              kickedCount++;
            })
            .catch((error) => {
              console.error(`Failed to kick ${phoneNumber}:`, error);
            })
        );
      }
    }

    await Promise.all(kickPromises);

    return await message.reply(`Kicked ${kickedCount} member(s) with country code ${countryCode}.`);
  } catch (error) {
    console.error('Error in kickcountry command:', error);
    return await message.reply('An error occurred while trying to kick members.');
  }
});


Index({
  pattern: 'creategc',
  fromMe: true,
  desc: 'Create a new group and send the group details',
  type: 'group'
}, async (message, match, client) => {
  const groupName = message.getUserInput().trim();
  if (!groupName) {
    await message.reply(`Please provide a group name. Usage:  groupname`);
    return;
  }

  try {
    let createdGroup = await client.groupCreate(groupName, []);
    let inviteCode = await client.groupInviteCode(createdGroup.id);
    let text = `「 Group Created 」

▸ Name : ${createdGroup.subject}
▸ Owner : @${createdGroup.owner.split("@")[0]}
▸ Creation : ${moment(createdGroup.creation * 1000).tz("Africa/Lagos").format("DD/MM/YYYY HH:mm:ss")}

https://chat.whatsapp.com/${inviteCode}
    `;

    await message.sendMessage(message.jid,text);

  } catch (error) {
    console.error('Error creating group:', error);
    await message.reply('An error occurred while creating the group. Please try again later.');
  }
});

Index({
    pattern: 'welcome',
    fromMe: true,
    desc: 'Configure welcome messages for groups',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) {
        return await message.reply('This command can only be used in groups.');
    }

    const groupMetadata = await message.client.groupMetadata(message.jid);
    const isAdmin = groupMetadata.participants.some(p => 
        p.id === message.sender && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!isAdmin) {
        return await message.reply('This command can only be used by group admins.');
    }

    const args = message.text.split(' ');
    const command = args[1]?.toLowerCase();

    if (!command || !['on', 'off', 'set', 'check'].includes(command)) {
        return await message.reply(`*Welcome Message Configuration*

Usage:
.welcome on - Enable welcome messages
.welcome off - Disable welcome messages
.welcome set <message> - Set custom welcome message
.welcome check - Check current welcome message

Variables for custom message:
{mention} - Mentions the new member
{group} - Group name
{desc} - Group description
{count} - Group member count

Example:
.welcome set Hey {mention}, welcome to {group}! You're our {count}th member. 🎉

Current welcome message will be shown when someone joins.`);
    }

    try {
        let welcomeSetting = await WelcomeSetting.findOne({
            where: { groupId: message.jid }
        });

        switch (command) {
            case 'on':
                if (!welcomeSetting) {
                    welcomeSetting = await WelcomeSetting.create({
                        groupId: message.jid,
                        isEnabled: true,
                        welcomeMessage: 'Welcome {mention} to {group}! 👋'
                    });
                } else {
                    await welcomeSetting.update({ isEnabled: true });
                }
                await message.reply('Welcome messages have been enabled for this group.');
                break;

            case 'off':
                if (welcomeSetting) {
                    await welcomeSetting.update({ isEnabled: false });
                }
                await message.reply('Welcome messages have been disabled for this group.');
                break;

            case 'set':
                const newMessage = message.text.split('set ')[1];
                if (!newMessage) {
                    return await message.reply('Please provide a welcome message.');
                }
                if (!welcomeSetting) {
                    welcomeSetting = await WelcomeSetting.create({
                        groupId: message.jid,
                        isEnabled: true,
                        welcomeMessage: newMessage
                    });
                } else {
                    await welcomeSetting.update({
                        welcomeMessage: newMessage,
                        isEnabled: true
                    });
                }
                await message.reply('Welcome message has been updated and enabled.\n\nNew message:\n' + newMessage);
                break;

            case 'check':
                if (!welcomeSetting) {
                    return await message.reply('No welcome message is set for this group.');
                }
                const status = welcomeSetting.isEnabled ? 'enabled' : 'disabled';
                const currentMessage = welcomeSetting.welcomeMessage;
                
                const groupName = groupMetadata.subject;
                const memberCount = groupMetadata.participants.length;
                const groupDesc = groupMetadata.desc || '';

                let previewMessage = currentMessage
                    .replace('{mention}', `@${message.sender.split('@')[0]}`)
                    .replace('{group}', groupName)
                    .replace('{desc}', groupDesc)
                    .replace('{count}', memberCount.toString());

                await message.reply(`*Welcome Message Status*\n\nStatus: ${status}\n\nCurrent message:\n${currentMessage}\n\nPreview:\n${previewMessage}`);
                break;
        }
    } catch (error) {
        console.error('Error in welcome command:', error);
        await message.reply('An error occurred while managing welcome messages.');
    }
});


Index({
    pattern: 'seticon',
    fromMe: true,
    desc: 'Change the group icon',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    
    if (!message.quoted || !message.quoted.message || !message.quoted.message.imageMessage) {
        return await message.reply('Please reply to an image to set it as the group icon.');
    }

    try {
        const media = await message.downloadMediaMessage(message.quoted);
        await message.client.updateProfilePicture(message.jid, media);
        await message.reply('Group icon updated successfully.');
    } catch (error) {
        console.error('Error setting group icon:', error);
        await message.reply('Failed to update group icon. Make sure the image is valid and I have permission to change group settings.');
    }
});

Index({
    pattern: 'join ?(.*)',
    fromMe: true,
    desc: 'Join a group using invite link',
    type: 'group'
}, async (message, match) => {
    let inviteLink = match || (message.quoted ? message.quoted.text : null);
    if (!inviteLink) {
        return await message.reply('_Please provide a WhatsApp group invite link._');
    }
    const waGroupRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/;
    const [_, code] = inviteLink.match(waGroupRegex) || [];
    if (!code) {
        return await message.reply('_Invalid invite link. Please provide a valid WhatsApp group invite link._');
    }
    try {
        const groupInfo = await message.client.groupGetInviteInfo(code);
        if (groupInfo.size >= 1024) {return await message.reply('*Group is full!*');}
        const join = await message.client.groupAcceptInvite(code);
        if (!join) { return await message.reply('_Join request sent to the group admins._'); }
        return await message.reply('_Successfully joined the group!_');
    } catch (error) {
        console.error('Error joining group:', error);
        return await message.reply('_Failed to join group. Make sure the invite link is valid and not expired._');
    }
});

module.exports = {
    handleAntispam,
};
