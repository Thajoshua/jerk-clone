
const { Index, mode } = require('../lib/');
const axios = require('axios');
const { isAdmin } = require('../lib/utils');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const fetch = require('node-fetch');



Index({
    pattern: 'dlt',
    fromMe: mode,
    desc: 'Delete a message',
    type: 'group'
}, async (message) => {
    try {
        if (!message.quoted) {
            await message.reply('Please reply to a message you want to delete.');
            return;
        }
        if (message.isGroup) {
            await message.client.sendMessage(message.jid, { delete: message.quoted.key });
            await message.reply('Message deleted successfully.');
        } else {
            await message.reply('Message deletion is only supported in group chats.');
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        await message.reply('Failed to delete message. Error: ' + error.message);
    }
});


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
module.exports = {
    handleAntispam,
};


Index({
    pattern: 'add ?(.*)',
    fromMe: true,
    desc: 'Add a member to the group',
    type: 'group'
}, async (message, match) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to add members.');
    const userToAdd = message.getUserInput();
    if (!userToAdd) return await message.reply('Please provide the number to add.'); 
    try {
        await message.client.groupParticipantsUpdate(message.jid, [userToAdd + '@s.whatsapp.net'], 'add');
        await message.reply('User added successfully.');
    } catch (error) {
        await message.reply('Failed to add user. Make sure the number is correct and the user hasn\'t restricted who can add them to groups.');
    }
});

Index({
    pattern: 'kick',
    fromMe: true,
    desc: 'Kick a user from the group',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) {
        await message.reply('This command can only be used in a group.');
        return;
    }
    const groupMetadata = await message.getGroupMetadata(message.jid);
    const isAdmin = groupMetadata.participants.some(p => p.id === message.sender && (p.admin === 'admin' || p.admin === 'superadmin'));
    if (!isAdmin) {
        await message.reply('This command can only be used by group admins.');
        return;
    }
    const userToKick = message.getUserInput().replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    if (!userToKick) {
        await message.reply('Please mention the user you want to kick or provide their number.');
        return;
    }
    try {
        await message.kick(userToKick);
        await message.reply(`Successfully kicked @${userToKick.split('@')[0]} from the group.`);
    } catch (error) {
        console.error('Error kicking user:', error);
        await message.reply('Failed to kick the user. Make sure the bot is an admin and the user is in the group.');
    }
});


Index({
    pattern: 'promote',
    fromMe: true,
    desc: 'Promote a member to admin',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to promote members.');
    if (!message.quoted) return await message.reply('Please reply to the message of the user you want to promote.');
    try {
        await message.client.groupParticipantsUpdate(message.jid, [message.reply_message.sender], 'promote');
        await message.reply('User promoted to admin successfully.');
    } catch (error) {
        await message.reply('Failed to promote user. Make sure I have permission to promote members.');
    }
});


