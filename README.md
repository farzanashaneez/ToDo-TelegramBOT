# Telegram ToDo Bot - Complete Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (local or cloud instance)
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### 1. Project Setup

```bash
# Clone or create project directory
mkdir telegram-todo-bot
cd telegram-todo-bot

# Create backend structure
mkdir -p backend/src/{controllers,services,repositories,models,config,middleware,utils}
mkdir -p backend/src/domain/{entities,interfaces,usecases}
mkdir -p backend/src/infrastructure/{database,telegram}

# Navigate to backend
cd backend

# Initialize npm and install dependencies
npm init -y

# Install production dependencies
npm install express mongoose dotenv cors helmet morgan
npm install node-telegram-bot-api node-cron bcryptjs jsonwebtoken

# Install development dependencies
npm install @types/node @types/express @types/bcryptjs @types/jsonwebtoken
npm install @types/node-telegram-bot-api @types/cors @types/morgan
npm install typescript ts-node nodemon tsconfig-paths -D

# Initialize TypeScript
npx tsc --init
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/telegram-todo-bot

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Admin Configuration
ADMIN_TELEGRAM_ID=your_telegram_id_here
```

### 3. Get Telegram Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token and add it to your `.env` file
5. Get your Telegram user ID:
   - Send a message to [@userinfobot](https://t.me/userinfobot)
   - Copy your user ID and add it as `ADMIN_TELEGRAM_ID` in `.env`

### 4. Database Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get connection string and update `MONGODB_URI` in `.env`

### 5. Install and Configure Code

Copy all the provided code files into their respective directories as shown in the artifacts above.

### 6. Build and Run

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

### 7. Test the Setup

1. **Health Check**: Visit `http://localhost:3000/health`
2. **Telegram Bot**: Send `/start` to your bot in Telegram
3. **Admin Features**: As admin, try `/admin` command

## 📱 Bot Commands Reference

### User Commands
- `/start` - Register and start using the bot
- `/mytasks` - View your assigned tasks
- `/mygroups` - View groups you're member of
- `/complete` - Mark a task as complete
- `/help` - Show help message

### Admin Commands
- `/admin` - Open admin panel
- `/creategroup` - Create a new group
- `/createtask` - Create a new task
- All user commands are also available

## 🏗️ Architecture Overview

### Clean Architecture Layers

1. **Domain Layer** (`src/domain/`)
   - **Entities**: Core business objects (User, Group, Task, Notification)
   - **Use Cases**: Business logic (UserUseCase, GroupUseCase, TaskUseCase)
   - **Interfaces**: Repository contracts

2. **Infrastructure Layer** (`src/infrastructure/`)
   - **Database**: MongoDB connection and configuration
   - **Telegram**: Bot implementation and message handling

3. **Application Layer**
   - **Controllers**: HTTP request handlers
   - **Services**: Business services and notification handling
   - **Repositories**: Data access implementations

4. **Presentation Layer**
   - **Routes**: Express.js route definitions
   - **Middleware**: Authentication, validation, error handling

### Key Features Implemented

✅ **User Management**
- User registration via Telegram
- Role-based access (Admin/User)
- Admin can manage all users

✅ **Group Management**
- Create/delete groups
- Add/remove users from groups
- View group memberships

✅ **Task Management**
- Create tasks with priorities and deadlines
- Assign to individuals or groups
- Mark tasks as complete
- View tasks by priority/deadline

✅ **Notifications**
- Real-time task assignment notifications
- Deadline reminder system
- Task completion notifications
- Background scheduler for automated reminders

✅ **Telegram Bot Interface**
- Interactive keyboard navigation
- Inline buttons for quick actions
- Rich message formatting
- Multi-step conversation flows

## 🚀 Deployment Options

### Option 1: Local Development
```bash
npm run dev
```

### Option 2: Production Server
```bash
npm run build
npm start
```

### Option 3: Docker
```dockerfile
# Create Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Option 4: Cloud Platforms
- **Heroku**: Connect GitHub repo, add MongoDB add-on
- **Railway**: Simple deployment with built-in database
- **DigitalOcean**: App Platform with managed database
- **AWS/GCP/Azure**: Use their respective container services

## 🔧 Customization Options

### Adding New Commands
1. Add command handler in `TelegramBot.ts`
2. Implement business logic in appropriate use case
3. Add new routes if API access needed

### Adding New Task Fields
1. Update `Task` entity
2. Update `TaskModel` schema
3. Update create task flow in bot
4. Update validation middleware

### Adding New Notification Types
1. Add to `Notification` entity type enum
2. Implement in `NotificationService`
3. Add message templates

### Custom Keyboards and Menus
1. Modify keyboard layouts in `TelegramBot.ts`
2. Add new callback query handlers
3. Implement conversation flows

## 🛠️ Troubleshooting

### Common Issues

**Bot not responding:**
- Check `TELEGRAM_BOT_TOKEN` in `.env`
- Ensure bot token is correct
- Check server logs for errors

**Database connection failed:**
- Verify `MONGODB_URI` in `.env`
- Ensure MongoDB is running
- Check network connectivity

**Admin features not working:**
- Verify `ADMIN_TELEGRAM_ID` matches your Telegram user ID
- Send `/start` to register first
- Check user role in database

**Notifications not sending:**
- Check notification scheduler logs
- Verify task deadlines are set correctly
- Ensure users are registered

### Debug Mode
```bash
NODE_ENV=development npm run dev
```

This enables detailed logging and error stack traces.

## 📈 Performance Optimization

1. **Database Indexing**: Already implemented for frequently queried fields
2. **Caching**: Consider Redis for session/state management
3. **Rate Limiting**: Implement for API endpoints
4. **Webhook Mode**: Switch from polling to webhooks for production

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` file
2. **JWT Security**: Use strong secret keys
3. **Input Validation**: Implemented for all user inputs
4. **Rate Limiting**: Consider implementing for bot commands
5. **Database Security**: Use authentication in production

## 📊 Monitoring and Analytics

Consider adding:
- Application performance monitoring (APM)
- Error tracking (Sentry)
- Usage analytics
- Health check endpoints
- Logging aggregation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Follow the existing architecture patterns
4. Add tests for new features
5. Submit pull request

## 📄 License

This project is available under the MIT License.