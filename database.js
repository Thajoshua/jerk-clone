const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dbDirectory = path.resolve(__dirname, 'data');
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

const WelcomeSetting = sequelize.define('WelcomeSetting', {
  groupId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

const checkDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to AXIOMDB has been established successfully.');
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

module.exports = { sequelize, UserSession, Notification, checkDatabaseConnection, storeNotification, WelcomeSetting, getNotifications, clearNotifications };
