const logger = require('../utils/logger');
const menuCommands = require('./menu-commands'); // to ensure callback handling can interlink

/**
 * Setup message handlers and other bot event handlers
 * @param {TelegramBot} bot - The Telegram bot instance
 */
function setupHandlers(bot) {

    // --- TEXT MESSAGES ---
    bot.on('message', (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;

        handleTextMessage(bot, msg.chat.id, msg.text, msg.from.first_name || 'User', msg);
    });

    // --- NEW CHAT MEMBERS ---
    bot.on('new_chat_members', async (msg) => {
        const chatId = msg.chat.id;
        const newMembers = msg.new_chat_members;

        const botInfo = await bot.getMe().catch(err => {
            logger.error('Error getting bot info:', err);
            return null;
        });

        newMembers.forEach(async (member) => {
            if (member.is_bot && botInfo && member.id === botInfo.id) {
                // The bot was added to a group
                const welcomeMessage = `
💓 Hello everyone! Welcome to StreamBeats!

🎵 I'm your music streaming & playlist companion for this group!

**Quick Commands:**
• /music - Music controls menu
• /play <song> - Play any song instantly
• /search <song> - Search for music
• /playlist - Manage group playlists

⚡ Powered by Jkey GameS ⚡

Type /help for the complete guide or /music to start jamming!
                `;
                await bot.sendMessage(chatId, welcomeMessage).catch(err => logger.error('Error sending group welcome:', err));
            } else if (!member.is_bot) {
                const memberName = member.first_name || 'New Member';
                await bot.sendMessage(chatId, `👋 Welcome ${memberName} to the group!`).catch(err => logger.error('Error sending member welcome:', err));
            }
        });
    });

    // --- LEFT CHAT MEMBER ---
    bot.on('left_chat_member', async (msg) => {
        const leftMember = msg.left_chat_member;
        if (!leftMember || leftMember.is_bot) return;

        const memberName = leftMember.first_name || 'Member';
        await bot.sendMessage(msg.chat.id, `👋 Goodbye ${memberName}!`).catch(err => logger.error('Error sending goodbye message:', err));
    });

    // Callback queries are handled in commands.js to avoid duplication

    logger.info('Bot handlers registered successfully');
}

/**
 * Handle regular text messages
 */
function handleTextMessage(bot, chatId, messageText, firstName, msg) {
    const lowerText = messageText.toLowerCase();

    // Rate limiting (1 message per second per user)
    const userId = msg.from.id;
    const now = Date.now();
    handleTextMessage.lastMessages = handleTextMessage.lastMessages || {};
    if (handleTextMessage.lastMessages[userId] && now - handleTextMessage.lastMessages[userId] < 1000) return;
    handleTextMessage.lastMessages[userId] = now;

    let response = '';

    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
        response = `👋 Hello ${firstName}! How can I help you today?`;
    } else if (lowerText.includes('how are you') || lowerText.includes('how do you do')) {
        response = `🤖 I'm doing great! Thanks for asking. How are you?`;
    } else if (lowerText.includes('bye') || lowerText.includes('goodbye') || lowerText.includes('see you')) {
        response = `👋 Goodbye ${firstName}! Have a great day!`;
    } else if (lowerText.includes('thank')) {
        response = `😊 You're welcome! Happy to help!`;
    } else if (lowerText.includes('help')) {
        response = '🆘 I can help you! Try using /help to see all available commands.';
    } else if (lowerText.includes('joke') || lowerText.includes('funny')) {
        const jokes = [
            'Why don\'t scientists trust atoms? Because they make up everything! 😄',
            'Why did the robot go to therapy? It had too many bugs! 🤖',
            'What do you call a bear with no teeth? A gummy bear! 🐻',
            'Why don\'t programmers like nature? It has too many bugs! 🐛'
        ];
        response = jokes[Math.floor(Math.random() * jokes.length)];
    } else {
        response = `📝 I received your message: "${messageText}"\n\nTry sending me:\n• "hello" for a greeting\n• "help" for assistance\n• "joke" for a laugh\n• Or use /help for all commands`;
    }

    bot.sendMessage(chatId, response).catch(err => {
        logger.error('Error sending text response:', err);
        bot.sendMessage(chatId, '❌ Sorry, I encountered an error while processing your message.')
            .catch(retryErr => logger.error('Error sending fallback text response:', retryErr));
    });
}

module.exports = { setupHandlers, handleTextMessage };