const { default: axios } = require('axios');
const config = require('../config.js');
const { Index } = require('../lib/');
const fetch = require('node-fetch');


// Warn system
const warns = new Map();

function warnUser(jid) {
  const current = warns.get(jid) || 0;
  warns.set(jid, current + 1);
  return current + 1;
}

Index({
  pattern: 'antibadword ?(.*)',
  fromMe: true,
  desc: 'Configure anti-badword settings',
  type: 'admin'
}, async (message, match) => {
  const input = await message.getUserInput('Please provide the command and arguments:');
  const [command, ...args] = input.trim().split(' ');

  switch (command) {
    case 'on':
      config.ANTIBADWORD.enabled = true;
      break;

    case 'off':
      config.ANTIBADWORD.enabled = false;
      break;

    case 'action':
      const action = args[0];
      if (['warn', 'delete', 'kick'].includes(action)) {
        config.ANTIBADWORD.action = action;
      } else {
        return await message.reply('Invalid action. Use: warn, delete, or kick');
      }
      break;

    case 'limit':
      const limit = parseInt(args[0]);
      if (isNaN(limit) || limit < 1) {
        return await message.reply('Please provide a valid warn limit (positive integer).');
      }
      config.ANTIBADWORD.warnLimit = limit;
      break;

    case 'add':
      const wordToAdd = args.join(' ').toLowerCase();
      if (config.ANTIBADWORD.badwords.includes(wordToAdd)) {
        return await message.reply('This word is already in the bad words list.');
      }
      config.ANTIBADWORD.badwords.push(wordToAdd);
      break;

    case 'remove':
      const wordToRemove = args.join(' ').toLowerCase();
      const index = config.ANTIBADWORD.badwords.indexOf(wordToRemove);
      if (index === -1) {
        return await message.reply('This word is not in the bad words list.');
      }
      config.ANTIBADWORD.badwords.splice(index, 1);
      break;

    case 'list':
      return await message.reply(`Bad words list:\n${config.ANTIBADWORD.badwords.join(', ')}`);

    default:
      return await message.reply(`
Anti-badword settings:
Enabled: ${config.ANTIBADWORD.enabled}
Action: ${config.ANTIBADWORD.action}
Warn Limit: ${config.ANTIBADWORD.warnLimit}

Commands:
.antibadword on/off
.antibadword action <warn/delete/kick>
.antibadword limit <number>
.antibadword add <word>
.antibadword remove <word>
.antibadword list
      `);
  }
  return await message.reply(`Anti-badword configuration updated: ${command}`);
});

Index({
    pattern: 'warn ?(.*)',
    fromMe: true,
    desc: 'Warn a user',
    type: 'admin'
  }, async (message, match) => {
    const input = await message.getUserInput('Please provide the user and reason:');
    const [user, ...reason] = input.trim().split(' ');
  
    if (!user) {
      return await message.reply('Please provide a user to warn.');
    }
  
    const jid = user.includes('@') ? user : `${
      user.includes('@') ? user : user.includes(' ') ? user : user + '@s.whatsapp.net'
    }`;

    const warnLimit = config.WarnLimit?.warnLimit || 5; // Default limit is 5
    const warnCount = warnUser(jid);

    await message.reply(`User warned. Total warns: ${warnCount}/${warnLimit}`);

    if (warnCount >= warnLimit) {
      await message.reply(`User has reached the warning limit (${warnLimit})`);
      // Reset warns for this user
      warns.set(jid, 0);
      
      // Here you can add additional actions like kick/ban
      try {
        await message.groupParticipantsUpdate(message.jid, [jid], "remove");
        await message.reply('User has been removed from the group due to excessive warnings');
      } catch (err) {
        await message.reply('Failed to remove user from group');
      }
    }
  }
);


const activeGames = {};

const TURN_TIMEOUT = 30000; // 30 seconds for each turn
const GAME_DURATION = 300000; // 5 minutes total game time
const WAITING_DURATION = 60000; // 1 minute waiting period
const REMINDER_INTERVAL = 15000; // Reminder every 15 seconds


function getMention(jid) {
    return `@${jid.split('@')[0]}`;
}


async function isValidWord(word) {
    try {
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        return response.data.word !== 'No Definitions Found';
    } catch (error) {
        console.error('Error checking word validity:', error);
        return false;
    }
}

Index({
    pattern: 'wcg',
    desc: 'Start or end the Word Chain game',
    type: 'game',
    onlyGroup: true
}, async (message) => {
    const chat = message.chat;
    const sender = message.sender;
    const userInput = message.getUserInput().toLowerCase().trim();

    if (userInput === 'start') {
        if (activeGames[chat]) {
            await message.reply('A game is already in progress in this chat!');
            return;
        }

        activeGames[chat] = {
            status: 'waiting',
            players: new Set([sender]),
            scores: { [sender]: 0 },
            wordCount: { [sender]: 0 },
            lastWord: '',
            usedWords: new Set()
        };

        await message.reply('Word Chain game is starting! You have 1 minute to join. Type "join" to participate.');
        
        let reminderCount = 0;
        const reminderInterval = setInterval(async () => {
            if (activeGames[chat] && activeGames[chat].status === 'waiting') {
                reminderCount++;
                if (reminderCount < 4) { // Send 3 reminders
                    await message.reply(`Reminder: Word Chain game is waiting for players! Type "join" to participate. ${Math.floor((WAITING_DURATION - reminderCount * REMINDER_INTERVAL) / 1000)} seconds left.`);
                } else {
                    clearInterval(reminderInterval);
                    if (activeGames[chat].players.size < 2) {
                        await message.reply('Not enough players joined. Game cancelled.');
                        delete activeGames[chat];
                    } else {
                        await startGame(chat, message);
                    }
                }
            } else {
                clearInterval(reminderInterval);
            }
        }, REMINDER_INTERVAL);

    } else if (userInput === 'end') {
        if (!activeGames[chat]) {
            await message.reply('No active game in this chat.');
            return;
        }
        await endGame(chat, message);
    } else {
        await message.reply('Use "wcg start" to start a new game or "wcg end" to end the current game.');
    }
});

