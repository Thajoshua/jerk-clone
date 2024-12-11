const fs = require('fs').promises;
const path = require('path');

class MessageStore {
    constructor() {
        this.store = new Map();
        this.storePath = path.join(__dirname, '../database/messageStore.json');
        this.loadStore();
    }

    async loadStore() {
        try {
            const dir = path.dirname(this.storePath);
            await fs.mkdir(dir, { recursive: true });
            
            const data = await fs.readFile(this.storePath, 'utf8').catch(() => '{}');
            const jsonData = JSON.parse(data);
            
            // Convert JSON to Map structure
            Object.entries(jsonData).forEach(([groupId, groupData]) => {
                const memberMap = new Map(Object.entries(groupData.members));
                this.store.set(groupId, {
                    members: memberMap,
                    lastReset: groupData.lastReset
                });
            });
            
            console.log('Message store loaded successfully');
        } catch (error) {
            console.error('Error loading message store:', error);
            this.store = new Map();
        }
    }

    async saveStore() {
        try {
            // Convert Map to JSON-friendly format
            const jsonData = {};
            this.store.forEach((groupData, groupId) => {
                jsonData[groupId] = {
                    members: Object.fromEntries(groupData.members),
                    lastReset: groupData.lastReset
                };
            });
            
            await fs.writeFile(this.storePath, JSON.stringify(jsonData, null, 2));
        } catch (error) {
            console.error('Error saving message store:', error);
        }
    }

    initGroup(groupId) {
        if (!this.store.has(groupId)) {
            this.store.set(groupId, {
                members: new Map(),
                lastReset: Date.now()
            });
        }
    }

    trackMessage(groupId, senderId) {
        this.initGroup(groupId);
        const group = this.store.get(groupId);
        
        if (!group.members.has(senderId)) {
            group.members.set(senderId, {
                messageCount: 0,
                lastMessage: Date.now()
            });
        }
        
        const member = group.members.get(senderId);
        member.messageCount++;
        member.lastMessage = Date.now();
        
        // Save after each update
        this.saveStore();
    }

    getInactiveMembers(groupId, days) {
        const group = this.store.get(groupId);
        if (!group) return [];
        
        const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
        const inactiveMembers = [];
        
        group.members.forEach((data, memberId) => {
            if (data.lastMessage < threshold) {
                inactiveMembers.push({
                    id: memberId,
                    lastActive: data.lastMessage
                });
            }
        });
        
        return inactiveMembers;
    }

    getTopMembers(groupId, limit = 10) {
        const group = this.store.get(groupId);
        if (!group) return [];
        
        return Array.from(group.members.entries())
            .map(([id, data]) => ({
                id,
                messageCount: data.messageCount,
                lastActive: data.lastMessage
            }))
            .sort((a, b) => b.messageCount - a.messageCount)
            .slice(0, limit);
    }

    resetGroup(groupId) {
        this.store.set(groupId, {
            members: new Map(),
            lastReset: Date.now()
        });
        this.saveStore();
    }

    getLastActive(groupId, memberId) {
        const group = this.store.get(groupId);
        if (!group || !group.members.has(memberId)) return null;
        return group.members.get(memberId).lastMessage;
    }
}

module.exports = new MessageStore(); 