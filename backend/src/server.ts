import { App } from './app';
import { config } from './config/config';

async function startServer() {
  try {
    console.log('Starting Telegram ToDo Bot Server...');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Port: ${config.port}`);

    const appInstance = new App();
    const app = await appInstance.initialize();

    const server = app.listen(config.port, () => {
      console.log(`🌐 Server running on port ${config.port}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/health`);
      console.log('📱 Telegram Bot is active and listening for messages');
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n⚡ Received ${signal}. Starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          console.error(' Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log(' HTTP server closed');
        console.log(' Process terminated gracefully');
        process.exit(0);
      });
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this file is executed directly
if (require.main === module) {
  startServer();
}