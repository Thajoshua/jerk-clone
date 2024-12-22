const { Index } = require('../lib/');

// Auto status settings
let autoViewEnabled = false; // Auto-view status enabled or disabled
let excludedContacts = new Set(); // Contacts excluded from auto-view

// Command definition
Index({
    pattern: 'autostatus',
    fromMe: true,
    desc: 'Configure auto status view settings',
    type: 'whatsapp',
}, async (message) => {
    const input = message.getUserInput()?.toLowerCase().trim();
    const [command, ...args] = input ? input.split(/\s+/) : [];

    // List of valid subcommands
    const validCommands = ['on', 'off', 'exclude', 'include', 'status'];

    // If no valid subcommand is found
    if (!command || !validCommands.includes(command)) {
        return await message.reply(
            '*🔄 Auto Status View Settings*\n\n' +
            'Commands:\n' +
            '├ .autostatus on - Enable auto status view\n' +
            '├ .autostatus off - Disable auto status view\n' +
            '├ .autostatus exclude [number] - Exclude contact\n' +
            '├ .autostatus include [number] - Remove from exclusion\n' +
            '└ .autostatus status - Check current settings\n\n' +
            `Current Status: ${autoViewEnabled ? 'Enabled ✅' : 'Disabled ❌'}\n` +
            `Excluded Contacts: ${excludedContacts.size ? Array.from(excludedContacts).join(', ') : 'None'}`
        );
    }

    // Handle subcommands
    switch (command) {
        case 'on':
            autoViewEnabled = true;
            await message.reply('✅ Auto status view has been *enabled*');
            break;

        case 'off':
            autoViewEnabled = false;
            await message.reply('❌ Auto status view has been *disabled*');
            break;

        case 'exclude':
            const numberToExclude = args[0];
            if (!numberToExclude) {
                return await message.reply('❌ Please provide a number to exclude');
            }
            excludedContacts.add(numberToExclude);
            await message.reply(`📵 ${numberToExclude} added to exclusion list`);
            break;

        case 'include':
            const numberToInclude = args[0];
            if (!numberToInclude) {
                return await message.reply('❌ Please provide a number to remove from exclusion');
            }
            excludedContacts.delete(numberToInclude);
            await message.reply(`✅ ${numberToInclude} removed from exclusion list`);
            break;

        case 'status':
            await message.reply(
                '*🔄 Auto Status View Settings*\n\n' +
                `Status: ${autoViewEnabled ? 'Enabled ✅' : 'Disabled ❌'}\n` +
                `Excluded Contacts: ${excludedContacts.size ? Array.from(excludedContacts).join(', ') : 'None'}`
            );
            break;
    }
});

// Handle auto status viewing
async function handleStatus(status, client) {
    if (!autoViewEnabled) return; // Skip if auto-view is disabled
    try {
        const senderJid = status.participant || status.key.participant || status.key.remoteJid;
        const contact = senderJid.split('@')[0];

        // Skip excluded contacts
        if (excludedContacts.has(contact)) {
            console.log('Skipping status from excluded contact:', contact);
            return;
        }

        // View the status
        if (status.key) {
            await client.readMessages([status.key]);
            console.log('Viewed status from:', contact);
        }
    } catch (error) {
        console.error('Error viewing status:', error);
    }
}

module.exports = {
    handleStatus,
    isAutoViewEnabled: () => autoViewEnabled,
};
