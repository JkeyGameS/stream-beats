/**
 * Menu Commands Module (Refactored + Pagination, Fixed Callback Handling)
 */
const musicService = require('../services/music-service');
const playlistService = require('../services/playlist-service');
const logger = require('../utils/logger');
const botConfig = require('../config/bot-config');

// --- MEDIA CONFIGURATION ---
const menuMedia = {
    menu_music: {
        type: "photo",
        media: "https://t.me/Jkey_GameST/4587",
        caption: "" // Will be set dynamically
    },
    menu_settings: {
        type: "photo", 
        media: "https://t.me/Jkey_GameST/4585",
        caption: "" // Will be set dynamically
    }
};

// --- HELPERS ---
function escapeHTML(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
}

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
                [{ text: '« ʙᴀᴄᴋ »', callback_data: 'menu_main' }]
            ]
        }
    },
    menu_settings: {
        text: `<blockquote><b>⚙️ ᴍᴇɴᴜ ꜱᴇᴛᴛɪɴɢꜱ ✦</b></blockquote>

<blockquote>ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ʏᴏᴜʀ ᴄᴏɴᴛʀᴏʟ ᴄᴇɴᴛᴇʀ
ʜᴇʀᴇ ʏᴏᴜ ᴄᴀɴ ᴛᴜɴᴇ ʏᴏᴜʀ ᴇxᴘᴇʀɪᴇɴᴄᴇ, ᴀᴄᴄᴇꜱꜱ ʜᴇʟᴘ, ᴜᴛɪʟɪᴛɪᴇꜱ, ᴘʀᴇᴍɪᴜᴍ ᴘʟᴀɴꜱ, ʙᴏᴛ ɪɴꜰᴏ, ᴄʜᴀᴛ ꜱᴇᴛᴛɪɴɢꜱ & ᴍᴏʀᴇ</blockquote>

<blockquote>🔧 ᴄᴜꜱᴛᴏᴍɪᴢᴇ ʏᴏᴜʀ ꜱᴛʏʟᴇ  
🧠 ᴜɴʟᴏᴄᴋ ᴛᴏᴏʟꜱ  
🎵 ᴋᴇᴇᴘ ᴛʜᴇ ʙᴇᴀᴛꜱ ꜰʟᴏᴡɪɴɢ</blockquote>`,
        keyboard: {
            inline_keyboard: [
                [{ text: '📜 ʜᴇʟᴘ', callback_data: 'quick_help' }, { text: '🛠 ᴜᴛɪʟɪᴛʏ', callback_data: 'menu_utility' }],
                [{ text: '💳 ᴘʟᴀɴs', callback_data: 'menu_plans' }, { text: 'ℹ️ ʙᴏᴛ ɪɴғᴏ', callback_data: 'menu_info' }],
                [{ text: '👑 ᴏᴡɴᴇʀ', url: 'https://t.me/Jkey_GameS' }, { text: '💬 ᴄʜᴀᴛ', callback_data: 'menu_chat' }],
                [{ text: '🌍 ʟᴀɴɢᴜᴀɢᴇ', callback_data: 'menu_language' }, { text: '📊 sᴛᴀᴛs', callback_data: 'menu_stats' }],
                [{ text: '« ʙᴀᴄᴋ »', callback_data: 'menu_main' }]
            ]
        }
    }
};

// --- SEND / EDIT WRAPPER (UPDATED FOR MEDIA) ---
async function sendOrEdit(bot, chatId, msgId, text, keyboard, parseMode = 'HTML', menuType = null) {
    const options = { parse_mode: parseMode, reply_markup: keyboard };
    
    // If we have a menu type with media, handle media editing/sending
    if (menuType && menuMedia[menuType]) {
        const mediaConfig = { ...menuMedia[menuType] };
        mediaConfig.caption = text;
        mediaConfig.parse_mode = parseMode;
        
        if (msgId) {
            // Edit existing media message
            try {
                return await bot.editMessageMedia(mediaConfig, {
                    chat_id: chatId,
                    message_id: msgId,
                    reply_markup: keyboard
                });
            } catch (err) {
                const desc = err.response?.body?.description;
                if (desc?.includes('message is not modified')) {
                    logger.info(`Media message already up-to-date (chat: ${chatId})`);
                } else if (desc?.includes('no text in the message to edit') || 
                          desc?.includes('message to edit not found')) {
                    // Fallback to sending new media message
                    logger.info(`Cannot edit message (chat: ${chatId}), sending new media`);
                    return await bot.sendPhoto(chatId, mediaConfig.media, {
                        caption: text,
                        parse_mode: parseMode,
                        reply_markup: keyboard
                    });
                } else {
                    logger.error(`Error editing media message (chat: ${chatId}):`, err);
                    throw err;
                }
            }
        } else {
            // Send new media message
            return await bot.sendPhoto(chatId, mediaConfig.media, {
                caption: text,
                parse_mode: parseMode,
                reply_markup: keyboard
            });
        }
    }
    
    // Fallback to text message editing/sending
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
            text: '<blockquote><b>🎧 ᴍᴇɴᴜ ᴍᴜsɪᴄ</b></blockquote>\n\n<blockquote><b>⚠️ ɴᴏ ᴍᴜsɪᴄ ᴅᴏᴡɴʟᴏᴀᴅᴅ</b> ʏᴇᴛ</blockquote>\n\n<blockquote>ɢᴏ ʙᴀᴄᴋ ᴀɴᴅ ᴄʟɪᴄᴋ <b>✨ ɢᴇɴᴇʀᴀᴛᴇ ✨</b></blockquote>',
            keyboard: { inline_keyboard: [[{ text: '« ʙᴀᴄᴋ »', callback_data: 'menu_main' }]] },
            menuType: 'menu_music'
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

    return { text, keyboard, menuType: 'menu_music' };
}

