// const sqlite3 = require('sqlite3').verbose();
// const fs = require('fs');
// const path = require('path');

// const PLUGINS_FOLDER = path.join(__dirname, '../plugins/Axiom');
// const db = new sqlite3.Database('./plugins.db');

// db.serialize(() => {
//   db.run(`CREATE TABLE IF NOT EXISTS plugins (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name TEXT UNIQUE,
//     code TEXT,
//     path TEXT,
//     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
//   )`);
// });

// function ensureDirectoryExists(dir) {
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
// }

// async function savePlugin(pluginName, code) {
//   ensureDirectoryExists(PLUGINS_FOLDER);
//   const pluginPath = path.join(PLUGINS_FOLDER, `${pluginName}.js`);
  
//   return new Promise((resolve, reject) => {
//     fs.writeFile(pluginPath, code, 'utf8', (err) => {
//       if (err) reject(err);
      
//       db.run('INSERT OR REPLACE INTO plugins (name, code, path) VALUES (?, ?, ?)',
//         [pluginName, code, pluginPath],
//         (err) => {
//           if (err) reject(err);
//           resolve(pluginPath);
//         }
//       );
//     });
//   });
// }

// function getInstalledPlugins() {
//   ensureDirectoryExists(PLUGINS_FOLDER);
//   return fs.readdirSync(PLUGINS_FOLDER).filter(file => file.endsWith('.js'));
// }

// function deletePlugin(pluginName) {
//   const pluginPath = path.join(PLUGINS_FOLDER, `${pluginName}.js`);
  
//   return new Promise((resolve, reject) => {
//     if (!fs.existsSync(pluginPath)) {
//       reject(new Error('Plugin not found'));
//       return;
//     }

//     fs.unlink(pluginPath, (err) => {
//       if (err) reject(err);
      
//       db.run('DELETE FROM plugins WHERE name = ?', [pluginName], (err) => {
//         if (err) reject(err);
//         resolve();
//       });
//     });
//   });
// }

// module.exports = {
//   savePlugin,
//   getInstalledPlugins,
//   deletePlugin,
//   PLUGINS_FOLDER
// };