const { Index } = require('../lib/');
const simpleGit = require('simple-git');
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const git = simpleGit();

// Add this configuration at the top
const REPO_URL = 'https://github.com/Thajoshua/jerk-clone.git';  // Replace with your repo URL
const BRANCH = 'main';  // Replace with your default branch

// Function to ensure repo is properly configured
async function ensureRepo() {
    try {
        // Check if .git directory exists
        const gitDir = path.join(process.cwd(), '.git');
        const isGitRepo = fs.existsSync(gitDir);

        if (!isGitRepo) {
            // Initialize git repository
            await git.init();
            console.log('Initialized new git repository');
            
            // Add remote origin
            await git.addRemote('origin', REPO_URL);
            console.log('Added remote origin');
            
            // Fetch all
            await git.fetch('origin');
            console.log('Fetched from origin');
            
            // Reset to origin/main
            await git.reset(['--hard', `origin/${BRANCH}`]);
            console.log('Reset to origin/' + BRANCH);
        } else {
            // Check if remote exists
            const remotes = await git.getRemotes();
            const hasOrigin = remotes.some(remote => remote.name === 'origin');

            if (!hasOrigin) {
                await git.addRemote('origin', REPO_URL);
            } else {
                // Update origin URL if it exists
                await git.remote(['set-url', 'origin', REPO_URL]);
            }

            // Fetch latest
            await git.fetch('origin', BRANCH);
        }
        
        return true;
    } catch (error) {
        console.error('Repository setup failed:', error);
        return false;
    }
}

// Create a function to check for updates
async function checkForUpdates() {
    try {
        await git.fetch('origin', BRANCH);
        const current = await git.revparse(['HEAD']);
        const remote = await git.revparse(['origin/' + BRANCH]);
        
        if (current === remote) {
            return { hasUpdates: false };
        }

        const commits = await git.log(['HEAD..origin/' + BRANCH]);
        let updateText = '*Updates available!*\n\nChanges:\n';
        
        commits.all.forEach(commit => {
            updateText += `\n*${commit.message}*`;
            updateText += `\n└ _${commit.date.split('T')[0]}_\n`;
        });
        
        updateText += '\n*Use .update now to update the bot*';
        
        return { hasUpdates: true, updateText };
    } catch (error) {
        throw new Error('Failed to check updates: ' + error.message);
    }
}

module.exports = {
    ensureRepo,
    checkForUpdates
}


Index({
    pattern: 'update',
    fromMe: true,
    desc: 'Checks for updates from the main repository',
    type: 'owner'
}, async (message) => {
    try {
        await message.react('🔍');
        await message.reply('Checking for updates...');

        const isRepoReady = await ensureRepo();
        if (!isRepoReady) {
            await message.react('❌');
            return await message.reply('Repository configuration error!');
        }

        const updateStatus = await checkForUpdates();
        if (!updateStatus.hasUpdates) {
            setTimeout(async () => {
                await message.react('✅');
            }, 1000);
            return await message.reply('Bot is up to date!');
        }

        await message.reply(updateStatus.updateText);

    } catch (error) {
        await message.react('❌');
        console.error('Update check failed:', error);
        await message.reply('Error checking for updates: ' + error.message);
    }
});

Index({
    pattern: 'update now',
    fromMe: true,
    desc: 'Updates the bot to the latest version',
    type: 'owner'
}, async (message) => {
    try {
        await message.react('🔄');
        await message.reply('Updating bot...');

        const isRepoReady = await ensureRepo();
        if (!isRepoReady) {
            await message.react('❌');
            return await message.reply('Repository configuration error!');
        }

        // Check if there are actually updates available

        const updateStatus = await checkForUpdates();
        if (!updateStatus.hasUpdates) {
            setTimeout(async () => {
                await message.react('✅');
            }, 1000);
            return await message.reply('Bot is already up to date!');
        }

        // Add this: Clean up database connection before git operations
        try {
            // If you have a database connection, close it here
            if (global.db && typeof global.db.close === 'function') {
                await global.db.close();
            }
        } catch (err) {
            console.log('Database cleanup warning:', err);
        }

        try {
            // Try to remove the lock on database.sqlite
            const dbPath = path.join(process.cwd(), 'data/database.sqlite');
            if (fs.existsSync(dbPath)) {
                // Force close any open handles to the file
                if (process.platform === 'win32') {
                    await new Promise((resolve) => {
                        exec(`taskkill /F /IM node.exe`, () => resolve());
                    });
                }
            }
        } catch (err) {
            console.log('Database lock removal warning:', err);
        }

        // Reset any local changes and pull updates
        try {
            await git.reset(['--hard', 'HEAD']);
            const pullResult = await git.pull('origin', BRANCH);
            
            // Check for package.json changes
            if (pullResult.files.includes('package.json')) {
                await message.react('📦');
                await message.reply('Installing new dependencies...');
                await new Promise((resolve, reject) => {
                    exec('npm install', (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve(stdout);
                    });
                });
            }

            setTimeout(async () => {
                await message.react('✅');
            }, 1000);
            await message.reply(`Bot updated successfully!\n\n*Restarting bot...*`);
            process.exit(0);
        } catch (gitError) {
            // If git operations fail, try a more aggressive approach
            await message.react('⚠️');
            await message.reply('Normal update failed, trying forced update...');
            
            await git.fetch('origin', BRANCH);
            await git.reset(['--hard', `origin/${BRANCH}`]);
            
            await message.react('✅');
            await message.reply(`Bot updated successfully (forced)!\n\n*Restarting bot...*`);
            process.exit(0);
        }
        
    } catch (error) {
        console.error('Update failed:', error);
        await message.react('❌');
        await message.reply('Update failed: ' + error.message + '\n\nTry restarting the bot manually and updating again.');
    }
}); 