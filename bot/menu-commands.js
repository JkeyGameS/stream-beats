/**
 * Menu Commands Module (Refactored + Pagination, Fixed Callback Handling)
 */
const musicService = require('../services/music-service');
const playlistService = require('../services/playlist-service');
const logger = require('../utils/logger');
const botConfig = require('../config/bot-config');

// --- HELPERS ---
function escapeHTML(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
}

// allow only safe tags for telegram (b, i, code, blockquote)
function safeHTML(text) {
    return text.replace(/<(?!\/?(b|i|code|blockquote)>)/g, '');
}

// --- MENU DEFINITIONS ---
const menus = {
    menu_music: {
        baseText: '<blockquote><b>ᴍᴇɴᴜ ᴍᴜsɪᴄ 🎧</b></blockquote>\n\n<blockquote>ᴛʜɪs ɪs ᴛʜᴇ ᴍᴜsɪᴄ ᴍᴇɴᴜ. ʜᴇʀᴇ ʏᴏᴜ ᴄᴀɴ ᴘʟᴀʏ, sᴛᴏᴘ, ɴᴇxᴛ, ᴘʀᴇᴠɪᴏᴜs ᴀɴᴅ ᴍᴀɴᴀɢᴇ ʏᴏᴜʀ ᴘʟᴀʏʟɪsᴛ</blockquote>',
        keyboard: {
            inline_keyboard: [
                [{ text: '▶️ ᴘʟᴀʏ', callback_data: 'music_play' }, { text: '⏸ sᴛᴏᴘ', callback_data: 'music_stop' }],
                [{ text: '⏭ ɴᴇxᴛ', callback_data: 'music_next' }, { text: '⏮ ᴘʀᴇᴠɪᴏᴜs', callback_data: 'music_previous' }],
                [{ text: '📂 ᴘʟᴀʏʟɪsᴛs', callback_data: 'menu_playlists' }],
                [{ text: '🎵 qᴜɪᴄᴋ ᴘʟᴀʏ', callback_data: 'quick_play' }],
                [{ text: '🔙 ʙᴀᴄᴋ', callback_data: 'menu_main' }]
            ]
        }
    },
    menu_settings: {
        text: `<blockquote><b>⚙️ ᴍᴇɴᴜ ꜱᴇᴛᴛɪɴɢꜱ ✦</b></blockquote>

<blockquote>ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ʏᴏᴜʀ ᴄᴏɴᴛʀᴏʟ ᴄᴇɴᴛᴇʀ
ʜᴇʀᴇ ʏᴏᴜ ᴄᴀɴ ᴛᴜɴᴇ ʏᴏᴜʀ ᴇxᴘᴇʀɪᴇɴᴄᴇ—ᴀᴄᴄᴇꜱꜱ ʜᴇʟᴘ, ᴜᴛɪʟɪᴛɪᴇꜱ, ᴘʀᴇᴍɪᴜᴍ ᴘʟᴀɴꜱ, ʙᴏᴛ ɪɴꜰᴏ, ᴄʜᴀᴛ ꜱᴇᴛᴛɪɴɢꜱ & ᴍᴏʀᴇ</blockquote>

<blockquote>🔧 ᴄᴜꜱᴛᴏᴍɪᴢᴇ ʏᴏᴜʀ ꜱᴛʏʟᴇ  
🧠 ᴜɴʟᴏᴄᴋ ᴛᴏᴏʟꜱ  
🎵 ᴋᴇᴇᴘ ᴛʜᴇ ʙᴇᴀᴛꜱ ꜰʟᴏᴡɪɴɢ</blockquote>`,
        keyboard: {
            inline_keyboard: [
                [{ text: '📜 ʜᴇʟᴘ', callback_data: 'quick_help' }, { text: '🛠 ᴜᴛɪʟɪᴛʏ', callback_data: 'menu_utility' }],
                [{ text: '💳 ᴘʟᴀɴs', callback_data: 'menu_plans' }, { text: 'ℹ️ ʙᴏᴛ ɪɴғᴏ', callback_data: 'menu_info' }],
                [{ text: '👑 ᴏᴡɴᴇʀ', url: 'https://t.me/Jkey_GameS' }, { text: '💬 ᴄʜᴀᴛ', callback_data: 'menu_chat' }],
                [{ text: '🌍 ʟᴀɴɢᴜᴀɢᴇ', callback_data: 'menu_language' }, { text: '📊 sᴛᴀᴛs', callback_data: 'menu_stats' }],
                [{ text: '🔙 ʙᴀᴄᴋ', callback_data: 'menu_main' }]
            ]
        }
    }
};


 // --- SEND / EDIT WRAPPER ---