Index({
    pattern: 'demote',
    fromMe: true,
    desc: 'Demote an admin to regular member',
    type: 'group'
}, async (message) => {
    if (!message.isGroup) return await message.reply('This command can only be used in a group.');
    if (!await isAdmin(message, message.client.user.id)) return await message.reply('I need to be an admin to demote members.');
    if (!message.quoted) return await message.reply('Please reply to the message of the admin you want to demote.');
    try {
        await message.client.groupParticipantsUpdate(message.jid, [message.reply_message.sender], 'demote');
        await message.reply('Admin demoted to regular member successfully.');
    } catch (error) {
        await message.reply('Failed to demote admin. Make sure I have permission to demote members.');
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
    pattern: 'tagall',
    fromMe: true,
    desc: 'Tags all members in the group with their names',
    type: 'group'
}, async (message) => {
    const match = message.getUserInput()
    if (!message.isGroup) {
        return await message.reply('This command can only be used in groups.');
    }
    try {
        const groupMetadata = await message.client.groupMetadata(message.jid);
        if (!groupMetadata || !groupMetadata.participants) {
            return await message.reply('Unable to fetch group metadata. Please try again later.');
        }
        const groupMembers = groupMetadata.participants;
        let teks = `\n╭━━[ Attention Everyone ]━━⊷\n`;
        teks += `┃ Message: ${match}\n┃\n`;
        for (let member of groupMembers) {
            teks += `┃ • @${member.id.split('@')[0]}\n`;
        }
        teks += `╰━━━━━━━━━━━━━━━⊷\n`;
        await message.client.sendMessage(message.jid, { 
            text: teks, 
            mentions: groupMembers.map(m => m.id) 
        });
    } catch (error) {
        console.error('Error in tagall command:', error);
        await message.reply('An error occurred while tagging group members. Please try again later.');
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
    pattern: 'joke',
    fromMe: true,
    desc: 'Get a random joke',
    type: 'fun'
}, async (message) => {
    try {
        const response = await fetch('https://official-joke-api.appspot.com/random_joke');
        if (!response.ok) throw new Error('Network response was not ok');
        const joke = await response.json();

        await message.reply(`Here's a joke for you:\n\n${joke.setup}\n\n${joke.punchline}`);
    } catch (error) {
        console.error(error);
        await message.reply("Sorry, I couldn't fetch a joke at the moment. Please try again later.");
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


// const { antilink } = require('../config');

// Index({
//     pattern: 'antilink',
//     fromMe: true,
//     desc: 'Enable or disable antilink in the group',
//     type: 'group',
// }, async (message) => {
//     const userInput = await message.getUserInput();
//     if (userInput === 'on') {
//         antilink.enabled = true;
//         message.reply('Antilink has been enabled');
//     } else if (userInput === 'off') {
//         antilink.enabled = false;
//         message.reply('Antilink has been disabled');
//     } else if (userInput.startsWith('action')) {
//         const action = userInput.split(' ')[1];
//         if (['delete', 'warn', 'kick'].includes(action)) {
//             antilink.action = action;
//             message.reply(`Antilink action has been set to ${action}`);
//         } else {
//             message.reply('Invalid action. Use one of the following: delete, warn, kick');
//         }
//     } else if (userInput.startsWith('message')) {
//         const customMessage = userInput.split(' ').slice(1).join(' ');
//         antilink.message = customMessage;
//         message.reply('Antilink message has been updated');
//     } else {
//         message.reply('Invalid command. Use: .antilink on/off, .antilink action [delete/warn/kick], .antilink message [custom message]');
//     }
// });



const config = require('../config');

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
  pattern: 'creategc|creategroup',
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
    pattern: 'welcome ?(.*)',
    fromMe: true,
    desc: 'Enable or disable welcome messages',
    type: 'group',
}, async (message) => {
    if (!message.isGroup) {
        await message.reply('This command is only for groups.');
        return;
    }
    const userInput = await message.getUserInput();
    const status = userInput === 'on';
    try {
        await WelcomeSetting.upsert({ groupId: message.jid, isEnabled: status });
        await message.reply(`Welcome messages have been ${status ? 'enabled' : 'disabled'}.`);
    } catch (error) {
        console.error('Error updating database:', error);
        await message.reply('There was an error updating the database.');
    }
});

Index({
  pattern: 'setwelcome ?(.*)',
  fromMe: true,
  desc: 'Set the welcome message',
  type: 'group',
}, async (message) => {
  if (!message.isGroup) {
      await message.reply('This command is only for groups.');
      return;
  }
  const welcomeMessage = await message.getUserInput();
  if (!welcomeMessage) {
      await message.reply('Please provide a welcome message.');
      return;
  }
  try {
      await WelcomeSetting.upsert({ groupId: message.jid, welcomeMessage });
      await message.reply('Welcome message has been set.');
  } catch (error) {
      console.error('Error updating database:', error);
      await message.reply('There was an error updating the database.');
  }
});

