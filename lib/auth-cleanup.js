const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { numToJid } = require('./utils');

class AuthCleaner {
    constructor() {
        this.authPath = path.join(process.cwd(), 'auth');
        // Create auth directory if it doesn't exist
        fs.mkdir(this.authPath, { recursive: true }).catch(console.error);
        this.interval = null;
        this.thresholds = {
            maxFiles: 5,
            maxFolderSizeMB: 50
        };
        this.preserveFiles = ['creds.json'];
        this.client = null;
        this.isStartup = true;
        this.lastCheck = 0;
        this.checkInterval = 30 * 60 * 1000;
    }

    setClient(client) {
        this.client = client;
    }

    async notifySudo(message) {
        try {
            if (!this.client) return;
            const sudo = numToJid(config.SUDO.split(',')[0]);
            await this.client.sendMessage(sudo, { text: message });
        } catch (error) {
            console.error('[AUTH CLEANUP] Notification error:', error);
        }
    }

    async getFolderStats() {
        const files = await fs.readdir(this.authPath);
        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(this.authPath, file);
            const stats = await fs.stat(filePath);
            totalSize += stats.size;
        }

        return {
            fileCount: files.length,
            folderSizeMB: totalSize / (1024 * 1024)
        };
    }

    async cleanAuthFolder() {
        try {
            if (!config.AUTH_CLEANUP_ENABLED) return;

            // Ensure directory exists
            await fs.mkdir(this.authPath, { recursive: true });

            const stats = await this.getFolderStats();
            const needsCleaning =
                stats.fileCount > this.thresholds.maxFiles ||
                stats.folderSizeMB > this.thresholds.maxFolderSizeMB;

            if (!needsCleaning) return;

            if (!this.isStartup) {
                // await this.notifySudo(
                //     `*[AUTH CLEANUP]* Starting cleanup...\n` +
                //     `Files: ${stats.fileCount}\n` +
                //     `Size: ${stats.folderSizeMB.toFixed(2)}MB`
                // );
                console.log('[AUTH CLEANUP] Starting cleanup...');
            }

            const files = await fs.readdir(this.authPath);

            const filesToDelete = files.filter(file => !this.preserveFiles.includes(file));

            let deletedCount = 0;
            for (const file of filesToDelete) {
                const filePath = path.join(this.authPath, file);
                try {
                    // Check if file exists before attempting deletion
                    await fs.access(filePath);
                    await fs.unlink(filePath);
                    deletedCount++;
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        console.error(`[AUTH CLEANUP] Error deleting ${file}:`, error);
                    }
                    continue;
                }
            }

            const finalStats = await this.getFolderStats();

            if (!this.isStartup && deletedCount > 0) {
                // await this.notifySudo(
                //     `*[AUTH CLEANUP]* Completed!\n` +
                //     `Files Deleted: ${deletedCount}\n` +
                //     `Remaining: ${finalStats.fileCount}\n` +
                //     `Current Size: ${finalStats.folderSizeMB.toFixed(2)}MB`
                // );
                console.log('[AUTH CLEANUP] Completed!');
            }
        } catch (error) {
            console.error('[AUTH CLEANUP] Error:', error);
            if (!this.isStartup) {
                await this.notifySudo(`*[AUTH CLEANUP ERROR]*\n${error.message}`);
            }
        }
    }

    async monitorFolder() {
        if (Date.now() - this.lastCheck < this.checkInterval) return;
        this.lastCheck = Date.now();

        try {
            const stats = await this.getFolderStats();
            if (
                stats.fileCount > this.thresholds.maxFiles ||
                stats.folderSizeMB > this.thresholds.maxFolderSizeMB
            ) {
                await this.cleanAuthFolder();
            }
        } catch (error) {
            console.error('[AUTH CLEANUP] Monitor error:', error);
        }
    }

    start(client) {
        if (!config.AUTH_CLEANUP_ENABLED) return;

        this.setClient(client);
        this.cleanAuthFolder()
            .then(() => {
                this.isStartup = false;
                this.interval = setInterval(() => this.monitorFolder(), 60 * 1000);
            })
            .catch((error) => {
                console.error('[AUTH CLEANUP] Startup error:', error);
            });
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

module.exports = new AuthCleaner();
