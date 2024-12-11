const { Index } = require('../lib/');
const moment = require('moment');
const messageStore = require('../lib/messageStore');

Index({
    pattern: 'activity',
    fromMe: true,
    desc: 'Check group member activity',
    type: 'group'
}, async (message, match) => {
    if (!message.isGroup) {
        return await message.reply('This command can only be used in groups');
    }

    const command = match ? match.trim().toLowerCase() : 'status';

    try {
        // Get group metadata first to have access to all members
        const groupMetadata = await message.client.groupMetadata(message.jid);
        const participants = groupMetadata.participants || [];
        
        // Create a map of member IDs to their names
        const memberNames = new Map();
        for (const participant of participants) {
            try {
                const contact = await message.client.getName(participant.id);
                memberNames.set(participant.id, contact || participant.id.split('@')[0]);
            } catch (err) {
                memberNames.set(participant.id, participant.id.split('@')[0]);
            }
        }

        switch (command) {
            case 'status':
            case '':
                const topMembers = messageStore.getTopMembers(message.jid, 5);
                const inactiveMembers = messageStore.getInactiveMembers(message.jid, 7);

                let response = `*Group Activity Report for ${groupMetadata.subject}*\n\n`;
                
                // Total members info
                response += `*Total Members:* ${participants.length}\n`;
                response += `*Active Members:* ${messageStore.getTopMembers(message.jid).length}\n\n`;
                
                // Top Active Members
                response += '*Top 5 Active Members:*\n';
                if (topMembers.length > 0) {
                    for (let i = 0; i < topMembers.length; i++) {
                        const member = topMembers[i];
                        const memberName = memberNames.get(member.id) || member.id.split('@')[0];

                        response += `${i + 1}. ${memberName}\n`;
                        response += `   ├ Messages: ${member.messageCount}\n`;
                        response += `   └ Last active: ${moment(member.lastActive).fromNow()}\n`;
                    }
                } else {
                    response += 'No activity recorded yet\n';
                }

                // Inactive Members
                response += '\n*Inactive Members (7+ days):*\n';
                const allInactiveMembers = participants
                    .filter(p => !topMembers.some(m => m.id === p.id))
                    .map(p => ({
                        id: p.id,
                        name: memberNames.get(p.id),
                        lastActive: messageStore.getLastActive(message.jid, p.id)
                    }))
                    .filter(m => !m.lastActive || moment().diff(moment(m.lastActive), 'days') >= 7);

                if (allInactiveMembers.length > 0) {
                    for (const member of allInactiveMembers) {
                        response += `• ${member.name}\n`;
                        response += `  └ Last seen: ${member.lastActive ? moment(member.lastActive).fromNow() : 'Never active'}\n`;
                    }
                } else {
                    response += 'No inactive members\n';
                }

                await message.reply(response);
                break;

            case 'reset':
                const isAdmin = participants.some(p => 
                    p.id === message.sender && ['admin', 'superadmin'].includes(p.admin)
                );

                if (!isAdmin) {
                    return await message.reply('Only admins can reset activity data');
                }
                messageStore.resetGroup(message.jid);
                await message.reply('Activity tracking data has been reset');
                break;

            default:
                await message.reply(
                    '*Activity Tracker Commands*\n\n' +
                    '├ .activity - Show activity status\n' +
                    '└ .activity reset - Reset activity data'
                );
        }
    } catch (error) {
        console.error('Error in activity command:', error);
        await message.reply('Error processing activity command: ' + error.message);
    }
});

// Message handler to track activity
async function handleGroupMessage(message) {
    if (message.isGroup) {
        messageStore.trackMessage(message.jid, message.sender);
    }
}

module.exports = {
    handleGroupMessage
}; 