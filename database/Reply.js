const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const AutoReply = sequelize.define('AutoReply', {
    trigger: {
        type: DataTypes.STRING,
        allowNull: false
    },
    response: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    cooldown: {
        type: DataTypes.INTEGER,
        defaultValue: 10000 
    },
    addedBy: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    uses: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    lastUsed: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

const AutoReplyCooldown = sequelize.define('AutoReplyCooldown', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    replyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: AutoReply,
            key: 'id'
        }
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['userId', 'replyId']
        }
    ]
});

module.exports = { AutoReply, AutoReplyCooldown };