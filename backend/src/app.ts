import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/config';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/error.middleware';
import { createRoutes } from './routes';

// Import repositories
import { UserRepository } from './repositories/UserRepository';
import { GroupRepository } from './repositories/GroupRepository';
import { TaskRepository } from './repositories/TaskRepository';
import { NotificationRepository } from './repositories/NotificationRepository';

// Import use cases
import { UserUseCase } from './domain/usecases/UserUseCase';
import { GroupUseCase } from './domain/usecases/GroupUseCase';
import { TaskUseCase } from './domain/usecases/TaskUseCase';

// Import controllers
import { UserController } from './controllers/UserController';
import { GroupController } from './controllers/GroupController';
import { TaskController } from './controllers/TaskController';

// Import middleware
import { AuthMiddleware } from './middleware/auth.middleware';

// Import services
import { TelegramBotService } from './infrastructure/telegram/TelegramBot';
import { NotificationService } from './services/NotificationService';
import { TaskService } from './services/TaskService';

export class App {
  private app: express.Application;
  private telegramBot!: TelegramBotService;
  private notificationService!: NotificationService;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
  }

  private initializeMiddlewares() {
    // Security middlewares
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Logging
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    console.log('✅ Middlewares initialized');
  }

  private async initializeDependencies() {
    // Initialize repositories
    const userRepository = new UserRepository();
    const groupRepository = new GroupRepository();
    const taskRepository = new TaskRepository();
    const notificationRepository = new NotificationRepository();

    // Initialize use cases
    const userUseCase = new UserUseCase(userRepository);
    const groupUseCase = new GroupUseCase(groupRepository, userRepository);
    const taskUseCase = new TaskUseCase(taskRepository, groupRepository, notificationRepository);

    // Initialize controllers
    const userController = new UserController(userUseCase);
    const groupController = new GroupController(groupUseCase);
    const taskController = new TaskController(taskUseCase);

    // Initialize middleware
    const authMiddleware = new AuthMiddleware();

    // Initialize Telegram Bot
    this.telegramBot = new TelegramBotService(userUseCase, groupUseCase, taskUseCase);

    // Initialize services
    this.notificationService = new NotificationService(
      taskUseCase,
      userUseCase,
      notificationRepository,
      this.telegramBot
    );

    const taskService = new TaskService(taskUseCase, this.notificationService);

    // Initialize routes
    const routes = createRoutes(userController, groupController, taskController, authMiddleware);
    this.app.use('/', routes);

    console.log('✅ Dependencies initialized');
  }

  private initializeErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
      });
    });

    // Global error handler
    this.app.use(errorHandler);

    console.log(' Error handling initialized');
  }

  public async initialize(): Promise<express.Application> {
    try {
      // Connect to database
      await connectDatabase();

      // Initialize dependencies
      await this.initializeDependencies();

      // Initialize error handling
      this.initializeErrorHandling();

      console.log('🚀 Application initialized successfully');
      return this.app;
    } catch (error) {
      console.error(' Failed to initialize application:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}