async function startGame(chat, message) {
    const game = activeGames[chat];
    game.status = 'active';
    game.currentPlayer = [...game.players][Math.floor(Math.random() * game.players.size)];

    game.gameTimer = setTimeout(() => endGame(chat, message, true), GAME_DURATION);
    startTurn(chat, message);

    const playerList = [...game.players].map(player => getMention(player)).join(', ');
    await message.reply(`Game started! Players: ${playerList}\n${getMention(game.currentPlayer)}, start by saying a word!`);
}

async function startTurn(chat, message) {
    const game = activeGames[chat];
    game.turnTimer = setTimeout(() => timeoutPlayer(chat, message), TURN_TIMEOUT);
}

async function timeoutPlayer(chat, message) {
    const game = activeGames[chat];
    const timedOutPlayer = game.currentPlayer;

    await message.reply(`${getMention(timedOutPlayer)} took too long to respond and has been removed from the game.`);

    game.players.delete(timedOutPlayer);

    if (game.players.size < 2) {
        await endGame(chat, message, false, `Not enough players remaining.`);
        return;
    }

    // Move to the next player
    const players = [...game.players];
    const currentIndex = players.indexOf(timedOutPlayer);
    game.currentPlayer = players[(currentIndex + 1) % players.length];

    await message.reply(`Next player: ${getMention(game.currentPlayer)}, say a word${game.lastWord ? ` starting with "${game.lastWord[game.lastWord.length - 1]}"` : ''}!`);
    startTurn(chat, message);
}

async function playTurn(chat, sender, word, message) {
    const game = activeGames[chat];

    if (sender !== game.currentPlayer) {
        await message.reply(`It's not your turn! Waiting for ${getMention(game.currentPlayer)} to play.`);
        return;
    }

    clearTimeout(game.turnTimer);

    if (!(await isValidWord(word))) {
        await message.reply('Invalid word. Please use a real English word.');
        startTurn(chat, message);
        return;
    }

    if (game.usedWords.has(word)) {
        await message.reply('This word has already been used. Try another one!');
        startTurn(chat, message);
        return;
    }

    if (game.lastWord && word[0].toLowerCase() !== game.lastWord[game.lastWord.length - 1].toLowerCase()) {
        await message.reply(`Your word must start with the letter "${game.lastWord[game.lastWord.length - 1]}".`);
        startTurn(chat, message);
        return;
    }

    // Valid move
    game.lastWord = word;
    game.usedWords.add(word);
    game.scores[sender] += word.length;
    game.wordCount[sender]++;

    // Move to next player
    const players = [...game.players];
    const currentIndex = players.indexOf(game.currentPlayer);
    game.currentPlayer = players[(currentIndex + 1) % players.length];

    await message.reply(`Valid word: ${word}\nScore: +${word.length}\nNext player: ${getMention(game.currentPlayer)}, say a word starting with "${word[word.length - 1]}"`);
    startTurn(chat, message);
}

async function endGame(chat, message, timeout = false, reason = '') {
    const game = activeGames[chat];
    clearTimeout(game.gameTimer);
    clearTimeout(game.turnTimer);

    let endMessage = timeout ? "Time's up! " : "";
    endMessage += reason ? reason + " " : "";
    endMessage += "Game Over!\n\nFinal Scores:";

    for (const [player, score] of Object.entries(game.scores)) {
        if (game.players.has(player)) {
            endMessage += `\n${getMention(player)}: ${score} points (${game.wordCount[player]} words)`;
        }
    }

    const winner = [...game.players].reduce((a, b) => game.scores[a] > game.scores[b] ? a : b);
    endMessage += `\n\nWinner: ${getMention(winner)}!`;

    await message.reply(endMessage);
    delete activeGames[chat];
}

// Modified message handler to allow joining and playing without prefix
Index({
    on: 'message',
    fromMe: false,
    dontAddCommandList: true,
}, async (message) => {
    const chat = message.chat;
    const sender = message.sender;
    const userInput = message.text.toLowerCase().trim();

    if (activeGames[chat]) {
        if (activeGames[chat].status === 'waiting' && userInput === 'join' && !activeGames[chat].players.has(sender)) {
            activeGames[chat].players.add(sender);
            activeGames[chat].scores[sender] = 0;
            activeGames[chat].wordCount[sender] = 0;
            await message.reply(`${getMention(sender)} has joined the Word Chain game!`);
        } else if (activeGames[chat].status === 'active') {
            playTurn(chat, sender, userInput, message);
        }
    }
});