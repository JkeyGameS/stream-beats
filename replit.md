# StreamBeats Music Bot

## Overview

StreamBeats is a powerful Node.js Telegram music streaming and downloading bot built using the node-telegram-bot-api library. The bot features a comprehensive music system with YouTube and Spotify integration, playlist management, queue functionality, and advanced music streaming capabilities. It's designed with a modular architecture that separates music services, commands, handlers, and utilities, making it scalable and maintainable for deployment in private chats, groups, and channels.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure
- **Modular Design**: The bot is organized into separate modules for commands (`bot/commands.js`), handlers (`bot/handlers.js`), and utilities (`utils/logger.js`)
- **Entry Points**: Two main entry points - `index.js` for bot initialization and `server.js` for webhook server setup
- **Configuration Management**: Environment variables are used for configuration through dotenv package

### Bot Operation Modes
- **Polling Mode**: Default mode where the bot actively polls Telegram servers for updates
- **Webhook Mode**: Alternative mode where Telegram sends updates to a webhook endpoint
- **Mode Selection**: Determined by `USE_WEBHOOK` environment variable and `WEBHOOK_URL` configuration

### Command System
- **Command Registration**: Commands are registered using regex patterns with `bot.onText()`
- **Music Commands**: Play, search, queue management, playlist creation, skip/previous controls
- **Utility Commands**: Start, help, ping, config, time, chatinfo, and music statistics
- **Command Isolation**: All commands are centralized in the commands module for maintainability

### Message Handling
- **Text Messages**: Non-command text messages are handled separately from commands
- **Callback Queries**: Support for inline keyboard interactions through callback query handling
- **Group Events**: Handles new chat member events, including bot addition to groups

### Logging System
- **Custom Logger**: Utility module providing structured logging with timestamp and log levels
- **Log Levels**: Support for error, warn, info, and debug levels with configurable output
- **Structured Output**: JSON formatting for complex data objects in logs

### Server Architecture (Webhook Mode)
- **Express Server**: Optional HTTP server for webhook mode using Express.js
- **Health Endpoint**: `/health` endpoint for monitoring and status checks
- **Webhook Endpoint**: Dynamic webhook URL based on bot token for security
- **JSON Middleware**: Built-in JSON parsing for incoming webhook requests

## External Dependencies

### Core Dependencies
- **node-telegram-bot-api**: Primary library for Telegram Bot API integration and message handling
- **express**: Web framework used for webhook server implementation in webhook mode
- **dotenv**: Environment variable management for configuration loading

### Music Dependencies
- **@distube/ytdl-core**: YouTube video/audio downloading and streaming
- **spotify-web-api-node**: Spotify Web API integration for search and metadata
- **youtube-sr**: YouTube search functionality
- **axios**: HTTP client for API requests
- **node-fetch**: Fetch API for Node.js
- **fluent-ffmpeg**: Audio processing and format conversion

### Telegram Bot API
- **Bot Token**: Authentication through Telegram bot token (BOT_TOKEN or TELEGRAM_BOT_TOKEN)
- **Webhook Integration**: Optional webhook setup for receiving updates from Telegram servers
- **API Methods**: Uses various Telegram Bot API methods for sending messages and handling updates

### Environment Configuration
- **BOT_TOKEN/TELEGRAM_BOT_TOKEN**: Required bot authentication token
- **USE_WEBHOOK**: Boolean flag to enable webhook mode over polling
- **WEBHOOK_URL**: Base URL for webhook endpoint configuration
- **PORT**: Server port configuration (defaults to 8000)
- **LOG_LEVEL**: Configurable logging level (defaults to 'info')

### Music Service Configuration
- **SPOTIFY_CLIENT_ID**: Spotify API client ID for music search and metadata
- **SPOTIFY_CLIENT_SECRET**: Spotify API client secret for authentication
- **BOT_NAME**: Bot display name (defaults to 'MusicStream Bot')
- **BOT_DESCRIPTION**: Bot description for welcome messages
- **MAX_DOWNLOAD_SIZE**: Maximum file size for downloads (defaults to 50MB)
- **MAX_QUEUE_SIZE**: Maximum songs in queue (defaults to 100)
- **DEFAULT_PLATFORM**: Default music platform (youtube/spotify)

## Recent Changes

### Major Update: Music Bot Transformation (August 13, 2025)
- **NEW FEATURE**: Complete transformation into StreamBeats music streaming & downloading bot
- **MUSIC INTEGRATION**: Added YouTube and Spotify search, download, and streaming capabilities
- **PLAYLIST SYSTEM**: Implemented user playlist creation, management, and queue system
- **COMMAND EXPANSION**: Added 10+ new music commands (play, search, queue, skip, etc.)
- **ARCHITECTURE**: Added modular music services with rate limiting and error handling
- **CONFIGURATION**: Enhanced bot config system with music-specific settings
- **DOCUMENTATION**: Updated all help messages and welcome text for music bot functionality

### Latest Bug Fixes Applied (August 13, 2025)
- **CRITICAL**: Fixed Markdown parsing error in welcome message (removed @ mentions causing entity errors)
- **MAJOR**: Resolved duplicate callback query handlers between handlers.js and menu-commands.js
- **RELIABILITY**: Added graceful error handling for message modification attempts (prevents crashes on duplicate edits)
- **INTEGRATION**: Improved Spotify API error handling with proper fallbacks when credentials missing
- **STATUS**: Spotify integration now working correctly with provided credentials
- **LOGGING**: Enhanced callback query error logging with proper message distinction

### Previous Bug Fixes Applied (August 13, 2025)
- **CRITICAL**: Fixed bot detection logic in group events (was comparing user ID with bot token)
- **MAJOR**: Resolved circular dependency between server.js and index.js
- **SECURITY**: Added rate limiting to prevent message spam (1 second cooldown per user)
- **SECURITY**: Limited echo command length to prevent abuse (500 character maximum)
- **RELIABILITY**: Added automatic polling restart on network errors with 5-second delay
- **LOGGING**: Improved message logging with length truncation for better readability
- **WEBHOOK**: Fixed webhook mode bot instance creation to avoid circular dependencies