function sendOrEdit(bot, chatId, msgId, text, keyboard, parseMode = 'HTML') {
    const options = { parse_mode: parseMode, reply_markup: keyboard };
    if (msgId) {
        return bot.editMessageText(text, { ...options, chat_id: chatId, message_id: msgId }).catch(err => {
            const desc = err.response?.body?.description;
            if (desc?.includes('message is not modified')) {
                logger.info(`Message already up-to-date (chat: ${chatId})`);
            } else if (desc?.includes('parse entities')) {
                return bot.editMessageText(safeHTML(text), {
                    chat_id: chatId,
                    message_id: msgId,
                    reply_markup: keyboard
                }).catch(fallbackErr => logger.error('Error with fallback edit:', fallbackErr));
            } else if (desc?.includes('no text in the message to edit')) {
                logger.info(`Cannot edit media message (chat: ${chatId}), sending new one`);
                return bot.sendMessage(chatId, text, options).catch(sendErr =>
                    logger.error('Error sending new message:', sendErr));
            } else {
                logger.error(`Error editing message (chat: ${chatId}):`, err);
            }
        });
    } else {
        return bot.sendMessage(chatId, text, options).catch(err => {
            const desc = err.response?.body?.description;
            if (desc?.includes('parse entities')) {
                return bot.sendMessage(chatId, safeHTML(text), { reply_markup: keyboard })
                    .catch(fallbackErr => logger.error('Error with fallback send:', fallbackErr));
            }
            logger.error(`Error sending message (chat: ${chatId}):`, err);
        });
    }
}

// --- PAGINATION HELPERS ---
function buildMusicPage(chatId, page = 1) {
    const songs = playlistService.getDownloadedSongs(chatId) || [];
    const perPage = 3;
    const totalPages = Math.max(1, Math.ceil(songs.length / perPage));
    const currentPage = Math.min(Math.max(1, page), totalPages);

    if (!songs.length) {
        return {
            text: '<blockquote><b>ᴍᴇɴᴜ ᴍᴜsɪᴄ 🎧</b></blockquote>\n\n<blockquote><b>⚠️ ɴᴏ ᴍᴜsɪᴄ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ</b> ʏᴇᴛ</blockquote>\n\n<blockquote>ɢᴏ ʙᴀᴄᴋ ᴀɴᴅ ᴄʟɪᴄᴋ <b>✨ ɢᴇɴᴇʀᴀᴛᴇ ✨</b></blockquote>',
            keyboard: { inline_keyboard: [[{ text: '🔙 ʙᴀᴄᴋ', callback_data: 'menu_main' }]] }
        };
    }

    const start = (currentPage - 1) * perPage;
    const pageSongs = songs.slice(start, start + perPage);

    const text = '<b>ᴍᴜsɪᴄ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ:</b>\n' +
        pageSongs.map((s, i) => `${start + i + 1}. ${escapeHTML(s.title)} - ${escapeHTML(s.artist)}`).join('\n') +
        `\n\n${menus.menu_music.baseText}\n\nᴘᴀɢᴇ ${currentPage}/${totalPages}`;

    // Base keyboard + pagination row
    const keyboard = JSON.parse(JSON.stringify(menus.menu_music.keyboard));
    if (totalPages > 1) {
        const navRow = [];
        if (currentPage > 1) navRow.push({ text: '◀', callback_data: `menu_music:${currentPage - 1}` });
        if (currentPage < totalPages) navRow.push({ text: '▶', callback_data: `menu_music:${currentPage + 1}` });
        keyboard.inline_keyboard.unshift(navRow);
    }

    return { text, keyboard };
}

