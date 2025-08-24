const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();

const { setupCommands } = require('./bot/commands');
const { setupHandlers } = require('./bot/handlers');
const logger = require('./utils/logger');

// Get bot token from environment variables
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    logger.error('Bot token is required. Please set BOT_TOKEN or TELEGRAM_BOT_TOKEN environment variable.');
    process.exit(1);
}

// Bot configuration
const USE_WEBHOOK = process.env.USE_WEBHOOK === 'true';
const WEBHOOK_URL = process.env.WEBHOOK_URL || `https://${process.env.RENDER_APP_NAME || 'stream-beats'}.onrender.com`;
const PORT = process.env.PORT || 8000;

let bot;

if (USE_WEBHOOK) {
    // Webhook mode - for production (Render)
    logger.info('Starting bot in webhook mode...');
    
    // Create Express app for webhook
    const app = express();
    
    // Middleware to parse JSON
    app.use(express.json());
    
    // Initialize bot without polling
    bot = new TelegramBot(BOT_TOKEN);
    
    // Set webhook route
    app.post(`/bot${BOT_TOKEN}`, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });

    // Health check endpoint
    app.get('/', (req, res) => {
        res.json({ 
            status: 'Bot is running in webhook mode',
            webhook_url: `${WEBHOOK_URL}/bot${BOT_TOKEN}`,
            timestamp: new Date().toISOString()
        });
    });

    app.get('/health', (req, res) => {
        res.json({ 
            status: 'ok', 
            bot: 'online',
            mode: 'webhook',
            timestamp: new Date().toISOString()
        });
    });

    // Set webhook on startup
    bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`)
        .then(() => {
            logger.info(`Webhook set to: ${WEBHOOK_URL}/bot${BOT_TOKEN}`);
        })
        .catch(err => {
            logger.error('Failed to set webhook:', err);
        });

    // Start Express server
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Webhook server running on port ${PORT}`);
    });

} else {
    // Polling mode - for development
    logger.info('Starting bot in polling mode...');
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    
    // Create minimal Express server for health checks (optional)
    const app = express();
    
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'ok', 
            bot: 'online',
            mode: 'polling',
            timestamp: new Date().toISOString()
        });
    });

    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Health server running on port ${PORT}`);
    });
}

// Setup bot commands and handlers
setupCommands(bot);
setupHandlers(bot);

// Error handling
bot.on('error', (error) => {
    logger.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
    logger.error('Polling error:', error);
    
    // Only handle polling errors if in polling mode
    if (!USE_WEBHOOK) {
        if (error.code === 'EFATAL' || error.code === 'ETELEGRAM') {
            logger.info('Attempting to restart polling in 5 seconds...');
            setTimeout(() => {
                try {
                    bot.stopPolling();
                    setTimeout(() => {
                        bot.startPolling();
                        logger.info('Polling restarted successfully');
                    }, 1000);
                } catch (restartError) {
                    logger.error('Failed to restart polling:', restartError);
                }
            }, 5000);
        }
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down gracefully...');
    
    if (USE_WEBHOOK) {
        bot.deleteWebHook()
            .then(() => {
                logger.info('Webhook deleted successfully');
                process.exit(0);
            })
            .catch(err => {
                logger.error('Error deleting webhook:', err);
                process.exit(1);
            });
    } else {
        bot.stopPolling()
            .then(() => {
                logger.info('Polling stopped successfully');
                process.exit(0);
            })
            .catch(err => {
                logger.error('Error stopping polling:', err);
                process.exit(1);
            });
    }
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down gracefully...');
    
    if (USE_WEBHOOK) {
        bot.deleteWebHook()
            .then(() => {
                logger.info('Webhook deleted successfully');
                process.exit(0);
            })
            .catch(err => {
                logger.error('Error deleting webhook:', err);
                process.exit(1);
            });
    } else {
        bot.stopPolling()
            .then(() => {
                logger.info('Polling stopped successfully');
                process.exit(0);
            })
            .catch(err => {
                logger.error('Error stopping polling:', err);
                process.exit(1);
            });
    }
});

logger.info('Telegram bot started successfully!');

module.exports = bot;