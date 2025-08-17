/**
 * Menu Commands Module
 * Handles all menu-based navigation commands
 */

const musicService = require('../services/music-service');
const playlistService = require('../services/playlist-service');
const logger = require('../utils/logger');
const botConfig = require('../config/bot-config'); // make sure this exists

function escapeMarkdown(text) {
    return text ? text.replace(/([_*[\]()~`>#+-=|{}.!])/g, '\\$1') : '';
}

// Menu keyboards and texts
const menus = {
    menu_music: {
        text: '*ᴍᴇɴᴜ ᴍᴜsɪᴄ 🎧*\n\nᴛʜɪs ɪs ᴛʜᴇ ᴍᴜsɪᴄ ᴍᴇɴᴜ. ʜᴇʀᴇ ʏᴏᴜ ᴄᴀɴ ᴘʟᴀʏ, sᴛᴏᴘ, ɴᴇxᴛ, ᴘʀᴇᴠɪᴏᴜs ᴀɴᴅ ᴍᴀɴᴀɢᴇ ʏᴏᴜʀ ᴘʟᴀʏʟɪsᴛs.',
        keyboard: {
            inline_keyboard: [
                [
                    { text: '▶️ ᴘʟᴀʏ', callback_data: 'music_play' },
                    { text: '⏸ sᴛᴏᴘ', callback_data: 'music_stop' }
                ],
                [
                    { text: '⏭ ɴᴇxᴛ', callback_data: 'music_next' },
                    { text: '⏮ ᴘʀᴇᴠɪᴏᴜs', callback_data: 'music_previous' }
                ],
                [
                    { text: '📂 ᴘʟᴀʏʟɪsᴛs', callback_data: 'menu_playlists' }
                ],
                [
                    { text: '🎵 qᴜɪᴄᴋ ᴘʟᴀʏ', callback_data: 'quick_play' }
                ],
                [
                    { text: '🔙 ʙᴀᴄᴋ', callback_data: 'menu_main' }
                ]
            ]
        }
    },
    menu_settings: {
        text: '*ᴍᴇɴᴜ sᴇᴛᴛɪɴɢs ⚙️*\n\nᴛʜɪs ɪs ᴛʜᴇ sᴇᴛᴛɪɴɢs ᴍᴇɴᴜ. ʜᴇʀᴇ ʏᴏᴜ ᴄᴀɴ ᴀᴄᴄᴇss ʜᴇʟᴘ, ᴜᴛɪʟɪᴛɪᴇs, ᴘʟᴀɴs, ʙᴏᴛ ɪɴғᴏ, ᴄʜᴀᴛ ᴀɴᴅ ᴍᴏʀᴇ.',
        keyboard: {
            inline_keyboard: [
                [
                    { text: '📜 ʜᴇʟᴘ', callback_data: 'quick_help' },
                    { text: '🛠 ᴜᴛɪʟɪᴛʏ', callback_data: 'menu_utility' }
                ],
                [
                    { text: '💳 ᴘʟᴀɴs', callback_data: 'menu_plans' },
                    { text: 'ℹ️ ʙᴏᴛ ɪɴғᴏ', callback_data: 'menu_info' }
                ],
                [
                    { text: '👑 ᴏᴡɴᴇʀ', url: 'https://t.me/YourUsername' },
                    { text: '💬 ᴄʜᴀᴛ', callback_data: 'menu_chat' }
                ],
                [
                    { text: '🌍 ʟᴀɴɢᴜᴀɢᴇ', callback_data: 'menu_language' },
                    { text: '📊 sᴛᴀᴛs', callback_data: 'menu_stats' }
                ],
                [
                    { text: '🔙 ʙᴀᴄᴋ', callback_data: 'menu_main' }
                ]
            ]
        }
    }
};

function setupMenuCommands(bot) {
    // Respond to /menu_music
    bot.onText(/^\/menu_music$/, async (msg) => {
        const chatId = msg.chat.id;
        let userDownloadedSongs = playlistService.getDownloadedSongs(chatId); 
        let musicText, musicKeyboard;

        if (userDownloadedSongs && userDownloadedSongs.length > 0) {
            musicText = '*ᴍᴜsɪᴄ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ:*\n'
                + userDownloadedSongs.slice(0, 3).map((s, i) =>
                    `${i + 1}. ${escapeMarkdown(s.title)} - ${escapeMarkdown(s.artist)}`
                  ).join('\n')
                + `\n\n${menus.menu_music.text}`;
            musicKeyboard = menus.menu_music.keyboard;
        } else {
            musicText = '*ɴᴏ ᴍᴜsɪᴄ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ* ʏᴇᴛ ᴏʀ ʀᴇᴍᴏᴠᴇᴅ.\nᴘʟs ɢᴏ ʙᴀᴄᴋ ᴛᴏ ᴛʜᴇ ᴍᴀɪɴ ᴍᴇɴᴜ ᴀɴᴅ ᴄʟɪᴄᴋ \'✨ ɢᴇɴᴇʀᴀᴛᴇ ✨\' ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ ᴀ sᴏɴɢ.';
            musicKeyboard = {
                inline_keyboard: [
                    [{ text: '🔙 ʙᴀᴄᴋ', callback_data: 'menu_main' }]
                ]
            };
        }
        bot.sendMessage(chatId, musicText, {
            parse_mode: 'MarkdownV2',
            reply_markup: musicKeyboard
        }).catch(err => logger.error('Error sending menu_music:', err));
    });

    // Respond to /menu_settings
    bot.onText(/^\/menu_settings$/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, menus.menu_settings.text, {
            parse_mode: 'MarkdownV2',
            reply_markup: menus.menu_settings.keyboard
        }).catch(err => logger.error('Error sending menu_settings:', err));
    });

    // Handle callbacks
    bot.on('callback_query', async (callbackQuery) => {
        const msg = callbackQuery.message;
        const chatId = msg.chat.id;
        const data = callbackQuery.data;

        bot.answerCallbackQuery(callbackQuery.id).catch(err =>
            logger.error('Error answering callback query:', err)
        );

        try {
            switch (data) {
                case 'menu_music': {
                    let userDownloadedSongs = [];
                    try {
                        userDownloadedSongs = playlistService.getDownloadedSongs(chatId) || [];
                    } catch (err) {
                        logger.error('Error fetching downloaded songs:', err);
                    }

                    let musicText, musicKeyboard;

                    if (userDownloadedSongs.length > 0) {
                        musicText = '*ᴍᴜsɪᴄ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ:*\n'
                            + userDownloadedSongs.slice(0, 3).map((s, i) =>
                                `${i + 1}. ${escapeMarkdown(s.title)} - ${escapeMarkdown(s.artist)}`
                            ).join('\n')
                            + `\n\n${menus.menu_music.text}`;
                        musicKeyboard = menus.menu_music.keyboard || { inline_keyboard: [] };
                    } else {
                        musicText = '*ɴᴏ ᴍᴜsɪᴄ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ* ʏᴇᴛ ᴏʀ ʀᴇᴍᴏᴠᴇᴅ.\nᴘʟs ɢᴏ ʙᴀᴄᴋ ᴛᴏ ᴛʜᴇ ᴍᴀɪɴ ᴍᴇɴᴜ ᴀɴᴅ ᴄʟɪᴄᴋ \'✨ ɢᴇɴᴇʀᴀᴛᴇ ✨\' ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ ᴀ sᴏɴɢ.';
                        musicKeyboard = {
                            inline_keyboard: [
                                [{ text: '🔙 ʙᴀᴄᴋ', callback_data: 'menu_main' }]
                            ]
                        };
                    }

                    bot.editMessageText(musicText, {
                        chat_id: chatId,
                        message_id: msg.message_id,
                        parse_mode: 'MarkdownV2',
                        reply_markup: musicKeyboard
                    }).catch(err => {
                        if (err.response?.body?.description.includes('message is not modified')) {
                            logger.info('Message already shows this content, skipping update');
                        } else {
                            logger.error('Error editing message (menu_music):', err);
                        }
                    });
                    break;
                }

                case 'menu_playlists': {
                    const playlistsText = '📂 *ᴘʟᴀʏʟɪsᴛ ᴍᴇɴᴜ*\n\nᴜsᴇ /playlist ᴛᴏ ᴍᴀɴᴀɢᴇ ʏᴏᴜʀ ᴄᴏʟʟᴇᴄᴛɪᴏɴs!';
                    bot.editMessageText(playlistsText, {
                        chat_id: chatId,
                        message_id: msg.message_id,
                        parse_mode: 'MarkdownV2',
                    }).catch(err => {
                        if (err.response?.body?.description.includes('message is not modified')) {
                            logger.info('Message already shows this content, skipping update');
                        } else {
                            logger.error('Error editing message (menu_playlists):', err);
                        }
                    });
                    break;
                }

                case 'menu_utility': {
                    const utilityText = `🛠 *ᴜᴛɪʟɪᴛʏ ᴍᴇɴᴜ* 🛠\nɴᴇᴇᴅ ʙᴏᴛ ɪɴғᴏ ᴏʀ ǫᴜɪᴄᴋ ᴛᴏᴏʟs?`;
                    const utilityKeyboard = {
                        inline_keyboard: [
                            [
                                { text: '📜 ʜᴇʟᴘ ɢᴜɪᴅᴇ', callback_data: 'utility_help' },
                                { text: '⚙️ ᴄᴏɴғɪɢᴜʀᴀᴛɪᴏɴ', callback_data: 'utility_config' }
                            ],
                            [
                                { text: '📊 ᴍᴜsɪᴄ sᴛᴀᴛs', callback_data: 'utility_musicstats' },
                                { text: '⏱ sᴇʀᴠᴇʀ ᴛɪᴍᴇ', callback_data: 'utility_time' }
                            ],
                            [
                                { text: '🗨 ᴄʜᴀᴛ ɪɴғᴏ', callback_data: 'utility_chatinfo' },
                                { text: '📶 ᴘɪɴɢ ᴛᴇsᴛ', callback_data: 'utility_ping' }
                            ],
                            [
                                { text: '🔙 ʙᴀᴄᴋ ᴛᴏ ᴍᴀɪɴ ᴍᴇɴᴜ', callback_data: 'menu_main' }
                            ]
                        ]
                    };
                    bot.editMessageText(utilityText, {
                        chat_id: chatId,
                        message_id: msg.message_id,
                        parse_mode: 'MarkdownV2',
                        reply_markup: utilityKeyboard
                    }).catch(err => {
                        if (err.response?.body?.description.includes('message is not modified')) {
                            logger.info('Message already shows this content, skipping update');
                        } else {
                            logger.error('Error editing message (menu_utility):', err);
                        }
                    });
                    break;
                }

                case 'quick_play': {
                    const quickPlayMessage = `🎵 *ǫᴜɪᴄᴋ ᴘʟᴀʏ*\n\nsᴇɴᴅ ᴍᴇ ᴀ sᴏɴɢ ɴᴀᴍᴇ ᴏʀ ʏᴏᴜᴛᴜʙᴇ/Spotify ʟɪɴᴋ ᴛᴏ sᴛᴀʀᴛ ᴘʟᴀʏɪɴɢ ᴍᴜsɪᴄ ɪɴsᴛᴀɴᴛʟʏ!\n\nExample: \`Bohemian Rhapsody\` or paste any music link`;
                    bot.sendMessage(chatId, quickPlayMessage, { parse_mode: 'MarkdownV2' })
                        .catch(err => logger.error('Error sending quick_play:', err));
                    break;
                }

                case 'quick_help': {
                    const helpMessage = botConfig.getHelpMessage ? botConfig.getHelpMessage() : 'Help message not configured.';
                    bot.sendMessage(chatId, escapeMarkdown(helpMessage), { parse_mode: 'MarkdownV2' })
                        .catch(err => logger.error('Error sending quick_help:', err));
                    break;
                }

                case 'menu_main': {
                    const welcome = botConfig.getWelcomeMessage
                        ? botConfig.getWelcomeMessage(callbackQuery.from.first_name || 'User')
                        : { text: 'Welcome!', keyboard: { inline_keyboard: [] } };

                    bot.editMessageText(escapeMarkdown(welcome.text), {
                        chat_id: chatId,
                        message_id: msg.message_id,
                        parse_mode: 'MarkdownV2',
                        reply_markup: welcome.keyboard
                    }).catch(err => {
                        if (err.response?.body?.description.includes('message is not modified')) {
                            logger.info('Message already shows this content, skipping update');
                        } else {
                            logger.error('Error editing message (menu_main):', err);
                        }
                    });
                    break;
                }

                default:
                    bot.sendMessage(chatId, "❌ Unknown action. Please use the menu buttons or type a command.");
                    break;
            }
        } catch (error) {
            logger.error('Error handling callback query:', error);
            bot.sendMessage(chatId, "❌ An error occurred. Please try again or contact support.");
        }
    });

    logger.info('Menu commands registered successfully');
}

module.exports = { setupMenuCommands };