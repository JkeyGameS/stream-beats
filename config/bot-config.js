/**
 * Bot Configuration Module
 * Handles all bot-related configuration settings
 */

const logger = require('../utils/logger');

class BotConfig {
    constructor() {
        // Bot Identity Settings
        this.name = process.env.BOT_NAME || 'Stream Beats';
        this.id = process.env.BOT_ID || 'Stream_BeatsBot';
        this.Owner = process.env.OWNER_NAME || 'Jkey_GameS';
        this.description = process.env.BOT_DESCRIPTION || 'A powerful music streaming & downloading bot for Telegram';
        this.version = process.env.BOT_VERSION || '1.0.0';

        // Feature Settings
        this.welcomeMessage = process.env.WELCOME_MESSAGE || null;
        this.adminUserId = process.env.ADMIN_USER_ID || null;
        this.enableLogging = process.env.ENABLE_LOGGING !== 'false';

        // Rate Limiting
        this.rateLimitCooldown = parseInt(process.env.RATE_LIMIT_COOLDOWN) || 1000; // 1 second
        this.maxEchoLength = parseInt(process.env.MAX_ECHO_LENGTH) || 500;

        // Commands Configuration
        this.enabledCommands = this.parseEnabledCommands();

        // Music-specific settings
        this.maxDownloadSize = parseInt(process.env.MAX_DOWNLOAD_SIZE) || 50 * 1024 * 1024; // 50MB
        this.maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE) || 100;
        this.defaultPlatform = process.env.DEFAULT_PLATFORM || 'youtube';

