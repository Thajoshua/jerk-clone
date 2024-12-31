const { Index, commands } = require('../lib/');
const wordChainGames = new Map();
const gameScores = new Map();

Index({
    pattern: 'wordchain',
    fromMe: true,
    desc: '🔤 Advanced word chain game',
    type: 'games'
}, async (message) => {
    if (!message.isGroup) return await message.reply('❌ Groups only!');
    if (wordChainGames.has(message.jid)) return await message.reply('❌ Game already running!');

    const game = {
        phase: 'joining',
        players: new Set(),
        currentPlayer: null,
        usedWords: new Set(),
        lastWord: '',
        requiredLength: 4, // Starting word length
        targetLetter: '',
        scores: new Map(),
        joinTimer: null,
        turnTimer: null,
        reminderInterval: null
    };

    wordChainGames.set(message.jid, game);

    // Set join phase timer
    game.joinTimer = setTimeout(() => startGame(message), 60000);

    // Set reminder interval
    game.reminderInterval = setInterval(async () => {
        await message.reply(
            `*⏳ Waiting for players...*\n\n` +
            `• Players joined: ${game.players.size}\n` +
            `• Need minimum: 2 players\n` +
            `• Type *join* to play!`
        );
    }, 15000);

    await message.reply(
        '*🎯 ADVANCED WORD CHAIN*\n\n' +
        '• Type *join* to play\n' +
        '• Words must contain random letter\n' +
        '• Word length increases over time\n' +
        '• 30 seconds per turn\n\n' +
        '⏳ Joining phase: 60 seconds'
    );
});

Index({
    pattern: 'leaderboard',
    fromMe: false,
    desc: 'Show word chain leaderboard',
    type: 'games'
}, async (message) => {
    const scores = [...gameScores.entries()]
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    if (!scores.length) return await message.reply('No scores yet!');

    const leaderboard = scores
        .map(([jid, score], i) => 
            `${i + 1}. @${jid.split('@')[0]} - ${score} points`)
        .join('\n');

    await message.reply(
        '*🏆 WORD CHAIN LEADERBOARD*\n\n' + leaderboard
    );
});

async function startGame(message) {
    const game = wordChainGames.get(message.jid);
    clearInterval(game.reminderInterval);

    if (game.players.size < 2) {
        await message.reply('❌ Not enough players!');
        wordChainGames.delete(message.jid);
        return;
    }

    game.phase = 'playing';
    game.currentPlayer = Array.from(game.players)[0];
    game.targetLetter = '';

    await message.reply(
        '*🎮 Game Started!*\n\n' +
        `• First player: @${game.currentPlayer.split('@')[0]}\n` +
        `• Required length: ${game.requiredLength}\n` +
        `• Send any word to begin!`
    );

    game.turnTimer = setTimeout(() => endTurn(message), 30000);
}

async function validateWord(message, word) {
    const game = wordChainGames.get(message.jid);
    
    // Check word length
    if (word.length < game.requiredLength) {
        return `❌ Word must be ${game.requiredLength} letters or longer!`;
    }

    // Check target letter
    if (game.targetLetter && !word.includes(game.targetLetter)) {
        return `❌ Word must contain the letter '${game.targetLetter}'!`;
    }

    // Check if word used
    if (game.usedWords.has(word)) {
        return '❌ Word already used!';
    }

    // Validate with dictionary API
    try {
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (response.data && Array.isArray(response.data) && response.data[0]?.word) {
            return null; // Word is valid
        }
        return '❌ Invalid word!';
    } catch {
        return '❌ Invalid word!';
    }

}

