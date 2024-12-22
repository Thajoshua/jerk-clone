const { Index } = require('../lib/');

let autoViewEnabled = false;
let viewDelay = 0; 
let excludedContacts = new Set();

Index({
    pattern: 'autostatus(?: (.*))?',
    fromMe: true,
    desc: 'Configure auto status view settings',
    type: 'whatsapp'
}, async (message) => {
    const input = message.getUserInput()?.toLowerCase().trim();
    const [command, ...args] = input ? input.split(' ') : [];

    if (!command || !['on', 'off', 'delay', 'exclude', 'include', 'status'].includes(command)) {
        return await message.reply(
            '*🔄 Auto Status View Settings*\n\n' +
            'Commands:\n' +
            '├ .autostatus on - Enable auto status view\n' +
            '├ .autostatus off - Disable auto status view\n' +
            '├ .autostatus delay [ms] - Set view delay\n' +
            '├ .autostatus exclude [number] - Exclude contact\n' +
            '├ .autostatus include [number] - Remove from exclusion\n' +
            '└ .autostatus status - Check current settings\n\n' +
            'Current Status: ' + (autoViewEnabled ? 'Enabled ✅' : 'Disabled ❌') + '\n' +
            'View Delay: ' + viewDelay + 'ms\n' +
            'Excluded Contacts: ' + (excludedContacts.size ? Array.from(excludedContacts).join(', ') : 'None')
        );
    }

    switch (command) {
        case 'on':
            autoViewEnabled = true;
            await message.reply('✅ Auto status view has been *enabled*');
            break;

        case 'off':
            autoViewEnabled = false;
            await message.reply('❌ Auto status view has been *disabled*');
            break;

        case 'delay':
            const newDelay = parseInt(args[0]);
            if (isNaN(newDelay) || newDelay < 0) {
                return await message.reply('Please provide a valid delay in milliseconds');
            }
            viewDelay = newDelay;
            await message.reply(`⏱️ View delay set to ${newDelay}ms`);
            break;

        case 'exclude':
            const numberToExclude = args[0];
            if (!numberToExclude) {
                return await message.reply('Please provide a number to exclude');
            }
            excludedContacts.add(numberToExclude);
            await message.reply(`📵 ${numberToExclude} added to exclusion list`);
            break;

        case 'include':
            const numberToInclude = args[0];
            if (!numberToInclude) {
                return await message.reply('Please provide a number to remove from exclusion');
            }
            excludedContacts.delete(numberToInclude);
            await message.reply(`✅ ${numberToInclude} removed from exclusion list`);
            break;

        case 'status':
            await message.reply(
                '*🔄 Auto Status View Settings*\n\n' +
                `Status: ${autoViewEnabled ? 'Enabled ✅' : 'Disabled ❌'}\n` +
                `View Delay: ${viewDelay}ms\n` +
                `Excluded Contacts: ${excludedContacts.size ? Array.from(excludedContacts).join(', ') : 'None'}`
            );
            break;
    }
});

async function handleStatus(status, client) {
    if (!autoViewEnabled) return;
    try {
        const senderJid = status.participant || status.key.participant || status.key.remoteJid;
        if (excludedContacts.has(senderJid.split('@')[0])) {
            console.log('Skipping status from excluded contact:', senderJid);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, viewDelay));
        if (status.key) {
            await client.readMessages([status.key]);
            console.log('Viewed status from:', senderJid);
        }
    } catch (error) {
        console.error('Error viewing status:', error);
    }
}

module.exports = {
    handleStatus,
    isAutoViewEnabled: () => autoViewEnabled
}; 