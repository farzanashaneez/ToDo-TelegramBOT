import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-todo-bot',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminTelegramId: process.env.ADMIN_TELEGRAM_ID || ''
};

// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'JWT_SECRET', 'ADMIN_TELEGRAM_ID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(` Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}