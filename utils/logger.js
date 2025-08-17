/**
 * Simple logger utility for the Telegram bot
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

function getCurrentTimestamp() {
    return new Date().toISOString();
}

function shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[LOG_LEVEL];
}

function formatMessage(level, message, data = null) {
    const timestamp = getCurrentTimestamp();
    const levelUpper = level.toUpperCase();
    let logMessage = `[${timestamp}] ${levelUpper}: ${message}`;
    
    if (data) {
        if (typeof data === 'object') {
            logMessage += '\n' + JSON.stringify(data, null, 2);
        } else {
            logMessage += ' ' + data;
        }
    }
    
    return logMessage;
}

const logger = {
    error: (message, data = null) => {
        if (shouldLog('error')) {
            console.error(formatMessage('error', message, data));
        }
    },
    
    warn: (message, data = null) => {
        if (shouldLog('warn')) {
            console.warn(formatMessage('warn', message, data));
        }
    },
    
    info: (message, data = null) => {
        if (shouldLog('info')) {
            console.log(formatMessage('info', message, data));
        }
    },
    
    debug: (message, data = null) => {
        if (shouldLog('debug')) {
            console.log(formatMessage('debug', message, data));
        }
    }
};

module.exports = logger;