// --- CALLBACK HANDLERS MAP (UPDATED) ---
const callbackHandlers = {
    menu_music: (bot, chatId, msg, args) => buildMusicPage(chatId, parseInt(args?.[0]) || 1),

    menu_playlists: () => ({
        text: '<blockquote><b>📂 ᴘʟᴀʏʟɪsᴛ ᴍᴇɴᴜ </b></blockquote>\n\n<blockquote>ᴜsᴇ /playlist ᴛᴏ ᴍᴀɴᴀɢᴇ ʏᴏᴜʀ ᴄᴏʟʟᴇᴄᴛɪᴏɴs!</blockquote>'
    }),

    menu_utility: () => ({
        text: '<blockquote><b>🛠 ᴜᴛɪʟɪᴛʏ ᴍᴇɴᴜ</b></blockquote>\n\n<blockquote>ɴᴇᴇᴅ ʙᴏᴛ ɪɴғᴏ ᴏʀ qᴜɪᴄᴋ ᴛᴏᴏʟs?</blockquote>',
        keyboard: {
            inline_keyboard: [
                [{ text: '📜 ʜᴇʟᴘ ɢᴜɪᴅᴇ', callback_data: 'utility_help' }, { text: '⚙️ ᴄᴏɴғɪɢᴜʀᴀᴛɪᴏɴ', callback_data: 'utility_config' }],
                [{ text: '📊 ᴍᴜsɪᴄ sᴛᴀᴛs', callback_data: 'utility_musicstats' }, { text: '⏱ sᴇʀᴠᴇʀ ᴛɪᴍᴇ', callback_data: 'utility_time' }],
                [{ text: '🗨 ᴄʜᴀᴛ ɪɴғᴏ', callback_data: 'utility_chatinfo' }, { text: '📶 ᴘɪɴɢ ᴛᴇsᴛ', callback_data: 'utility_ping' }],
                [{ text: '« ʙᴀᴄᴋ ᴛᴏ sᴇᴛᴛɪɴɢs', callback_data: 'menu_settings' }]
            ]
        }
    }),

    quick_play: () => ({
        text: '<blockquote><b>🎵 ǫᴜɪᴄᴋ ᴘʟᴀʏ</b></blockquote>\n\n<blockquote>Sᴇɴᴅ ᴀ sᴏɴɢ ɴᴀᴍᴇ ᴏʀ ʏᴏᴜᴛᴜʙᴇ/sᴘᴏᴛɪғʏ ʟɪɴᴋ ᴛᴏ sᴛᴀʀᴛ ᴘʟᴀʏɪɴɢ ɪɴsᴛᴀɴᴛʟʏ!</blockquote>\n<blockquote><b>Exᴀᴍᴘʟᴇ: <code>Bohemian Rhapsody</code></b></blockquote>'
    }),

    quick_help: () => ({
        text: botConfig.getHelpMessage ? botConfig.getHelpMessage() : 'ʜᴇʟᴘ ᴍᴇssᴀɢᴇ ɴᴏᴛ ᴄᴏɴғɪɢᴜʀᴇᴅ.'
    }),
            
    menu_main: (bot, chatId, msg) => {
        const userFirstName = (msg?.from?.first_name) || 'User';
        const newText = `<blockquote>🎧 ʜᴇʏ <b>${escapeHTML(userFirstName)}</b></blockquote>

<blockquote>🚀 ɪ'ᴍ ʏᴏᴜʀ ᴍᴜꜱɪᴄ ᴄᴏᴍᴘᴀɴɪᴏɴ—ʀᴇᴀᴅʏ ᴛᴏ ꜱᴛʀᴇᴀᴍ ᴀɴᴅ ᴅᴏᴡɴʟᴏᴀᴅ ꜱᴏɴɢꜱ ꜰʀᴏᴍ <b>ʏᴏᴜᴛᴜʙᴇ</b> & <b>ꜱᴘᴏᴛɪꜰʏ</b>, ᴡʜᴇᴛʜᴇʀ ʏᴏᴜ'ʀᴇ ᴄʜɪʟʟɪɴɢ ᴀʟᴏɴᴇ ᴏʀ ᴠɪʙɪɴɢ ɪɴ ᴀ ɢʀᴏᴜᴘ</blockquote>

<blockquote>🎶 ᴊᴜꜱᴛ ᴛᴀᴘ ᴍᴇ ᴡʜᴇɴ ʏᴏᴜ ɴᴇᴇᴅ ᴀ ʙᴇᴀᴛ, ᴀ ᴅʀᴏᴘ, ᴏʀ ᴀ ꜱᴏᴜɴᴅᴛʀᴀᴄᴋ ꜰᴏʀ ʏᴏᴜʀ ᴍᴏᴏᴅ</blockquote>

<blockquote>⚙️ ᴡᴀɴɴᴀ ᴋɴᴏᴡ ᴍʏ ꜰᴜʟʟ ᴘᴏᴡᴇʀꜱ? ᴄʟɪᴄᴋ <b>"ꜱᴇᴛᴛɪɴɢꜱ"</b> ʙᴇʟᴏᴡ ᴀɴᴅ ᴅɪꜱᴄᴏᴠᴇʀ ᴛʜᴇ ᴍᴀɢɪᴄ</blockquote>`;

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
        keyboard: menus.menu_settings.keyboard,
        menuType: 'menu_settings'
    })
};

