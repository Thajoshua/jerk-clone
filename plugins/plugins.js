const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Index } = require('../lib/');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./plugins.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS plugins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      path TEXT
    )
  `);
});

db.close();

const PLUGINS_FOLDER = path.join(__dirname, 'Axiom');


function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}


async function savePlugin(pluginName, pluginCode) {
  ensureDirectoryExists(PLUGINS_FOLDER);
  const pluginPath = path.join(PLUGINS_FOLDER, `${pluginName}.js`);
  fs.writeFileSync(pluginPath, pluginCode, 'utf8');
  console.log(`Plugin saved to ${pluginPath}`);
  return pluginPath;
}


Index({
  pattern: 'installplugin',
  fromMe: true,
  desc: 'Install a plugin from a GitHub Gist URL',
  type: 'utility'
}, async (message) => {
  const gistUrl = message.getUserInput().trim();

  if (!gistUrl) {
    return message.reply('Please provide a GitHub Gist URL. Usage: .installplugin GIST_URL');
  }

  try {
    const response = await axios.get(gistUrl);
    const pluginCode = response.data;
    const urlParts = gistUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const pluginName = path.basename(fileName, path.extname(fileName));
    const pluginPath = await savePlugin(pluginName, pluginCode);

    await message.reply(`Plugin *${pluginName}* installed successfully from Gist.`);
  } catch (error) {
    console.error('Error installing plugin:', error.message);
    await message.reply(`Failed to install plugin: ${error.message}`);
  }
});




function getInstalledPlugins() {
  ensureDirectoryExists(PLUGINS_FOLDER);
  return fs.readdirSync(PLUGINS_FOLDER).filter(file => file.endsWith('.js'));
}


Index({
  pattern: 'listplugins',
  fromMe: true,
  desc: 'List all installed plugins',
  type: 'utility'
}, async (message) => {
  try {
    const plugins = getInstalledPlugins();

    if (plugins.length === 0) {
      return message.reply('No plugins installed.');
    }

    const pluginList = plugins.map((plugin, index) => `${index + 1}. ${plugin}`).join('\n');
    await message.reply(`Installed Plugins:\n\n${pluginList}`);
  } catch (error) {
    console.error('Error listing plugins:', error.message);
    await message.reply(`Failed to list plugins: ${error.message}`);
  }
});

Index({
    pattern: 'deleteplugin',
    fromMe: true,
    desc: 'Delete an installed plugin',
    type: 'utility'
  }, async (message) => {
    const pluginName = message.getUserInput();
    if (!pluginName) {
      return message.reply('Please provide the name of the plugin to delete. Usage: .deleteplugin pluginname');
    }
  
    const pluginFile = path.join(PLUGINS_FOLDER, `${pluginName}.js`);
    
    if (fs.existsSync(pluginFile)) {
      try {
        fs.unlinkSync(pluginFile);
        await message.reply(`Plugin ${pluginName} has been deleted successfully.`);
      } catch (error) {
        console.error('Error deleting plugin:', error.message);
        await message.reply(`Failed to delete plugin ${pluginName}: ${error.message}`);
      }
    } else {
      await message.reply(`Plugin ${pluginName} not found.`);
    }
  });
  
  function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }