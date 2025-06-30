import winston from 'winston';
import fs from 'fs/promises';

const loggers = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'youtube-to-megaphone' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

// Add method to get recent logs
loggers.getRecentLogs = async function() {
  try {
    const logs = await fs.readFile('combined.log', 'utf8');
    const lines = logs.split('\n').filter(line => line.trim());
    // Return last 50 lines
    return lines.slice(-50).join('\n');
  } catch (error) {
    return 'No logs available';
  }
};

export const logger = loggers;