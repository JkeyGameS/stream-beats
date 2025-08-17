const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const logger = require('./utils/logger');

// Only start Express server if using webhook mode
const USE_WEBHOOK = process.env.USE_WEBHOOK === 'true';

if (USE_WEBHOOK) {
    const app = express();
    const PORT = process.env.PORT || 8000;
    const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
        logger.error('Bot token is required for webhook mode');
        process.exit(1);
    }

    // Middleware for parsing JSON
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            mode: 'webhook' 
        });
    });

    // Root endpoint
    app.get('/', (req, res) => {
        res.json({ 
            message: 'Telegram Bot Webhook Server', 
            status: 'running',
            endpoints: {
                health: '/health',
                webhook: `/bot${BOT_TOKEN}`
            }
        });
    });

    // Create bot instance for webhook mode
    const bot = new TelegramBot(BOT_TOKEN);
    
    // Setup commands and handlers
    const { setupCommands } = require('./bot/commands');
    const { setupHandlers } = require('./bot/handlers');
    setupCommands(bot);
    setupHandlers(bot);
    
    // Webhook endpoint for Telegram
    app.post(`/bot${BOT_TOKEN}`, (req, res) => {
        try {
            // Process the update
            bot.processUpdate(req.body);
            
            logger.info('Webhook update processed successfully');
            res.status(200).send('OK');
        } catch (error) {
            logger.error('Error processing webhook update:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
        logger.error('Express error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });

    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Webhook server running on port ${PORT}`);
        logger.info(`Webhook endpoint: /bot${BOT_TOKEN}`);
    });

    module.exports = app;
} else {
    logger.info('Webhook mode disabled. Using polling mode.');
}