        logger.info('Bot configuration loaded:', {
            name: this.name,
            description: this.description,
            version: this.version,
            enabledCommands: this.enabledCommands
        });
    }

    parseEnabledCommands() {
        // ✅ Default set includes BOTH normal commands and menu aliases
        const defaultCommands = [
            'start', 'help', 'ping', 'play', 'search', 'queue', 'skip', 'previous',
            'playlist', 'nowplaying', 'musicstats', 'config', 'time', 'chatinfo',
            'music', 'utility', 'searchmenu', 'chat',
            'playRequest', 'searchRequest', 'queueAdd', 'playlistCreate',
            'chatSupport', 'askHelp',
            // menu command aliases (so /menu_music works too)
            'menu_music', 'menu_settings', 'menu_playlists', 'menu_utility', 'menu_feedback', 'menu_leaderboard'
        ];

        const envCommands = process.env.ENABLED_COMMANDS;
        if (envCommands) {
            return envCommands.split(',').map(cmd => cmd.trim().toLowerCase());
        }
        return defaultCommands;
    }

    // Getters for easy access
    getName() { return this.name; }
    getDescription() { return this.description; }
    getVersion() { return this.version; }

    getWelcomeMessage(firstName = 'User') {
        if (this.welcomeMessage) {
            return this.welcomeMessage
                .replace('{name}', firstName)
                .replace('{bot_name}', this.name)
                .replace('{owner}', this.Owner);
        }

        return {
            text: `<blockquote>🐥 ᴡᴇʟᴄᴏᴍᴇ, ${firstName}, ᴛᴏ <b><a href="https://t.me/${this.id}">🎧 ˹sᴛꝛᴇᴀᴍ ʙᴇᴀᴛs˼ 🫧</a></b> — ʏᴏᴜʀ ᴍᴜsɪᴄ sᴛʀᴇᴀᴍɪɴɢ ᴄᴏᴍᴘᴀɴɪᴏɴ ᴏɴ ᴛᴇʟᴇɢʀᴀᴍ</blockquote>

<blockquote>╭☉︎ <b>ғᴇᴀᴛᴜʀᴇs:</b>  
➻ ᴘʟᴀʏ & ᴅᴏᴡɴʟᴏᴀᴅ sᴏɴɢs ғʀᴏᴍ ʏᴏᴜᴛᴜʙᴇ & sᴘᴏᴛɪꜰʏ  
➻ ʜɪɢʜ-ǫᴜᴀʟɪᴛʏ, 24/7 ʟᴀɢ-ꜰʀᴇᴇ ᴀᴜᴅɪᴏ  
➻ ᴄʀᴇᴀᴛᴇ ᴀɴᴅ sᴀᴠᴇ ᴘʟᴀʏʟɪsᴛs  
➻ ɴᴏ ᴀᴅs ᴏʀ ʟɪᴍɪᴛs — ᴊᴜsᴛ ᴍᴜsɪᴄ  
➻ sɪᴍᴘʟᴇ ᴄᴏᴍᴍᴀɴᴅs ғᴏʀ ǫᴜɪᴄᴋ ᴄᴏɴᴛʀᴏʟ  
➻ ᴀʟᴡᴀʏs ᴏɴʟɪɴᴇ ᴀɴᴅ ʀᴇʟɪᴀʙʟᴇ  

╰☉︎ ᴘᴏᴡᴇʀᴇᴅ ʙʏ <b><a href="https://t.me/${this.Owner}">ᴊᴋᴇʏ ɢᴀᴍᴇs</a></b> ⚡
</blockquote>`,
            keyboard: {
                inline_keyboard: [
                    [{ text: '✨ ɢᴇɴᴇʀᴀᴛᴇ ✨', callback_data: 'menu_search' }],
                    [
                        { text: '🎧 ᴍᴜsɪᴄ', callback_data: 'menu_music' },
                        { text: 'sᴇᴛᴛɪɴɢs ⚙️', callback_data: '/menu_settings' }
                    ],
                    [{ text: '➕ ᴀᴅᴅ ᴍᴇ ➕', url: `https://t.me/${this.id}?startgroup=true` }]
                ]
            }
        };
    }

    getHelpMessage() {
        return `
🎵 ${this.name} - Complete Help Guide

**🎶 MUSIC COMMANDS:**
• \`/play <song name>\` - Search and play music
• \`/play <youtube/spotify url>\` - Play from direct URL
• \`/search <song name>\` - Search without downloading
• \`/queue\` - Show current queue
• \`/skip\` - Skip to next song
• \`/previous\` - Play previous song
• \`/repeat\` - Toggle repeat mode
• \`/shuffle\` - Toggle shuffle mode
• \`/clear\` - Clear current queue
• \`/nowplaying\` - Show current track info

**📝 PLAYLIST MANAGEMENT:**
• \`/playlist create <name>\` - Create new playlist
• \`/playlist list\` - Show your playlists
• \`/playlist show <name>\` - View playlist contents
• \`/playlist play <name>\` - Load playlist to queue
• \`/playlist delete <name>\` - Delete playlist

**⚡ UTILITY COMMANDS:**
• \`/start\` - Show welcome message
• \`/help\` - Show this help
• \`/ping\` - Test bot responsiveness
• \`/config\` - Bot configuration
• \`/musicstats\` - Music bot statistics
• \`/time\` - Current server time
• \`/chatinfo\` - Chat information
• \`/menu_music\` - Open Music Menu
• \`/menu_settings\` - Open Settings Menu

**🔗 SUPPORTED PLATFORMS:**
• YouTube (direct links & search)
• Spotify (track links & search)
• Automatic platform detection

**📱 WORKS IN:**
• Private chats
• Group chats
• Channels (with proper permissions)

Bot Version: ${this.version} | Send music links or use /play!

**Note:** Bot needs proper permissions in groups/channels to send audio files.
        `;
    }

    isCommandEnabled(command) {
        return this.enabledCommands.includes(command.toLowerCase());
    }

    getRateLimitCooldown() { return this.rateLimitCooldown; }
    getMaxEchoLength() { return this.maxEchoLength; }
    getAdminUserId() { return this.adminUserId; }

    isAdmin(userId) {
        return this.adminUserId && parseInt(this.adminUserId) === parseInt(userId);
    }

    updateName(newName) {
        this.name = newName;
        logger.info(`Bot name updated to: ${newName}`);
    }

    updateDescription(newDescription) {
        this.description = newDescription;
        logger.info(`Bot description updated to: ${newDescription}`);
    }

    getBotInfo() {
        return {
            name: this.name,
            description: this.description,
            version: this.version,
            enabledCommands: this.enabledCommands,
            rateLimitCooldown: this.rateLimitCooldown,
            maxEchoLength: this.maxEchoLength
        };
    }
}

// Create and export singleton instance
const botConfig = new BotConfig();
module.exports = botConfig;