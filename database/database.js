const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dbDirectory = path.resolve(__dirname, '../data');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(dbDirectory, 'database.sqlite'),
  logging: false,
  define: {
    freezeTableName: true,
    timestamps: true
  }
});

// Session Management
const UserSession = sequelize.define('UserSession', {
  jid: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  sessionData: {
    type: DataTypes.JSON,
    allowNull: false,
  }
});

// Auto Reply System
const AutoReply = sequelize.define('AutoReply', {
  trigger: {
    type: DataTypes.STRING,
    allowNull: false
  },
  response: {
    type: DataTypes.TEXT,
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
  cooldown: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastUsed: {
    type: DataTypes.DATE
  }
});

const AutoReplyCooldown = sequelize.define('AutoReplyCooldown', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  replyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  indexes: [
    {
      fields: ['userId', 'replyId'],
      unique: true
    }
  ]
});

// Notification System
const Notification = sequelize.define('Notification', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  messageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'senderId']
    }
  ]
});

// Group Event Management
const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Welcome Message Settings
const WelcomeSetting = sequelize.define('WelcomeSetting', {
  groupId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  welcomeMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Welcome {mention} to {group}! 👋'
  }
});

// Plugin Management
const Plugin = sequelize.define('Plugin', {
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  code: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

const checkDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to the axiom database has been established');
    await sequelize.sync();
    console.log("✓ Database synchronized");
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

const saveUserSession = async (jid, sessionData) => {
  if (!jid || !sessionData) {
    console.error("Invalid session data or JID");
    return false;
  }

  try {
    await UserSession.upsert({
      jid,
      sessionData: JSON.parse(JSON.stringify(sessionData))
    });
    return true;
  } catch (error) {
    console.error("Error saving user session:", error);
    return false;
  }
};

const getUserSession = async (jid) => {
  try {
    const session = await UserSession.findByPk(jid);
    return session ? session.sessionData : null;
  } catch (error) {
    console.error("Error retrieving user session:", error);
    return null;
  }
};

const storeNotification = async (userId, senderId) => {
  try {
    const [notification] = await Notification.findOrCreate({
      where: { userId, senderId },
      defaults: { messageCount: 1 }
    });
    
    if (notification.messageCount > 1) {
      await notification.increment('messageCount');
    }
  } catch (error) {
    console.error('Error storing notification:', error);
  }
};

const getNotifications = async (userId) => {
  try {
    return await Notification.findAll({ where: { userId } });
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    return [];
  }
};

const clearNotifications = async (userId) => {
  try {
    await Notification.destroy({ where: { userId } });
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};

const PLUGINS_FOLDER = path.join(__dirname, '../plugins/Axiom');

const ensurePluginDirectory = () => {
  if (!fs.existsSync(PLUGINS_FOLDER)) {
    fs.mkdirSync(PLUGINS_FOLDER, { recursive: true });
  }
};

const savePlugin = async (pluginName, code) => {
  ensurePluginDirectory();
  const pluginPath = path.join(PLUGINS_FOLDER, `${pluginName}.js`);
  
  try {
    await fs.promises.writeFile(pluginPath, code, 'utf8');
    await Plugin.upsert({
      name: pluginName,
      code,
      path: pluginPath
    });
    return pluginPath;
  } catch (error) {
    throw error;
  }
};

const getInstalledPlugins = async () => {
  ensurePluginDirectory();
  return fs.readdirSync(PLUGINS_FOLDER).filter(file => file.endsWith('.js'));
};

const deletePlugin = async (pluginName) => {
  const pluginPath = path.join(PLUGINS_FOLDER, `${pluginName}.js`);
  
  if (!fs.existsSync(pluginPath)) {
    throw new Error('Plugin not found');
  }

  try {
    await fs.promises.unlink(pluginPath);
    await Plugin.destroy({ where: { name: pluginName } });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  sequelize,
  UserSession,
  AutoReply,
  AutoReplyCooldown,
  Notification,
  Event,
  WelcomeSetting,
  Plugin,
  checkDatabaseConnection,
  saveUserSession,
  getUserSession,
  storeNotification,
  getNotifications,
  clearNotifications,
  savePlugin,
  getInstalledPlugins,
  deletePlugin,
  PLUGINS_FOLDER
};