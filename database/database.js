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
});

const UserSession = sequelize.define('UserSession', {
  jid: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  sessionData: {
    type: DataTypes.JSON,
    allowNull: false,
  },
});

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
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'senderId']
    }
  ]
});

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
}, {
  timestamps: true
});

const checkDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    // console.log('Connection to AXIOMDB has been established successfully.');
    await sequelize.sync();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};
checkDatabaseConnection();

const storeNotification = async (userId, senderId) => {
  try {
    const notification = await Notification.findOne({ where: { userId, senderId } });
    if (notification) {
      await notification.increment('messageCount');
    } else {
      await Notification.create({ userId, senderId });
    }
  } catch (error) {
    console.error('Error storing notification:', error);
  }
};

const getNotifications = async (userId) => {
  try {
    const notifications = await Notification.findAll({ where: { userId } });
    return notifications;
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
      code: code,
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

module.exports = { sequelize, UserSession, Notification, checkDatabaseConnection, storeNotification, WelcomeSetting, getNotifications, clearNotifications, Plugin, savePlugin, getInstalledPlugins, deletePlugin, PLUGINS_FOLDER,Event };
