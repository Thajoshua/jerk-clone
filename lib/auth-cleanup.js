const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { numToJid } = require('./utils');

class AuthCleaner {
    constructor() {
        this.authPath = path.join(process.cwd(), 'auth');
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
        if (!this.client) return;
        const sudo = numToJid(config.SUDO.split(',')[0]);
        await this.client.sendMessage(sudo, { text: message });
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

            const stats = await this.getFolderStats();
            const needsCleaning = stats.fileCount > this.thresholds.maxFiles || 
                                stats.folderSizeMB > this.thresholds.maxFolderSizeMB;

            if (!needsCleaning) return;

            if (!this.isStartup) {
                await this.notifySudo(
                    `*[AUTH CLEANUP]* Starting cleanup...\n` +
                    `Files: ${stats.fileCount}\n` +
                    `Size: ${stats.folderSizeMB.toFixed(2)}MB`
                );
            }

            const files = await fs.readdir(this.authPath);
            const fileStats = await Promise.all(
                files.map(async file => ({
                    name: file,
                    path: path.join(this.authPath, file),
                    stats: await fs.stat(path.join(this.authPath, file))
                }))
            );

            fileStats.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime());

            let deletedCount = 0;
            for (const file of fileStats) {
                if (this.preserveFiles.includes(file.name)) continue;
                await fs.unlink(file.path);
                deletedCount++;

                const currentStats = await this.getFolderStats();
                if (currentStats.fileCount <= this.thresholds.maxFiles) break;
            }

            if (!this.isStartup && deletedCount > 0) {
                const finalStats = await this.getFolderStats();
                await this.notifySudo(
                    `*[AUTH CLEANUP]* Completed!\n` +
                    `Files Deleted: ${deletedCount}\n` +
                    `Remaining: ${finalStats.fileCount}\n` +
                    `Current Size: ${finalStats.folderSizeMB.toFixed(2)}MB`
                );
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

        const stats = await this.getFolderStats();
        if (stats.fileCount > this.thresholds.maxFiles || 
            stats.folderSizeMB > this.thresholds.maxFolderSizeMB) {
            await this.cleanAuthFolder();
        }
    }

    start(client) {
        if (!config.AUTH_CLEANUP_ENABLED) return;
        this.setClient(client);
        
        this.cleanAuthFolder().then(() => {
            this.isStartup = false;
            this.interval = setInterval(() => this.monitorFolder(), 60 * 1000); 
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