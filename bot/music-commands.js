/**
 * Music Commands Module
 * Handles all music-related bot commands
 */

const musicService = require('../services/music-service');
const playlistService = require('../services/playlist-service');
const logger = require('../utils/logger');

/**
 * Setup music commands for the bot
 * @param {TelegramBot} bot - The Telegram bot instance
 */
function setupMusicCommands(bot) {
    
    // Play command - Search and play music
    bot.onText(/\/play (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const query = match[1].trim();
        
        // Check rate limiting
        if (!musicService.canUserDownload(chatId)) {
            bot.sendMessage(chatId, '⏳ You have too many active downloads. Please wait for them to complete.')
                .catch(err => logger.error('Error sending rate limit message:', err));
            return;
        }
        
        const loadingMsg = await bot.sendMessage(chatId, '🔍 Searching for music...')
            .catch(err => logger.error('Error sending loading message:', err));
        
        try {
            musicService.startDownload(chatId);
            
            // Parse URL if provided, otherwise search
            const urlData = musicService.parseUrl(query);
            let results;
            
            if (urlData) {
                // Direct URL provided
                results = [await musicService.getTrackInfo(urlData.platform, urlData.id)];
                results[0].platform = urlData.platform;
                results[0].id = urlData.id;
            } else {
                // Search query
                results = await musicService.searchMusic(query, 'youtube', 1);
            }
            
            if (results.length === 0) {
                await bot.editMessageText('❌ No music found for: ' + query, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id
                });
                return;
            }
            
            const track = results[0];
            
            // Add to queue
            playlistService.addToQueue(chatId, track);
            
            // Download and send audio
            await bot.editMessageText('⬇️ Downloading audio...', {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
            
            let audioData;
            if (track.platform === 'youtube') {
                audioData = await musicService.getYouTubeAudioStream(track.id);
            } else if (track.platform === 'spotify') {
                audioData = await musicService.downloadFromSpotify(track.id);
            }
            
            if (audioData) {
                await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
                
                // Send audio file
                await bot.sendAudio(chatId, audioData.stream, {
                    title: audioData.info.title,
                    performer: audioData.info.author,
                    caption: `🎵 **${audioData.info.title}**\n👤 ${audioData.info.author}\n⏱️ Duration: ${Math.floor(audioData.info.duration / 60)}:${(audioData.info.duration % 60).toString().padStart(2, '0')}`,
                    parse_mode: 'Markdown'
                });
                
                playlistService.setPlaying(chatId, true);
                logger.info(`Played track "${audioData.info.title}" in chat ${chatId}`);
            }
            
        } catch (error) {
            logger.error('Error playing music:', error);
            await bot.editMessageText('❌ Error playing music: ' + error.message, {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
        } finally {
            musicService.endDownload(chatId);
        }
    });
    
    // Search command - Search for music without downloading
    bot.onText(/\/search (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const query = match[1].trim();
        const platform = 'youtube'; // Default platform
        
        const loadingMsg = await bot.sendMessage(chatId, '🔍 Searching...')
            .catch(err => logger.error('Error sending search loading:', err));
        
        try {
            const results = await musicService.searchMusic(query, platform, 5);
            
            if (results.length === 0) {
                await bot.editMessageText('❌ No results found for: ' + query, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id
                });
                return;
            }
            
            let message = `🎵 **Search Results for: ${query}**\n\n`;
            
            results.forEach((track, index) => {
                message += `${index + 1}. **${track.title}**\n`;
                message += `   👤 ${track.artist}\n`;
                message += `   ⏱️ ${track.duration}\n`;
                if (track.views) {
                    message += `   👁️ ${track.views.toLocaleString()} views\n`;
                }
                message += `   🔗 Use: \`/play ${track.url || track.id}\`\n\n`;
            });
            
            message += 'Use `/play <number>` or `/play <url>` to download and play.';
            
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'Markdown'
            });
            
        } catch (error) {
            logger.error('Error searching music:', error);
            await bot.editMessageText('❌ Search error: ' + error.message, {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
        }
    });
    
    // Queue command - Show current queue
    bot.onText(/\/queue/, (msg) => {
        const chatId = msg.chat.id;
        const queue = playlistService.getQueue(chatId);
        
        if (queue.songs.length === 0) {
            bot.sendMessage(chatId, '📝 Queue is empty. Use /play to add music!')
                .catch(err => logger.error('Error sending empty queue message:', err));
            return;
        }
        
        let message = `🎵 **Current Queue (${queue.songs.length} songs)**\n\n`;
        
        queue.songs.forEach((song, index) => {
            const isPlaying = index === queue.currentIndex;
            const icon = isPlaying ? '▶️' : '▫️';
            message += `${icon} ${index + 1}. **${song.title}**\n`;
            message += `   👤 ${song.artist} | ⏱️ ${song.duration}\n\n`;
        });
        
        if (queue.repeat) message += '🔁 Repeat: ON\n';
        if (queue.shuffle) message += '🔀 Shuffle: ON\n';
        
        message += '\nCommands: /skip, /previous, /clear, /repeat, /shuffle';
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
            .catch(err => logger.error('Error sending queue:', err));
    });
    
    // Skip command
    bot.onText(/\/skip/, (msg) => {
        const chatId = msg.chat.id;
        const nextSong = playlistService.nextSong(chatId);
        
        if (nextSong) {
            bot.sendMessage(chatId, `⏭️ Skipped to: **${nextSong.title}** by ${nextSong.artist}`, 
                { parse_mode: 'Markdown' })
                .catch(err => logger.error('Error sending skip message:', err));
        } else {
            bot.sendMessage(chatId, '❌ No more songs in queue')
                .catch(err => logger.error('Error sending no songs message:', err));
        }
    });
    
    // Previous command
    bot.onText(/\/previous/, (msg) => {
        const chatId = msg.chat.id;
        const prevSong = playlistService.previousSong(chatId);
        
        if (prevSong) {
            bot.sendMessage(chatId, `⏮️ Playing previous: **${prevSong.title}** by ${prevSong.artist}`, 
                { parse_mode: 'Markdown' })
                .catch(err => logger.error('Error sending previous message:', err));
        } else {
            bot.sendMessage(chatId, '❌ No previous songs')
                .catch(err => logger.error('Error sending no previous message:', err));
        }
    });
    
    // Clear queue command
    bot.onText(/\/clear/, (msg) => {
        const chatId = msg.chat.id;
        playlistService.clearQueue(chatId);
        
        bot.sendMessage(chatId, '🗑️ Queue cleared')
            .catch(err => logger.error('Error sending clear message:', err));
    });
    
    // Repeat command
    bot.onText(/\/repeat/, (msg) => {
        const chatId = msg.chat.id;
        const isRepeat = playlistService.toggleRepeat(chatId);
        
        const message = isRepeat ? '🔁 Repeat mode: ON' : '🔁 Repeat mode: OFF';
        bot.sendMessage(chatId, message)
            .catch(err => logger.error('Error sending repeat message:', err));
    });
    
    // Shuffle command
    bot.onText(/\/shuffle/, (msg) => {
        const chatId = msg.chat.id;
        const isShuffle = playlistService.toggleShuffle(chatId);
        
        const message = isShuffle ? '🔀 Shuffle mode: ON' : '🔀 Shuffle mode: OFF';
        bot.sendMessage(chatId, message)
            .catch(err => logger.error('Error sending shuffle message:', err));
    });
    
    // Playlist commands
    bot.onText(/\/playlist (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const args = match[1].trim().split(' ');
        const command = args[0].toLowerCase();
        
        try {
            switch (command) {
                case 'create':
                    if (args.length < 2) {
                        bot.sendMessage(chatId, '❌ Usage: /playlist create <name>')
                            .catch(err => logger.error('Error sending playlist create usage:', err));
                        return;
                    }
                    const playlistName = args.slice(1).join(' ');
                    await playlistService.createPlaylist(userId, playlistName);
                    bot.sendMessage(chatId, `✅ Created playlist: **${playlistName}**`, 
                        { parse_mode: 'Markdown' })
                        .catch(err => logger.error('Error sending playlist created:', err));
                    break;
                    
                case 'list':
                    const playlists = playlistService.getUserPlaylists(userId);
                    if (playlists.length === 0) {
                        bot.sendMessage(chatId, '📝 You have no playlists. Use `/playlist create <name>` to create one.', 
                            { parse_mode: 'Markdown' })
                            .catch(err => logger.error('Error sending no playlists:', err));
                    } else {
                        let message = '📝 **Your Playlists:**\n\n';
                        playlists.forEach((playlist, index) => {
                            message += `${index + 1}. **${playlist.name}**\n`;
                            message += `   🎵 ${playlist.songCount} songs\n`;
                            message += `   ⏱️ Total: ${playlistService.formatDuration(playlist.totalDuration)}\n\n`;
                        });
                        message += 'Use `/playlist show <name>` to view songs.';
                        
                        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
                            .catch(err => logger.error('Error sending playlists:', err));
                    }
                    break;
                    
                case 'show':
                    if (args.length < 2) {
                        bot.sendMessage(chatId, '❌ Usage: /playlist show <name>')
                            .catch(err => logger.error('Error sending playlist show usage:', err));
                        return;
                    }
                    const showPlaylistName = args.slice(1).join(' ');
                    const playlist = playlistService.getPlaylist(userId, showPlaylistName);
                    
                    if (!playlist) {
                        bot.sendMessage(chatId, '❌ Playlist not found')
                            .catch(err => logger.error('Error sending playlist not found:', err));
                        return;
                    }
                    
                    if (playlist.length === 0) {
                        bot.sendMessage(chatId, `📝 Playlist **${showPlaylistName}** is empty`, 
                            { parse_mode: 'Markdown' })
                            .catch(err => logger.error('Error sending empty playlist:', err));
                    } else {
                        let message = `🎵 **Playlist: ${showPlaylistName}**\n\n`;
                        playlist.forEach((song, index) => {
                            message += `${index + 1}. **${song.title}**\n`;
                            message += `   👤 ${song.artist} | ⏱️ ${song.duration}\n\n`;
                        });
                        message += `Use \`/playlist play ${showPlaylistName}\` to load into queue.`;
                        
                        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
                            .catch(err => logger.error('Error sending playlist songs:', err));
                    }
                    break;
                    
                case 'play':
                    if (args.length < 2) {
                        bot.sendMessage(chatId, '❌ Usage: /playlist play <name>')
                            .catch(err => logger.error('Error sending playlist play usage:', err));
                        return;
                    }
                    const loadPlaylistName = args.slice(1).join(' ');
                    const songsAdded = playlistService.loadPlaylistToQueue(chatId, userId, loadPlaylistName, true);
                    
                    bot.sendMessage(chatId, `✅ Loaded **${songsAdded}** songs from playlist **${loadPlaylistName}** to queue`, 
                        { parse_mode: 'Markdown' })
                        .catch(err => logger.error('Error sending playlist loaded:', err));
                    break;
                    
                case 'delete':
                    if (args.length < 2) {
                        bot.sendMessage(chatId, '❌ Usage: /playlist delete <name>')
                            .catch(err => logger.error('Error sending playlist delete usage:', err));
                        return;
                    }
                    const deletePlaylistName = args.slice(1).join(' ');
                    await playlistService.deletePlaylist(userId, deletePlaylistName);
                    
                    bot.sendMessage(chatId, `🗑️ Deleted playlist: **${deletePlaylistName}**`, 
                        { parse_mode: 'Markdown' })
                        .catch(err => logger.error('Error sending playlist deleted:', err));
                    break;
                    
                default:
                    const helpMsg = `📝 **Playlist Commands:**
                    
• \`/playlist create <name>\` - Create new playlist
• \`/playlist list\` - Show your playlists  
• \`/playlist show <name>\` - View playlist songs
• \`/playlist play <name>\` - Load playlist to queue
• \`/playlist delete <name>\` - Delete playlist

**Example:** \`/playlist create My Favorites\``;
                    
                    bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' })
                        .catch(err => logger.error('Error sending playlist help:', err));
            }
        } catch (error) {
            logger.error('Playlist command error:', error);
            bot.sendMessage(chatId, '❌ Playlist error: ' + error.message)
                .catch(err => logger.error('Error sending playlist error:', err));
        }
    });
    
    // Now playing command
    bot.onText(/\/nowplaying/, (msg) => {
        const chatId = msg.chat.id;
        const currentSong = playlistService.getCurrentSong(chatId);
        
        if (currentSong) {
            const message = `🎵 **Now Playing:**
            
**${currentSong.title}**
👤 ${currentSong.artist}
⏱️ Duration: ${currentSong.duration}
🎼 Platform: ${currentSong.platform}`;
            
            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
                .catch(err => logger.error('Error sending now playing:', err));
        } else {
            bot.sendMessage(chatId, '❌ Nothing is currently playing. Use /play to start!')
                .catch(err => logger.error('Error sending nothing playing:', err));
        }
    });
    
    // Music stats command
    bot.onText(/\/musicstats/, (msg) => {
        const chatId = msg.chat.id;
        const stats = musicService.getStats();
        const queue = playlistService.getQueue(chatId);
        
        const message = `📊 **Music Bot Statistics:**
        
🎵 Active Downloads: ${stats.activeDownloads}
📊 Queued Downloads: ${stats.queuedDownloads}
🎼 Spotify Enabled: ${stats.spotifyEnabled ? 'Yes' : 'No'}

**Your Queue:**
📝 Songs in Queue: ${queue.songs.length}
🎵 Currently Playing: ${queue.playing ? 'Yes' : 'No'}
🔁 Repeat Mode: ${queue.repeat ? 'On' : 'Off'}
🔀 Shuffle Mode: ${queue.shuffle ? 'On' : 'Off'}`;
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
            .catch(err => logger.error('Error sending music stats:', err));
    });
    
    logger.info('Music commands registered successfully');
}

module.exports = { setupMusicCommands };