// --- CALLBACK HANDLERS MAP ---
const callbackHandlers = {
    menu_music: (bot, chatId, msg, args) => buildMusicPage(chatId, parseInt(args?.[0]) || 1),

    menu_playlists: () => ({
        text: '📂 ᴘʟᴀʏʟɪsᴛ ᴍᴇɴᴜ\n\nᴜsᴇ /playlist ᴛᴏ ᴍᴀɴᴀɢᴇ ʏᴏᴜʀ ᴄᴏʟʟᴇᴄᴛɪᴏɴs!'
    }),

    menu_utility: () => ({
        text: '🛠 <b>ᴜᴛɪʟɪᴛʏ ᴍᴇɴᴜ</b> 🛠\nɴᴇᴇᴅ ʙᴏᴛ ɪɴғᴏ ᴏʀ qᴜɪᴄᴋ ᴛᴏᴏʟs?',
        keyboard: {
            inline_keyboard: [
                [{ text: '📜 ʜᴇʟᴘ ɢᴜɪᴅᴇ', callback_data: 'utility_help' }, { text: '⚙️ ᴄᴏɴғɪɢᴜʀᴀᴛɪᴏɴ', callback_data: 'utility_config' }],
                [{ text: '📊 ᴍᴜsɪᴄ sᴛᴀᴛs', callback_data: 'utility_musicstats' }, { text: '⏱ sᴇʀᴠᴇʀ ᴛɪᴍᴇ', callback_data: 'utility_time' }],
                [{ text: '🗨 ᴄʜᴀᴛ ɪɴғᴏ', callback_data: 'utility_chatinfo' }, { text: '📶 ᴘɪɴɢ ᴛᴇsᴛ', callback_data: 'utility_ping' }],
                [{ text: '🔙 ʙᴀᴄᴋ ᴛᴏ sᴇᴛᴛɪɴɢs', callback_data: 'menu_settings' }]
            ]
        }
    }),

    quick_play: () => ({
        text: '🎵 <b>qᴜɪᴄᴋ ᴘʟᴀʏ</b>\nSᴇɴᴅ ᴀ sᴏɴɢ ɴᴀᴍᴇ ᴏʀ ʏᴏᴜᴛᴜʙᴇ/sᴘᴏᴛɪғʏ ʟɪɴᴋ ᴛᴏ sᴛᴀʀᴛ ᴘʟᴀʏɪɴɢ ɪɴsᴛᴀɴᴛʟʏ!\nExᴀᴍᴘʟᴇ: <code>Bohemian Rhapsody</code>'
    }),

    quick_help: () => ({
        text: botConfig.getHelpMessage ? botConfig.getHelpMessage() : 'ʜᴇʟᴘ ᴍᴇssᴀɢᴇ ɴᴏᴛ ᴄᴏɴғɪɢᴜʀᴇᴅ.'
    }),
            
    menu_main: (bot, chatId, msg) => {
        // For callback queries, get the user from callbackQuery.from
        // For text messages, get the user from msg.from
        const userFirstName = (msg?.from?.first_name) || 'User';

        const newText = `<blockquote>🎧 ʜᴇʏ <b>${escapeHTML(userFirstName)}</b></blockquote>

<blockquote>🚀 ɪ'ᴍ ʏᴏᴜʀ ᴍᴜꜱɪᴄ ᴄᴏᴍᴘᴀɴɪᴏɴ—ʀᴇᴀᴅʏ ᴛᴏ ꜱᴛʀᴇᴀᴍ ᴀɴᴅ ᴅᴏᴡɴʟᴏᴀᴅ ꜱᴏɴɢꜱ ꜰʀᴏᴍ <b>ʏᴏᴜᴛᴜʙᴇ</b> & <b>ꜱᴘᴏᴛɪꜰʏ</b>, ᴡʜᴇᴛʜᴇʀ ʏᴏᴜ'ʀᴇ ᴄʜɪʟʟɪɴɢ ᴀʟᴏɴᴇ ᴏʀ ᴠɪʙɪɴɢ ɪɴ ᴀ ɢʀᴏᴜᴘ</blockquote>

<blockquote>🎶 ᴊᴜꜱᴛ ᴛᴀᴘ ᴍᴇ ᴡʜᴇɴ ʏᴏᴜ ɴᴇᴇᴅ ᴀ ʙᴇᴀᴛ, ᴀ ᴅʀᴏᴘ, ᴏʀ ᴀ ꜱᴏᴜɴᴅᴛʀᴀᴄᴋ ꜰᴏʀ ʏᴏᴜʀ ᴍᴏᴏᴅ</blockquote>

<blockquote>⚙️ ᴡᴀɴɴᴀ ᴋɴᴏᴡ ᴍʏ ꜰᴜʟʟ ᴘᴏᴡᴇʀꜱ? ᴄʟɪᴄᴋ <b>“ꜱᴇᴛᴛɪɴɢꜱ”</b> ʙᴇʟᴏᴡ ᴀɴᴅ ᴅɪꜱᴄᴏᴠᴇʀ ᴛʜᴇ ᴍᴀɢɪᴄ</blockquote>`;

        const welcome = botConfig.getWelcomeMessage
            ? botConfig.getWelcomeMessage(userFirstName)
            : null;

        const keyboard = welcome?.keyboard || {
            inline_keyboard: [
                [{ text: '⚙️ ꜱᴇᴛᴛɪɴɢꜱ', callback_data: 'menu_settings' }]
            ]
        };

        return { text: newText, keyboard };
    },

    menu_settings: () => ({
        text: menus.menu_settings.text,
        keyboard: menus.menu_settings.keyboard
    })
};

