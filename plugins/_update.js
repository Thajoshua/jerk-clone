const { Index } = require('../lib/');
const simpleGit = require('simple-git');
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const config = require('../config');
const git = simpleGit();

const REPO_URL = 'https://github.com/Thajoshua/jerk-clone.git';
const BRANCH = 'main';

async function ensureRepo() {
    try {
        const gitDir = path.join(process.cwd(), '.git');
        const isGitRepo = fs.existsSync(gitDir);

        if (!isGitRepo) {
            await git.init();
            console.log('Initialized new git repository');
            
            await git.addRemote('origin', REPO_URL);
            console.log('Added remote origin');
            
            await git.fetch('origin');
            console.log('Fetched from origin');

            await git.reset(['--hard', `origin/${BRANCH}`]);
            console.log('Reset to origin/' + BRANCH);
        } else {
            const remotes = await git.getRemotes();
            const hasOrigin = remotes.some(remote => remote.name === 'origin');
            if (!hasOrigin) {
                await git.addRemote('origin', REPO_URL);
            } else {
                await git.remote(['set-url', 'origin', REPO_URL]);
            }
            await git.fetch('origin', BRANCH);
        } 
        return true;
    } catch (error) {
        console.error('Repository setup failed:', error);
        return false;
    }
}

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
        updateText += `\n*Use ${config.HANDLERS[2]}updatenow to update the bot*`;
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
        await message.reply('_Checking for updates..._');

        const isRepoReady = await ensureRepo();
        if (!isRepoReady) {
            await message.react('❌');
            return await message.reply('_Repository configuration error!_');
        }

        const updateStatus = await checkForUpdates();
        if (!updateStatus.hasUpdates) {
            setTimeout(async () => {
                await message.react('✅');
            }, 1000);
            return await message.reply('_Bot is up to date!_');
        }

        await message.reply(updateStatus.updateText);

    } catch (error) {
        await message.react('❌');
        console.error('Update check failed:', error);
        await message.reply('_Error checking for updates: ' + error.message + '_');
    }
});

Index({
    pattern: 'updatenow',
    fromMe: true,
    desc: 'Updates the bot to the latest version',
    type: 'owner'
}, async (message) => {
    try {
        await message.reply('_Updating bot..._');

        const isRepoReady = await ensureRepo();
        if (!isRepoReady) {
            await message.react('❌');
            return await message.reply('_Repository configuration error!_');
        }

        const updateStatus = await checkForUpdates();
        if (!updateStatus.hasUpdates) {
            setTimeout(async () => {
                await message.react('✅');
            }, 1000);
            return await message.reply('_Bot is already up to date!_');
        }

        try {
            if (global.db && typeof global.db.close === 'function') {
                await global.db.close();
            }
        } catch (err) {
            console.log('Database cleanup warning:', err);
        }

        try {
            const dbPath = path.join(process.cwd(), 'data/database.sqlite');
            if (fs.existsSync(dbPath)) {
                if (process.platform === 'win32') {
                    await new Promise((resolve) => {
                        exec(`taskkill /F /IM node.exe`, () => resolve());
                    });
                }
            }
        } catch (err) {
            console.log('Database lock removal warning:', err);
        }
        try {
            await git.reset(['--hard', 'HEAD']);
            const pullResult = await git.pull('origin', BRANCH);
            
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