// --- CALLBACK HANDLER (UPDATED) ---
async function handleCallback(bot, chatId, data, msg, messageId = null) {
    try {
        const [key, ...args] = data.split(':');
        const handler = callbackHandlers[key];
        
        if (!handler) {
            return {
                text: '<blockquote><b>❌ ᴜɴᴋɴᴏᴡɴ ᴀᴄᴛɪᴏɴ. ᴘʟᴇᴀsᴇ ᴜsᴇ ᴛʜᴇ ᴍᴇɴᴜ ʙᴜᴛᴛᴏɴs ᴏʀ ᴛʏᴘᴇ ᴀ ᴄᴏᴍᴍᴀɴᴅ</b></blockquote>',
                keyboard: { inline_keyboard: [[{ text: '« ʙᴀᴄᴋ »', callback_data: 'menu_main' }]] }
            };
        }
        
        const result = await handler(bot, chatId, msg, args) || {};
        
        // If we have a messageId (from callback query), use sendOrEdit with media support
        if (messageId && result.menuType) {
            await sendOrEdit(bot, chatId, messageId, result.text, result.keyboard, 'HTML', result.menuType);
            return null; // Return null to indicate we handled the message editing
        }
        
        return result;
        
    } catch (error) {
        logger.error(`Error in handleCallback (chat: ${chatId}, data: ${data}):`, error);
        return {
            text: '❌ ᴀɴ ᴇʀʀᴏʀ ᴏᴄᴄᴜʀʀᴇᴅ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ᴏʀ ᴄᴏɴᴛᴀᴄᴛ sᴜᴘᴘᴏʀᴛ.',
            keyboard: { inline_keyboard: [[{ text: '« ʙᴀᴄᴋ »', callback_data: 'menu_main' }]] }
        };
    }
}

// --- COMMAND SETUP ---
function setupMenuCommands(bot) {
    // Register callback query handler
    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        
        try {
            const result = await handleCallback(bot, chatId, data, callbackQuery, messageId);
            
            // If result is not null, we need to send/edit a message
            if (result) {
                await sendOrEdit(bot, chatId, messageId, result.text, result.keyboard, 'HTML', result.menuType);
            }
            
            // Answer the callback query to remove the loading state
            await bot.answerCallbackQuery(callbackQuery.id);
            
        } catch (error) {
            logger.error('Error handling callback query:', error);
            await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error processing request' });
        }
    });

    // Register commands for text triggers
    bot.onText(/^\/menu_music$/, async (msg) => {
        const result = await handleCallback(bot, msg.chat.id, 'menu_music:1', msg);
        if (result) {
            await sendOrEdit(bot, msg.chat.id, null, result.text, result.keyboard, 'HTML', result.menuType);
        }
    });

    bot.onText(/^\/menu_settings$/, async (msg) => {
        const result = await handleCallback(bot, msg.chat.id, 'menu_settings', msg);
        if (result) {
            await sendOrEdit(bot, msg.chat.id, null, result.text, result.keyboard, 'HTML', result.menuType);
        }
    });

    logger.info('Menu commands registered successfully');
}

module.exports = { setupMenuCommands, handleCallback };