// --- CALLBACK HANDLER ---
async function handleCallback(bot, chatId, data, msg) {
    try {
        const [key, ...args] = data.split(':'); // supports menu_music:2
        const handler = callbackHandlers[key];
        if (!handler) {
            return {
                text: '❌ ᴜɴᴋɴᴏᴡɴ ᴀᴄᴛɪᴏɴ. ᴘʟᴇᴀsᴇ ᴜsᴇ ᴛʜᴇ ᴍᴇɴᴜ ʙᴜᴛᴛᴏɴs ᴏʀ ᴛʏᴘᴇ ᴀ ᴄᴏᴍᴍᴀɴᴅ.',
                keyboard: { inline_keyboard: [[{ text: '🔙 ʙᴀᴄᴋ', callback_data: 'menu_main' }]] }
            };
        }
        const result = await handler(bot, chatId, msg, args) || {};
        return result;
    } catch (error) {
        logger.error(`Error in handleCallback (chat: ${chatId}, data: ${data}):`, error);
        return {
            text: '❌ ᴀɴ ᴇʀʀᴏʀ ᴏᴄᴄᴜʀʀᴇᴅ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ᴏʀ ᴄᴏɴᴛᴀᴄᴛ sᴜᴘᴘᴏʀᴛ.',
            keyboard: { inline_keyboard: [[{ text: '🔙 ʙᴀᴄᴋ', callback_data: 'menu_main' }]] }
        };
    }
}

// --- COMMAND SETUP ---
function setupMenuCommands(bot) {
  // Register commands for text triggers
  bot.onText(/^\/menu_music$/, async (msg) => {
    const result = await handleCallback(bot, msg.chat.id, 'menu_music:1', msg);
    if (result) {
      // Always send a new message for text commands
      bot.sendMessage(msg.chat.id, result.text, {
        parse_mode: 'HTML',
        reply_markup: result.keyboard
      });
    }
  });

  bot.onText(/^\/menu_settings$/, async (msg) => {
    const result = await handleCallback(bot, msg.chat.id, 'menu_settings', msg);
    if (result) {
      // Always send a new message for text commands
      bot.sendMessage(msg.chat.id, result.text, {
        parse_mode: 'HTML',
        reply_markup: result.keyboard
      });
    }
  });

    
  logger.info('Menu commands registered successfully');
}

module.exports = { setupMenuCommands, handleCallback };