Index({
    on: 'text',
    fromMe: false,
    dontAddCommandList: true
}, async (message) => {
    const game = wordChainGames.get(message.jid);
    if (!game) return;

    if (game.phase === 'joining' && message.text.toLowerCase() === 'join') {
        if (!game.players.has(message.sender)) {
            game.players.add(message.sender);
            await message.reply(`✅ @${message.sender.split('@')[0]} joined!`);
        }
        return;
    }

    if (game.phase === 'playing' && message.sender === game.currentPlayer) {
        const word = message.text.toLowerCase();
        const error = await validateWord(message, word);
        
        if (error) {
            await message.reply(error);
            return;
        }

        // Update game state
        game.usedWords.add(word);
        game.lastWord = word;
        
        // Pick random letter from current word for next word
        game.targetLetter = word[Math.floor(Math.random() * word.length)];
        
        // Increase required length every 5 words
        if (game.usedWords.size % 5 === 0) {
            game.requiredLength++;
        }

        // Update scores
        const points = word.length;
        const currentScore = game.scores.get(message.sender) || 0;
        game.scores.set(message.sender, currentScore + points);
        
        // Update global scores
        const globalScore = gameScores.get(message.sender) || 0;
        gameScores.set(message.sender, globalScore + points);

        // Next player
        const players = Array.from(game.players);
        const currentIndex = players.indexOf(game.currentPlayer);
        game.currentPlayer = players[(currentIndex + 1) % players.length];

        clearTimeout(game.turnTimer);
        game.turnTimer = setTimeout(() => endTurn(message), 30000);

        await message.reply(
            `✅ Valid word: *${word}*\n` +
            `Required letter: *${game.targetLetter}*\n` +
            `Min length: *${game.requiredLength}*\n` +
            `Next: @${game.currentPlayer.split('@')[0]}\n` +
            `Points: +${points}`
        );
    }
});

// Add helper function to get participant name
async function getParticipantName(message, jid) {
    try {
        const groupMeta = await message.groupMetadata(message.jid);
        const participant = groupMeta.participants.find(p => p.id === jid);
        return participant?.name || jid.split('@')[0];
    } catch (error) {
        return jid.split('@')[0];
    }
}

async function endTurn(message) {
    const game = wordChainGames.get(message.jid);
    if (!game) return;

    clearTimeout(game.turnTimer);

    // Remove failed player
    game.players.delete(game.currentPlayer);
    const playerName = await getParticipantName(message, game.currentPlayer);

    // Check win condition
    if (game.players.size === 1) {
        const winner = Array.from(game.players)[0];
        const winnerScore = game.scores.get(winner) || 0;
        const winnerName = await getParticipantName(message, winner);

        // Sort all players by score
        const finalScores = [...game.scores.entries()]
            .sort(([,a], [,b]) => b - a)
            .map(async ([jid, score]) => {
                const name = await getParticipantName(message, jid);
                return `${name}: ${score} points`;
            });

        await message.reply(
            '*🎮 Game Over!*\n\n' +
            `🏆 Winner: ${winnerName}\n` +
            `Final Score: ${winnerScore} points\n\n` +
            '*Scores:*\n' + (await Promise.all(finalScores)).join('\n')
        );

        wordChainGames.delete(message.jid);
        return;
    }

    // Continue game with next player
    const players = Array.from(game.players);
    game.currentPlayer = players[Math.floor(Math.random() * players.length)];
    const nextPlayerName = await getParticipantName(message, game.currentPlayer);

    await message.reply(
        `❌ ${playerName} has been eliminated!\n` +
        `Players remaining: ${game.players.size}\n\n` +
        `Next player: ${nextPlayerName}\n` +
        `Required letter: *${game.targetLetter}*\n` +
        `Min length: *${game.requiredLength}*\n` +
        `⏳ 30 seconds`
    );

    game.turnTimer = setTimeout(() => endTurn(message), 30000);
}

async function getFinalScores(message, game) {
    const scorePromises = [...game.scores.entries()].map(async ([jid, score]) => ({
        name: await getParticipantName(message, jid),
        score,
        eliminated: !game.players.has(jid)
    }));

    const scores = (await Promise.all(scorePromises))
        .sort((a, b) => b.score - a.score)
        .map((entry, i) => 
            `${i + 1}. ${entry.name}: ${entry.score} points ${entry.eliminated ? '❌' : ''}`
        )
        .join('\n');

    return scores;
}

async function endGame(message) {
    const game = wordChainGames.get(message.jid);
    
    // Get final scores with group names
    const scorePromises = [...game.scores.entries()].map(async ([jid, score]) => ({
        name: await getParticipantName(message, jid),
        score,
        jid
    }));
    
    const scores = (await Promise.all(scorePromises))
        .sort((a, b) => b.score - a.score)
        .map((entry, i) => `${i + 1}. ${entry.name}: ${entry.score} points`)
        .join('\n');

    const winner = (await Promise.all(scorePromises))
        .sort((a, b) => b.score - a.score)[0];

    await message.reply(
        '*🎮 Game Over!*\n\n' +
        `🏆 Winner: ${winner.name}\n\n` +
        '*Final Scores:*\n' + scores
    );

    wordChainGames.delete(message.jid);
}