# Telegram Bot

A JavaScript Telegram bot with modular architecture and smart message handling.

## Features

- **Commands**: /start, /help, /ping, /echo, /time, /chatinfo
- **Smart Responses**: Responds intelligently to greetings, questions, and requests
- **Group Support**: Welcomes new members and handles group events
- **Modular Design**: Organized code structure for easy maintenance

## Deployment

### Railway (Free)

1. Fork this repository or upload your code to GitHub
2. Go to [Railway.app](https://railway.app) and sign up
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variable: `BOT_TOKEN` with your Telegram bot token
6. Deploy automatically starts

### Render (Free)

1. Fork this repository or upload your code to GitHub  
2. Go to [Render.com](https://render.com) and sign up
3. Click "New Web Service" → Connect your GitHub repo
4. Configure:
   - Build Command: `npm install`
   - Start Command: `node index.js`
5. Add environment variable: `BOT_TOKEN` with your Telegram bot token
6. Deploy

### Environment Variables

- `BOT_TOKEN` - Your Telegram bot token (required)
- `LOG_LEVEL` - Logging level (optional, default: info)

## Local Development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and add your bot token
3. Run: `npm start`

## Getting a Bot Token

1. Open Telegram and search for "@BotFather"
2. Start a chat and send `/newbot`
3. Follow instructions to create your bot
4. Copy the token provided by BotFather