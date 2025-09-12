import TelegramBot from 'node-telegram-bot-api';
import { config } from '../../config/config';
import { UserUseCase } from '../../domain/usecases/UserUseCase';
import { GroupUseCase } from '../../domain/usecases/GroupUseCase';
import { TaskUseCase } from '../../domain/usecases/TaskUseCase';

export class TelegramBotService {
  private bot: TelegramBot;
  private userStates: Map<string, any> = new Map();

  constructor(
    private userUseCase: UserUseCase,
    private groupUseCase: GroupUseCase,
    private taskUseCase: TaskUseCase
  ) {
    this.bot = new TelegramBot(config.telegramBotToken, { polling: true });
    this.initializeBot();
  }

  private initializeBot() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg);
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      await this.handleHelp(msg);
    });

    // Admin commands
    this.bot.onText(/\/admin/, async (msg) => {
      await this.handleAdminMenu(msg);
    });

    this.bot.onText(/\/creategroup/, async (msg) => {
      await this.handleCreateGroup(msg);
    });

    // this.bot.onText(/\/adduser/, async (msg) => {
    //   await this.handleAddUserToGroup(msg);
    // });

    this.bot.onText(/\/createtask/, async (msg) => {
      await this.handleCreateTask(msg);
    });

    // User commands
    this.bot.onText(/\/mytasks/, async (msg) => {
      await this.handleMyTasks(msg);
    });

    this.bot.onText(/\/mygroups/, async (msg) => {
      await this.handleMyGroups(msg);
    });

    this.bot.onText(/\/complete/, async (msg) => {
      await this.handleCompleteTask(msg);
    });

    // Handle callback queries (inline buttons)
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // Handle text messages
    this.bot.on('message', async (msg) => {
      if (!msg.text?.startsWith('/')) {
        await this.handleTextMessage(msg);
      }
    });

    console.log('🤖 Telegram Bot initialized successfully');
  }

  private async handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    
    if (!telegramId) return;

    try {
      // Check if user already exists
      let user = await this.userUseCase.getUserByTelegramId(telegramId);
      
      if (!user) {
        // Register new user
        user = await this.userUseCase.registerUser(
          telegramId,
          msg.from?.username,
          msg.from?.first_name,
          msg.from?.last_name
        );
        
        // Check if this is the admin
        if (telegramId === config.adminTelegramId) {
          await this.userUseCase.promoteToAdmin(user.id!);
          user.role = 'admin';
        }
      }

      const welcomeMessage = user.role === 'admin' 
        ? `Welcome, Admin ${user.firstName || 'User'}! 👑\n\nYou have admin privileges.`
        : `Welcome, ${user.firstName || 'User'}! 👋\n\nYou've been registered successfully.`;

      await this.bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: this.getMainKeyboard(user.role) as any
      });
    } catch (error) {
      console.error('Error in handleStart:', error);
      await this.bot.sendMessage(chatId, 'Sorry, there was an error during registration. Please try again.');
    }
  }

  private async handleHelp(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    
    if (!telegramId) return;

    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    
    const helpText = user?.role === 'admin' 
      ? this.getAdminHelpText()
      : this.getUserHelpText();

    await this.bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
  }

  private async handleAdminMenu(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    
    if (!telegramId) return;

    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    
    if (user?.role !== 'admin') {
      await this.bot.sendMessage(chatId, '❌ You need admin privileges to access this menu.');
      return;
    }

    const adminKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👥 Manage Users', callback_data: 'admin_users' },
            { text: '📁 Manage Groups', callback_data: 'admin_groups' }
          ],
          [
            { text: '📋 Manage Tasks', callback_data: 'admin_tasks' },
            { text: '📊 Statistics', callback_data: 'admin_stats' }
          ]
        ]
      }
    };

    await this.bot.sendMessage(chatId, '🛠 *Admin Panel*\n\nChoose an option:', {
      parse_mode: 'Markdown',
      ...adminKeyboard
    });
  }

  private async handleMyTasks(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    
    if (!telegramId) return;

    try {
      const user = await this.userUseCase.getUserByTelegramId(telegramId);
      if (!user) {
        await this.bot.sendMessage(chatId, '❌ Please register first using /start');
        return;
      }

      const tasks = await this.taskUseCase.getUserTasks(user.id!);
      
      if (tasks.length === 0) {
        await this.bot.sendMessage(chatId, '📋 You have no tasks assigned to you.');
        return;
      }

      // Group tasks by status
      const pendingTasks = tasks.filter(task => task.status === 'pending');
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
      const completedTasks = tasks.filter(task => task.status === 'completed');

      let message = '📋 *Your Tasks*\n\n';

      if (pendingTasks.length > 0) {
        message += '🔴 *Pending Tasks:*\n';
        pendingTasks.forEach((task, index) => {
          const priority = this.getPriorityEmoji(task.priority);
          const deadline = new Date(task.deadline).toLocaleDateString();
          message += `${index + 1}. ${priority} *${task.title}*\n`;
          message += `   📅 Due: ${deadline}\n`;
          if (task.description) {
            message += `   📝 ${task.description}\n`;
          }
          message += `   ID: \`${task.id}\`\n\n`;
        });
      }

      if (inProgressTasks.length > 0) {
        message += '🟡 *In Progress Tasks:*\n';
        inProgressTasks.forEach((task, index) => {
          const priority = this.getPriorityEmoji(task.priority);
          const deadline = new Date(task.deadline).toLocaleDateString();
          message += `${index + 1}. ${priority} *${task.title}*\n`;
          message += `   📅 Due: ${deadline}\n`;
          message += `   ID: \`${task.id}\`\n\n`;
        });
      }

      if (completedTasks.length > 0) {
        message += '✅ *Completed Tasks:*\n';
        completedTasks.slice(0, 5).forEach((task, index) => {
          message += `${index + 1}. *${task.title}*\n`;
          message += `   ✅ Completed on: ${task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}\n\n`;
        });
        if (completedTasks.length > 5) {
          message += `... and ${completedTasks.length - 5} more completed tasks\n\n`;
        }
      }

      // Add task action buttons
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Complete Task', callback_data: 'complete_task' },
              { text: '🔄 Refresh', callback_data: 'refresh_tasks' }
            ]
          ]
        }
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('Error in handleMyTasks:', error);
      await this.bot.sendMessage(chatId, '❌ Error fetching your tasks. Please try again.');
    }
  }

  private async handleMyGroups(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    
    if (!telegramId) return;

    try {
      const user = await this.userUseCase.getUserByTelegramId(telegramId);
      if (!user) {
        await this.bot.sendMessage(chatId, '❌ Please register first using /start');
        return;
      }

      const groups = await this.groupUseCase.getUserGroups(user.id!);
      
      if (groups.length === 0) {
        await this.bot.sendMessage(chatId, '📁 You are not a member of any groups.');
        return;
      }

      let message = '📁 *Your Groups*\n\n';
      groups.forEach((group, index) => {
        message += `${index + 1}. *${group.name}*\n`;
        if (group.description) {
          message += `   📝 ${group.description}\n`;
        }
        message += `   👥 Members: ${group.members.length}\n`;
        message += `   ID: \`${group.id}\`\n\n`;
      });

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in handleMyGroups:', error);
      await this.bot.sendMessage(chatId, '❌ Error fetching your groups. Please try again.');
    }
  }

  private async handleCreateGroup(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    
    if (!telegramId) return;

    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    
    if (user?.role !== 'admin') {
      await this.bot.sendMessage(chatId, '❌ Only admins can create groups.');
      return;
    }

    this.userStates.set(telegramId, { action: 'creating_group', step: 'name' });
    await this.bot.sendMessage(chatId, '📁 *Create New Group*\n\nPlease enter the group name:', {
      parse_mode: 'Markdown'
    });
  }

  private async handleCreateTask(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    
    if (!telegramId) return;

    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    
    if (user?.role !== 'admin') {
      await this.bot.sendMessage(chatId, '❌ Only admins can create tasks.');
      return;
    }

    this.userStates.set(telegramId, { action: 'creating_task', step: 'title' });
    await this.bot.sendMessage(chatId, '📋 *Create New Task*\n\nPlease enter the task title:', {
      parse_mode: 'Markdown'
    });
  }

  private async handleCompleteTask(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    
    if (!telegramId) return;

    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    if (!user) {
      await this.bot.sendMessage(chatId, '❌ Please register first using /start');
      return;
    }

    this.userStates.set(telegramId, { action: 'completing_task' });
    await this.bot.sendMessage(chatId, '✅ *Complete Task*\n\nPlease enter the task ID you want to mark as complete:', {
      parse_mode: 'Markdown'
    });
  }

  private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
    const chatId = callbackQuery.message?.chat.id;
    const telegramId = callbackQuery.from.id.toString();
    const data = callbackQuery.data;
    
    if (!chatId || !data) return;

    try {
      await this.bot.answerCallbackQuery(callbackQuery.id);

      switch (data) {
        case 'admin_users':
          await this.handleAdminUsers(chatId, telegramId);
          break;
        case 'admin_groups':
          await this.handleAdminGroups(chatId, telegramId);
          break;
        case 'admin_tasks':
          await this.handleAdminTasks(chatId, telegramId);
          break;
        case 'complete_task':
          this.userStates.set(telegramId, { action: 'completing_task' });
          await this.bot.sendMessage(chatId, '✅ Please enter the task ID to mark as complete:');
          break;
        case 'refresh_tasks':
          // Simulate the /mytasks command
          await this.handleMyTasks({ chat: { id: chatId }, from: { id: parseInt(telegramId) } } as any);
          break;
        default:
          if (data.startsWith('complete_')) {
            const taskId = data.replace('complete_', '');
            await this.completeTaskById(chatId, telegramId, taskId);
          }
          break;
      }
    } catch (error) {
      console.error('Error in handleCallbackQuery:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
  }

  private async handleTextMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    const text = msg.text;
    
    if (!telegramId || !text) return;

    const userState = this.userStates.get(telegramId);
    if (!userState) return;

    try {
      switch (userState.action) {
        case 'creating_group':
          await this.handleGroupCreationFlow(chatId, telegramId, text, userState);
          break;
        case 'creating_task':
          await this.handleTaskCreationFlow(chatId, telegramId, text, userState);
          break;
        case 'completing_task':
          await this.completeTaskById(chatId, telegramId, text);
          this.userStates.delete(telegramId);
          break;
      }
    } catch (error) {
      console.error('Error in handleTextMessage:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
      this.userStates.delete(telegramId);
    }
  }

  private async handleGroupCreationFlow(chatId: number, telegramId: string, text: string, userState: any) {
    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    if (!user) return;

    switch (userState.step) {
      case 'name':
        userState.groupName = text.trim();
        userState.step = 'description';
        this.userStates.set(telegramId, userState);
        await this.bot.sendMessage(chatId, '📝 Great! Now enter a description for the group (or send "skip" to skip):');
        break;
      
      case 'description':
        const description = text.trim().toLowerCase() === 'skip' ? undefined : text.trim();
        
        try {
          const group = await this.groupUseCase.createGroup(
            userState.groupName,
            user.id!,
            description
          );
          
          await this.bot.sendMessage(chatId, `✅ Group "${group.name}" created successfully!\n\nGroup ID: \`${group.id}\``, {
            parse_mode: 'Markdown'
          });
        } catch (error) {
          await this.bot.sendMessage(chatId, `❌ Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        this.userStates.delete(telegramId);
        break;
    }
  }

  private async handleTaskCreationFlow(chatId: number, telegramId: string, text: string, userState: any) {
    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    if (!user) return;

    switch (userState.step) {
      case 'title':
        userState.title = text.trim();
        userState.step = 'description';
        this.userStates.set(telegramId, userState);
        await this.bot.sendMessage(chatId, '📝 Enter task description (or send "skip" to skip):');
        break;
      
      case 'description':
        userState.description = text.trim().toLowerCase() === 'skip' ? undefined : text.trim();
        userState.step = 'deadline';
        this.userStates.set(telegramId, userState);
        await this.bot.sendMessage(chatId, '📅 Enter deadline (YYYY-MM-DD format):');
        break;
      
      case 'deadline':
        try {
          const deadline = new Date(text.trim());
          if (isNaN(deadline.getTime()) || deadline <= new Date()) {
            await this.bot.sendMessage(chatId, '❌ Invalid date format or date in the past. Please enter a valid future date (YYYY-MM-DD):');
            return;
          }
          userState.deadline = deadline;
          userState.step = 'priority';
          this.userStates.set(telegramId, userState);
          
          const priorityKeyboard = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔴 High', callback_data: 'priority_high' },
                  { text: '🟡 Medium', callback_data: 'priority_medium' },
                  { text: '🟢 Low', callback_data: 'priority_low' }
                ]
              ]
            }
          };
          
          await this.bot.sendMessage(chatId, '⚡ Select task priority:', priorityKeyboard);
        } catch (error) {
          await this.bot.sendMessage(chatId, '❌ Invalid date format. Please enter date as YYYY-MM-DD:');
        }
        break;
      
      case 'assignment':
        // Handle group or user assignment
        const groups = await this.groupUseCase.getAllGroups();
        if (groups.length === 0) {
          await this.bot.sendMessage(chatId, '❌ No groups available. Please create a group first.');
          this.userStates.delete(telegramId);
          return;
        }
        
        // For simplicity, assign to first group for now
        // In production, you'd want a more sophisticated selection process
        try {
          const task = await this.taskUseCase.createTask(
            userState.title,
            userState.description || '',
            userState.deadline,
            userState.priority,
            user.id!,
            undefined, // assignedTo users
            groups[0].id // assign to first group
          );
          
          await this.bot.sendMessage(chatId, `✅ Task "${task.title}" created and assigned to group "${groups[0].name}"!\n\nTask ID: \`${task.id}\``, {
            parse_mode: 'Markdown'
          });
        } catch (error) {
          await this.bot.sendMessage(chatId, `❌ Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        this.userStates.delete(telegramId);
        break;
    }
  }

  private async completeTaskById(chatId: number, telegramId: string, taskId: string) {
    try {
      const user = await this.userUseCase.getUserByTelegramId(telegramId);
      if (!user) {
        await this.bot.sendMessage(chatId, '❌ Please register first using /start');
        return;
      }

      const task = await this.taskUseCase.markTaskComplete(taskId.trim(), user.id!);
      
      if (task) {
        await this.bot.sendMessage(chatId, `✅ Task "${task.title}" marked as complete!`);
      }
    } catch (error) {
      await this.bot.sendMessage(chatId, `❌ Failed to complete task: ${error instanceof Error ? error.message : 'Task not found or not assigned to you'}`);
    }
  }

  private async handleAdminUsers(chatId: number, telegramId: string) {
    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    if (user?.role !== 'admin') return;

    const users = await this.userUseCase.getAllUsers();
    let message = '👥 *All Users*\n\n';
    
    users.forEach((user, index) => {
      const roleEmoji = user.role === 'admin' ? '👑' : '👤';
      message += `${index + 1}. ${roleEmoji} ${user.firstName || 'Unknown'} ${user.lastName || ''}\n`;
      message += `   📱 @${user.userName || 'N/A'}\n`;
      message += `   🆔 ${user.telegramId}\n`;
      message += `   📊 Role: ${user.role}\n\n`;
    });

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  private async handleAdminGroups(chatId: number, telegramId: string) {
    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    if (user?.role !== 'admin') return;

    const groups = await this.groupUseCase.getAllGroups();
    
    if (groups.length === 0) {
      await this.bot.sendMessage(chatId, '📁 No groups found.');
      return;
    }

    let message = '📁 *All Groups*\n\n';
    groups.forEach((group, index) => {
      message += `${index + 1}. *${group.name}*\n`;
      if (group.description) {
        message += `   📝 ${group.description}\n`;
      }
      message += `   👥 Members: ${group.members.length}\n`;
      message += `   🆔 ID: \`${group.id}\`\n\n`;
    });

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  private async handleAdminTasks(chatId: number, telegramId: string) {
    const user = await this.userUseCase.getUserByTelegramId(telegramId);
    if (user?.role !== 'admin') return;

    const tasks = await this.taskUseCase.getAllTasks();
    
    if (tasks.length === 0) {
      await this.bot.sendMessage(chatId, '📋 No tasks found.');
      return;
    }

    // Show only recent tasks to avoid message length limits
    const recentTasks = tasks.slice(0, 10);
    let message = '📋 *Recent Tasks*\n\n';
    
    recentTasks.forEach((task, index) => {
      const priority = this.getPriorityEmoji(task.priority);
      const status = this.getStatusEmoji(task.status);
      message += `${index + 1}. ${priority} ${status} *${task.title}*\n`;
      message += `   📅 Due: ${new Date(task.deadline).toLocaleDateString()}\n`;
      message += `   👥 Assigned to: ${task.assignedTo.length} user(s)\n`;
      message += `   🆔 ID: \`${task.id}\`\n\n`;
    });

    if (tasks.length > 10) {
      message += `... and ${tasks.length - 10} more tasks\n`;
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  private getMainKeyboard(role: string) {
    const userButtons = [
      [{ text: '📋 My Tasks' }, { text: '📁 My Groups' }],
      [{ text: '✅ Complete Task' }, { text: '❓ Help' }]
    ];

    const adminButtons = [
      [{ text: '🛠 Admin Panel' }, { text: '📋 My Tasks' }],
      [{ text: '📁 Create Group' }, { text: '➕ Create Task' }],
      [{ text: '👥 All Users' }, { text: '❓ Help' }]
    ];

    return {
      reply_markup: {
        keyboard: role === 'admin' ? adminButtons : userButtons,
        resize_keyboard: true,
        persistent: true
      }
    };
  }

  private getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '🔄';
      case 'completed': return '✅';
      default: return '❓';
    }
  }

  private getAdminHelpText(): string {
    return `🛠 *Admin Commands*

*User Management:*
/admin - Open admin panel
👥 View all registered users

*Group Management:*
/creategroup - Create a new group
📁 View all groups
Add/remove users from groups

*Task Management:*
/createtask - Create a new task
📋 View all tasks
Assign tasks to users or groups

*General Commands:*
/mytasks - View your tasks
/mygroups - View your groups
/complete - Mark task as complete
/help - Show this help message

*Features:*
• Create and manage groups
• Assign tasks to individuals or groups
• Set task priorities and deadlines
• Track task completion
• Automatic deadline reminders`;
  }

  private getUserHelpText(): string {
    return `👤 *User Commands*

*Task Management:*
/mytasks - View your assigned tasks
/complete - Mark a task as complete

*Group Information:*
/mygroups - View groups you're member of

*General:*
/help - Show this help message
/start - Restart the bot

*Features:*
• View tasks assigned to you
• Mark tasks as complete
• Receive notifications for new tasks
• Get deadline reminders
• View task priorities and details

*Task Priorities:*
🔴 High Priority
🟡 Medium Priority  
🟢 Low Priority

*Task Status:*
⏳ Pending
🔄 In Progress
✅ Completed`;
  }

  // Public method to send notifications
  async sendNotification(telegramId: string, message: string) {
    try {
      await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
      return true;
    } catch (error) {
      console.error(`Failed to send notification to ${telegramId}:`, error);
      return false;
    }
  }
}