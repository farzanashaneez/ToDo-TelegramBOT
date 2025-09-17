
import { Telegraf, Context, Scenes, session, Markup } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { config } from '../../config/config';
import { UserUseCase } from '../../domain/usecases/UserUseCase';
import { GroupUseCase } from '../../domain/usecases/GroupUseCase';
import { TaskUseCase } from '../../domain/usecases/TaskUseCase';
import { TelegrafMiddleware } from './TelegrafMiddleware';
import { TelegrafScenes } from './TelegrafScenes';


interface BotSessionData extends Scenes.WizardSessionData {
    userId?: string;
    userRole?: 'admin' | 'user';
    currentAction?: string;
    tempData?: any;
  }
  
  // BotContext with session typed as WizardSession of BotSessionData
//   export interface BotContext extends Context<Update> {
//     session: Scenes.WizardSession<BotSessionData>;
//     scene: Scenes.SceneContextScene<BotContext, BotSessionData>;
//     wizard: Scenes.WizardContextWizard<BotContext>;
//   }
export interface BotContext extends Context<Update> {
    session: Scenes.WizardSession<BotSessionData>;
    scene: Scenes.SceneContextScene<BotContext, BotSessionData>;
    wizard: Scenes.WizardContextWizard<BotContext>;
    match?:any;
  }



export class TelegrafBotService {
  private bot: Telegraf<BotContext>;
  private stage: Scenes.Stage<BotContext>;
  private middleware: TelegrafMiddleware;
  private scenes: TelegrafScenes; // Fixed type annotation

  constructor(
    private userUseCase: UserUseCase,
    private groupUseCase: GroupUseCase,
    private taskUseCase: TaskUseCase
  ) {
    this.bot = new Telegraf<BotContext>(config.telegramBotToken);
    this.middleware = new TelegrafMiddleware(userUseCase);
    this.scenes = new TelegrafScenes(userUseCase, groupUseCase, taskUseCase);
    
    // Initialize stage after scenes are created
    this.stage = new Scenes.Stage<BotContext>([
      this.scenes.createGroupScene(),
      this.scenes.createTaskScene()
    ]);
    
    this.initializeBot();
  }

  private initializeBot() {
    // Session middleware
    this.bot.use(session());
    this.bot.use(this.stage.middleware());

    // Custom middleware
    this.bot.use(this.middleware.logging() as any);
    this.bot.use(this.middleware.rateLimit() as any);

    // Authentication middleware (applied to all requests)
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        const user = await this.userUseCase.getUserByTelegramId(ctx.from.id.toString());
        if (ctx.session) {
          (ctx.session as BotSessionData).userId = user?.id;
          (ctx.session as BotSessionData).userRole = user?.role;
        }
      }
      return next();
    });

    // Basic commands
    this.bot.start(this.handleStart.bind(this));
    this.bot.help(this.handleHelp.bind(this));

    // User commands
    this.bot.command('mytasks', this.middleware.authenticate(), this.handleMyTasks.bind(this));
    this.bot.command('mygroups', this.middleware.authenticate(), this.handleMyGroups.bind(this));
    this.bot.command('complete', this.middleware.authenticate(), this.handleCompleteTask.bind(this));
    this.bot.command('today', this.middleware.authenticate(), this.handleTodayTasks.bind(this));
    this.bot.command('week', this.middleware.authenticate(), this.handleWeekTasks.bind(this));
    this.bot.command('overdue', this.middleware.authenticate(), this.handleOverdueTasks.bind(this));

    // Admin commands
    this.bot.command('admin', this.middleware.authenticate(), this.middleware.requireAdmin(), this.handleAdminMenu.bind(this));
    this.bot.command('creategroup', this.middleware.authenticate(), this.middleware.requireAdmin(), this.enterCreateGroupScene.bind(this));
    this.bot.command('createtask', this.middleware.authenticate(), this.middleware.requireAdmin(), this.enterCreateTaskScene.bind(this));
    this.bot.command('users', this.middleware.authenticate(), this.middleware.requireAdmin(), this.handleAllUsers.bind(this));
    this.bot.command('groups', this.middleware.authenticate(), this.middleware.requireAdmin(), this.handleAllGroups.bind(this));
    this.bot.command('tasks', this.middleware.authenticate(), this.middleware.requireAdmin(), this.handleAllTasks.bind(this));
    this.bot.command('stats', this.middleware.authenticate(), this.middleware.requireAdmin(), this.handleStats.bind(this));

    // Handle keyboard button presses
    this.bot.hears('📋 My Tasks', this.middleware.authenticate(), this.handleMyTasks.bind(this));
    this.bot.hears('📁 My Groups', this.middleware.authenticate(), this.handleMyGroups.bind(this));
    this.bot.hears('📅 Today', this.middleware.authenticate(), this.handleTodayTasks.bind(this));
    this.bot.hears('📆 This Week', this.middleware.authenticate(), this.handleWeekTasks.bind(this));
    this.bot.hears('✅ Complete Task', this.middleware.authenticate(), this.handleCompleteTask.bind(this));
    this.bot.hears('❓ Help', this.handleHelp.bind(this));
    
    // Admin keyboard buttons
    this.bot.hears('🛠 Admin Panel', this.middleware.authenticate(), this.middleware.requireAdmin(), this.handleAdminMenu.bind(this));
    this.bot.hears('📁 Create Group', this.middleware.authenticate(), this.middleware.requireAdmin(), this.enterCreateGroupScene.bind(this));
    this.bot.hears('➕ Create Task', this.middleware.authenticate(), this.middleware.requireAdmin(), this.enterCreateTaskScene.bind(this));
    this.bot.hears('👥 All Users', this.middleware.authenticate(), this.middleware.requireAdmin(), this.handleAllUsers.bind(this));
    this.bot.hears('📊 All Tasks', this.middleware.authenticate(), this.middleware.requireAdmin(), this.handleAllTasks.bind(this));

    // Inline keyboard handlers
    this.bot.action(/^admin_(.+)/, this.handleAdminActions.bind(this));
    this.bot.action(/^task_(.+)/, this.handleTaskActions.bind(this));
    this.bot.action(/^group_(.+)/, this.handleGroupActions.bind(this));
    this.bot.action(/^complete_(.+)/, this.handleCompleteTaskAction.bind(this));
    this.bot.action(/^priority_(.+)/, this.handlePrioritySelection.bind(this));
    this.bot.action(/^filter_(.+)/, this.handleTaskFilter.bind(this));
    this.bot.action(/^page_(.+)/, this.handlePagination.bind(this));
    this.bot.action(/^help_(.+)/, this.handleHelpActions.bind(this));

    // Callback query acknowledgment
    this.bot.on('callback_query', async (ctx, next) => {
      await ctx.answerCbQuery();
      return next();
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      ctx.reply('❌ An error occurred. Please try again.').catch(console.error);
    });

    console.log('🤖 Telegraf Bot initialized successfully');
  }

  // ADD MISSING METHOD: sendNotification
  public async sendNotification(telegramId: string, message: string): Promise<boolean> {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown'
      });
      return true;
    } catch (error) {
      console.error(`Failed to send notification to ${telegramId}:`, error);
      return false;
    }
  }

  // ADD METHOD: Send notification with keyboard
  public async sendNotificationWithKeyboard(
    telegramId: string, 
    message: string, 
    keyboard?: any
  ): Promise<boolean> {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
      return true;
    } catch (error) {
      console.error(`Failed to send notification with keyboard to ${telegramId}:`, error);
      return false;
    }
  }

  // ADD METHOD: Broadcast message to multiple users
  public async broadcastMessage(userIds: string[], message: string): Promise<{success: number, failed: number}> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      const sent = await this.sendNotification(userId, message);
      if (sent) {
        success++;
      } else {
        failed++;
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { success, failed };
  }

  private async handleStart(ctx: BotContext) {
    if (!ctx.from) return;

    const telegramId = ctx.from.id.toString();

    try {
      let user = await this.userUseCase.getUserByTelegramId(telegramId);

      if (!user) {
        user = await this.userUseCase.registerUser(
          telegramId,
          ctx.from.username,
          ctx.from.first_name,
          ctx.from.last_name
        );

        // Check if this is the admin
        if (telegramId === config.adminTelegramId) {
          await this.userUseCase.promoteToAdmin(user.id!);
          user.role = 'admin';
        }
      }

      // Update session
      if (ctx.session) {
        (ctx.session as BotSessionData).userId = user.id;
        (ctx.session as BotSessionData).userRole = user.role;
      }

      const welcomeMessage = user.role === 'admin'
        ? `Welcome back, Admin ${user.firstName || 'User'}! 👑\n\nYou have full administrative privileges.\n\nUse the buttons below or type /help for available commands.`
        : `Welcome back, ${user.firstName || 'User'}! 👋\n\nYou're all set to manage your tasks.\n\nUse the buttons below or type /help for available commands.`;

      await ctx.reply(welcomeMessage, this.getMainKeyboard(user.role));
    } catch (error) {
      console.error('Error in handleStart:', error);
      await ctx.reply('❌ Sorry, there was an error during registration. Please try again later.');
    }
  }

  private async handleHelp(ctx: BotContext) {
    const helpText = (ctx.session as BotSessionData)?.userRole === 'admin' 
      ? this.getAdminHelpText()
      : this.getUserHelpText();

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📋 Quick Tutorial', 'help_tutorial')],
      [Markup.button.callback('🔧 Troubleshooting', 'help_troubleshoot')],
      [Markup.button.callback('📞 Support', 'help_support')]
    ]);

    await ctx.reply(helpText, { parse_mode: 'Markdown', ...keyboard });
  }

  private async handleHelpActions(ctx: BotContext) {
    const action = ctx.match![1];

    switch (action) {
      case 'tutorial':
        await ctx.editMessageText(
          '📋 *Quick Tutorial*\n\n' +
          '1. Use /mytasks to see your assigned tasks\n' +
          '2. Click "✅ Complete Task" to mark tasks done\n' +
          '3. Use /today or /week to see upcoming tasks\n' +
          '4. Admins can create groups and tasks\n\n' +
          'Need more help? Contact your administrator!',
          { parse_mode: 'Markdown' }
        );
        break;
      case 'troubleshoot':
        await ctx.editMessageText(
          '🔧 *Troubleshooting*\n\n' +
          '• If commands don\'t work, try /start\n' +
          '• Make sure you\'re registered in the system\n' +
          '• Check if you have permission for admin commands\n' +
          '• Tasks not showing? Ask admin to assign you to groups\n\n' +
          'Still having issues? Contact support.',
          { parse_mode: 'Markdown' }
        );
        break;
      case 'support':
        await ctx.editMessageText(
          '📞 *Support*\n\n' +
          'For technical support or questions:\n' +
          '• Contact your system administrator\n' +
          '• Report bugs to the development team\n' +
          '• Check system status with /stats (admin only)\n\n' +
          'Emergency? Contact your team lead directly.',
          { parse_mode: 'Markdown' }
        );
        break;
    }
  }

  private async handleMyTasks(ctx: BotContext) {
    if (!(ctx.session as BotSessionData)?.userId) {
      await ctx.reply('❌ Please register first using /start');
      return;
    }

    try {
      const tasks = await this.taskUseCase.getUserTasks((ctx.session as BotSessionData).userId);

      if (tasks.length === 0) {
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Refresh', 'task_refresh')]
        ]);
        
        await ctx.reply(
          '📋 *No Tasks Found*\n\n' +
          'You currently have no tasks assigned to you.\n' +
          'New tasks will appear here when assigned by administrators.',
          { parse_mode: 'Markdown', ...keyboard }
        );
        return;
      }

      // Group and sort tasks
      const now = new Date();
      const overdueTasks = tasks.filter(task => 
        task.status !== 'completed' && new Date(task.deadline) < now
      );
      const pendingTasks = tasks.filter(task => 
        task.status === 'pending' && new Date(task.deadline) >= now
      );
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
      const completedTasks = tasks.filter(task => task.status === 'completed');

      let message = '📋 *Your Tasks Overview*\n\n';
      
      // Add summary
      message += `📊 *Summary:*\n`;
      message += `• 🔴 Overdue: ${overdueTasks.length}\n`;
      message += `• ⏳ Pending: ${pendingTasks.length}\n`;
      message += `• 🔄 In Progress: ${inProgressTasks.length}\n`;
      message += `• ✅ Completed: ${completedTasks.length}\n\n`;

      // Show overdue tasks first (most urgent)
      if (overdueTasks.length > 0) {
        message += '🚨 *OVERDUE TASKS:*\n';
        overdueTasks.slice(0, 3).forEach((task, index) => {
          const priority = this.getPriorityEmoji(task.priority);
          const daysOverdue = Math.ceil((now.getTime() - new Date(task.deadline).getTime()) / (1000 * 60 * 60 * 24));
          message += `${index + 1}. ${priority} *${task.title}*\n`;
          message += `   ⚠️ ${daysOverdue} day(s) overdue\n`;
          message += `   ID: \`${task.id}\`\n\n`;
        });
        if (overdueTasks.length > 3) {
          message += `   ... and ${overdueTasks.length - 3} more overdue tasks\n\n`;
        }
      }

      // Show pending tasks
      if (pendingTasks.length > 0) {
        message += '⏳ *PENDING TASKS:*\n';
        pendingTasks.slice(0, 5).forEach((task, index) => {
          const priority = this.getPriorityEmoji(task.priority);
          const deadline = new Date(task.deadline).toLocaleDateString();
          const daysUntil = Math.ceil((new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          message += `${index + 1}. ${priority} *${task.title}*\n`;
          message += `   📅 Due: ${deadline} (${daysUntil} day(s))\n`;
          message += `   ID: \`${task.id}\`\n\n`;
        });
        if (pendingTasks.length > 5) {
          message += `   ... and ${pendingTasks.length - 5} more pending tasks\n\n`;
        }
      }

      // Show in progress tasks
      if (inProgressTasks.length > 0) {
        message += '🔄 *IN PROGRESS:*\n';
        inProgressTasks.slice(0, 3).forEach((task, index) => {
          const priority = this.getPriorityEmoji(task.priority);
          message += `${index + 1}. ${priority} *${task.title}*\n`;
          message += `   ID: \`${task.id}\`\n\n`;
        });
      }

      // Create action buttons
      const buttons = [];
      if (overdueTasks.length > 0 || pendingTasks.length > 0 || inProgressTasks.length > 0) {
        buttons.push([Markup.button.callback('✅ Complete Task', 'task_complete')]);
      }
      
      buttons.push([
        Markup.button.callback('🔍 Filter Tasks', 'task_filter'),
        Markup.button.callback('🔄 Refresh', 'task_refresh')
      ]);

      if ((ctx.session as BotSessionData).userRole === 'admin') {
        buttons.push([Markup.button.callback('➕ Create New Task', 'admin_create_task')]);
      }

      const keyboard = Markup.inlineKeyboard(buttons);

      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
      console.error('Error in handleMyTasks:', error);
      await ctx.reply('❌ Error fetching your tasks. Please try again.');
    }
  }

  private async handleMyGroups(ctx: BotContext) {
    if (!(ctx.session as BotSessionData)?.userId) {
      await ctx.reply('❌ Please register first using /start');
      return;
    }

    try {
      const groups = await this.groupUseCase.getUserGroups((ctx.session as BotSessionData).userId);

      if (groups.length === 0) {
        await ctx.reply('📁 You are not a member of any groups.');
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

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in handleMyGroups:', error);
      await ctx.reply('❌ Error fetching your groups. Please try again.');
    }
  }

  private async handleTodayTasks(ctx: BotContext) {
    if (!(ctx.session as BotSessionData)?.userId) {
      await ctx.reply('❌ Please register first using /start');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayTasks = await this.taskUseCase.getTasksByDateRange(today, tomorrow);
      const userTasks = todayTasks.filter(task => task.assignedTo.includes((ctx.session as BotSessionData)!.userId!));

      if (userTasks.length === 0) {
        await ctx.reply('📅 No tasks due today.');
        return;
      }

      let message = '📅 *Tasks Due Today*\n\n';
      userTasks.forEach((task, index) => {
        const priority = this.getPriorityEmoji(task.priority);
        const status = this.getStatusEmoji(task.status);
        message += `${index + 1}. ${priority} ${status} *${task.title}*\n`;
        if (task.description) {
          message += `   📝 ${task.description}\n`;
        }
        message += `   ID: \`${task.id}\`\n\n`;
      });

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in handleTodayTasks:', error);
      await ctx.reply('❌ Error fetching today\'s tasks. Please try again.');
    }
  }

  private async handleWeekTasks(ctx: BotContext) {
    if (!(ctx.session as BotSessionData)?.userId) {
      await ctx.reply('❌ Please register first using /start');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const weekTasks = await this.taskUseCase.getTasksByDateRange(today, nextWeek);
      const userTasks = weekTasks.filter(task => task.assignedTo.includes((ctx.session as BotSessionData)!.userId!));

      if (userTasks.length === 0) {
        await ctx.reply('📅 No tasks due this week.');
        return;
      }

      let message = '📅 *Tasks Due This Week*\n\n';
      userTasks.forEach((task, index) => {
        const priority = this.getPriorityEmoji(task.priority);
        const status = this.getStatusEmoji(task.status);
        const deadline = new Date(task.deadline).toLocaleDateString();
        message += `${index + 1}. ${priority} ${status} *${task.title}*\n`;
        message += `   📅 Due: ${deadline}\n`;
        if (task.description) {
          message += `   📝 ${task.description}\n`;
        }
        message += `   ID: \`${task.id}\`\n\n`;
      });

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in handleWeekTasks:', error);
      await ctx.reply('❌ Error fetching this week\'s tasks. Please try again.');
    }
  }

  private async handleOverdueTasks(ctx: BotContext) {
    if (!(ctx.session as BotSessionData)?.userId) {
      await ctx.reply('❌ Please register first using /start');
      return;
    }

    try {
      const allTasks = await this.taskUseCase.getUserTasks((ctx.session as BotSessionData).userId);
      const now = new Date();
      const overdueTasks = allTasks.filter(task => 
        task.status !== 'completed' && new Date(task.deadline) < now
      );

      if (overdueTasks.length === 0) {
        await ctx.reply('🎉 *Great news!*\n\nYou have no overdue tasks. Keep up the good work!', {
          parse_mode: 'Markdown'
        });
        return;
      }

      let message = '🚨 *Overdue Tasks*\n\n';
      message += `You have ${overdueTasks.length} overdue task(s) that need immediate attention:\n\n`;

      overdueTasks.forEach((task, index) => {
        const priority = this.getPriorityEmoji(task.priority);
        const daysOverdue = Math.ceil((now.getTime() - new Date(task.deadline).getTime()) / (1000 * 60 * 60 * 24));
        message += `${index + 1}. ${priority} *${task.title}*\n`;
        message += `   ⚠️ ${daysOverdue} day(s) overdue\n`;
        message += `   📅 Was due: ${new Date(task.deadline).toLocaleDateString()}\n`;
        if (task.description) {
          message += `   📝 ${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}\n`;
        }
        message += `   ID: \`${task.id}\`\n\n`;
      });

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Complete Task', 'task_complete')],
        [Markup.button.callback('🔄 Refresh', 'task_refresh')]
      ]);

      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
      console.error('Error in handleOverdueTasks:', error);
      await ctx.reply('❌ Error fetching overdue tasks. Please try again.');
    }
  }

  private async handleCompleteTask(ctx: BotContext) {
    if (!(ctx.session as BotSessionData)?.userId) {
      await ctx.reply('❌ Please register first using /start');
      return;
    }

    try {
      const tasks = await this.taskUseCase.getUserTasks((ctx.session as BotSessionData).userId);
      const incompleteTasks = tasks.filter(task => task.status !== 'completed');

      if (incompleteTasks.length === 0) {
        await ctx.reply('✅ *All Caught Up!*\n\nYou have no pending tasks to complete. Great job!', {
          parse_mode: 'Markdown'
        });
        return;
      }

      // Group by priority for better UX
      const highPriorityTasks = incompleteTasks.filter(task => task.priority === 'high');
      const mediumPriorityTasks = incompleteTasks.filter(task => task.priority === 'medium');
      const lowPriorityTasks = incompleteTasks.filter(task => task.priority === 'low');

      const taskButtons = [];
      
      // Add high priority tasks first
      if (highPriorityTasks.length > 0) {
        highPriorityTasks.slice(0, 5).forEach(task => {
          const truncatedTitle = task.title.length > 25 ? task.title.substring(0, 25) + '...' : task.title;
          taskButtons.push([
            Markup.button.callback(
              `🔴 ${truncatedTitle}`,
              `complete_${task.id}`
            )
          ]);
        });
      }

      // Add medium priority tasks
      if (mediumPriorityTasks.length > 0 && taskButtons.length < 8) {
        mediumPriorityTasks.slice(0, 8 - taskButtons.length).forEach(task => {
          const truncatedTitle = task.title.length > 25 ? task.title.substring(0, 25) + '...' : task.title;
          taskButtons.push([
            Markup.button.callback(
              `🟡 ${truncatedTitle}`,
              `complete_${task.id}`
            )
          ]);
        });
      }

      // Add low priority tasks if there's still space
      if (lowPriorityTasks.length > 0 && taskButtons.length < 10) {
        lowPriorityTasks.slice(0, 10 - taskButtons.length).forEach(task => {
          const truncatedTitle = task.title.length > 25 ? task.title.substring(0, 25) + '...' : task.title;
          taskButtons.push([
            Markup.button.callback(
              `🟢 ${truncatedTitle}`,
              `complete_${task.id}`
            )
          ]);
        });
      }

      // Add navigation buttons
      taskButtons.push([Markup.button.callback('🔙 Back to Tasks', 'task_refresh')]);

      const keyboard = Markup.inlineKeyboard(taskButtons);
      
      let message = '✅ *Mark Task as Complete*\n\n';
      message += 'Select a task to mark as completed:\n\n';
      message += `📊 *Available Tasks:* ${incompleteTasks.length}\n`;
      if (highPriorityTasks.length > 0) message += `🔴 High Priority: ${highPriorityTasks.length}\n`;
      if (mediumPriorityTasks.length > 0) message += `🟡 Medium Priority: ${mediumPriorityTasks.length}\n`;
      if (lowPriorityTasks.length > 0) message += `🟢 Low Priority: ${lowPriorityTasks.length}\n`;

      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
      console.error('Error in handleCompleteTask:', error);
      await ctx.reply('❌ Error fetching your tasks. Please try again.');
    }
  }

  private async enterCreateGroupScene(ctx: BotContext) {
    if ((ctx.session as BotSessionData)?.userRole !== 'admin') {
      await ctx.reply('❌ Only admins can create groups.');
      return;
    }
    await ctx.scene.enter('create-group');
  }

  private async enterCreateTaskScene(ctx: BotContext) {
    if ((ctx.session as BotSessionData)?.userRole !== 'admin') {
      await ctx.reply('❌ Only admins can create tasks.');
      return;
    }
    await ctx.scene.enter('create-task');
  }

  private async handleAdminMenu(ctx: BotContext) {
    if ((ctx.session as BotSessionData)?.userRole !== 'admin') {
      await ctx.reply('❌ You need admin privileges to access this menu.');
      return;
    }

    const adminKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('👥 Manage Users', 'admin_users'),
        Markup.button.callback('📁 Manage Groups', 'admin_groups')
      ],
      [
        Markup.button.callback('📋 Manage Tasks', 'admin_tasks'),
        Markup.button.callback('📊 Statistics', 'admin_stats')
      ],
      [
        Markup.button.callback('➕ Create Task', 'admin_create_task'),
        Markup.button.callback('📁 Create Group', 'admin_create_group')
      ]
    ]);

    await ctx.reply('🛠 *Admin Panel*\n\nChoose an option:', {
      parse_mode: 'Markdown',
      ...adminKeyboard
    });
  }

  private async handleAdminActions(ctx: BotContext) {
    if ((ctx.session as BotSessionData)?.userRole !== 'admin') return;

    const action = ctx.match![1];

    switch (action) {
      case 'users':
        await this.handleAllUsers(ctx);
        break;
      case 'groups':
        await this.handleAllGroups(ctx);
        break;
      case 'tasks':
        await this.handleAllTasks(ctx);
        break;
      case 'stats':
        await this.handleStats(ctx);
        break;
      case 'create_task':
        await this.enterCreateTaskScene(ctx);
        break;
      case 'create_group':
        await this.enterCreateGroupScene(ctx);
        break;
    }
  }

  private async handleTaskActions(ctx: BotContext) {
    const action = ctx.match![1];

    switch (action) {
      case 'complete':
        await this.handleCompleteTask(ctx);
        break;
      case 'refresh':
        await this.handleMyTasks(ctx);
        break;
      case 'filter':
        await this.handleTaskFilter(ctx);
        break;
    }
  }

  private async handleGroupActions(ctx: BotContext) {
    const action = ctx.match![1];

    switch (action) {
      case 'refresh':
        await this.handleMyGroups(ctx);
        break;
      case 'create':
        await this.enterCreateGroupScene(ctx);
        break;
    }
  }

  private async handleCompleteTaskAction(ctx: BotContext) {
    if (!(ctx.session as BotSessionData)?.userId) return;

    const taskId = ctx.match![1];

    try {
      const task = await this.taskUseCase.markTaskComplete(taskId, (ctx.session as BotSessionData).userId);

      if (task) {
        await ctx.editMessageText(`✅ Task "${task.title}" marked as complete!`);
      }
    } catch (error) {
      await ctx.editMessageText(`❌ Failed to complete task: ${error instanceof Error ? error.message : 'Task not found or not assigned to you'}`);
    }
  }

  private async handlePrioritySelection(ctx: BotContext) {
    const priority = ctx.match![1] as 'high' | 'medium' | 'low';
    
    if ((ctx.session as BotSessionData)?.tempData) {
      (ctx.session as BotSessionData).tempData.priority = priority;
      await ctx.editMessageText(`⚡ Priority set to: ${this.getPriorityText(priority)}\n\nNow finalizing task creation...`);
      
      // Continue to next step in wizard - Fixed wizard usage
      if (ctx.scene.current && ctx.wizard) {
        return ctx.wizard.next();
      }
    }
  }

  private async handleTaskFilter(ctx: BotContext) {
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔴 High Priority', 'filter_high'),
        Markup.button.callback('🟡 Medium Priority', 'filter_medium'),
        Markup.button.callback('🟢 Low Priority', 'filter_low')
      ],
      [
        Markup.button.callback('⏳ Pending', 'filter_pending'),
        Markup.button.callback('🔄 In Progress', 'filter_progress'),
        Markup.button.callback('✅ Completed', 'filter_completed')
      ],
      [
        Markup.button.callback('📅 Due Today', 'filter_today'),
        Markup.button.callback('📆 Due This Week', 'filter_week'),
        Markup.button.callback('🚨 Overdue', 'filter_overdue')
      ],
      [Markup.button.callback('🔙 Back to Tasks', 'task_refresh')]
    ]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText('🔍 *Filter Tasks*\n\nSelect a filter to view specific tasks:', {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } else {
      await ctx.reply('🔍 *Filter Tasks*\n\nSelect a filter to view specific tasks:', {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  }

  private async handlePagination(ctx: BotContext) {
    const pageInfo = ctx.match![1]; // e.g., "tasks_2" or "users_3"
    const [type, pageStr] = pageInfo.split('_');
    const page = parseInt(pageStr);

    // Implementation for pagination would go here
    // For now, just acknowledge
    await ctx.answerCbQuery(`Navigating to page ${page}`);
  }

  private async handleAllUsers(ctx: BotContext) {
    if ((ctx.session as BotSessionData)?.userRole !== 'admin') return;

    try {
      const users = await this.userUseCase.getAllUsers();
      let message = '👥 *All Users*\n\n';

      users.forEach((user, index) => {
        const roleEmoji = user.role === 'admin' ? '👑' : '👤';
        message += `${index + 1}. ${roleEmoji} ${user.firstName || 'Unknown'} ${user.lastName || ''}\n`;
        message += `   📱 @${user.userName || 'N/A'}\n`;
        message += `   🆔 ${user.telegramId}\n`;
        message += `   📊 Role: ${user.role}\n\n`;
      });

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.reply('❌ Error fetching users.');
    }
  }

  private async handleAllGroups(ctx: BotContext) {
    if ((ctx.session as BotSessionData)?.userRole !== 'admin') return;

    try {
      const groups = await this.groupUseCase.getAllGroups();

      if (groups.length === 0) {
        await ctx.reply('📁 No groups found.');
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

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.reply('❌ Error fetching groups.');
    }
  }

  private async handleAllTasks(ctx: BotContext) {
    if ((ctx.session as BotSessionData)?.userRole !== 'admin') return;

    try {
      const tasks = await this.taskUseCase.getAllTasks();

      if (tasks.length === 0) {
        await ctx.reply('📋 No tasks found.');
        return;
      }

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

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.reply('❌ Error fetching tasks.');
    }
  }

  private async handleStats(ctx: BotContext) {
    if ((ctx.session as BotSessionData)?.userRole !== 'admin') return;

    try {
      const users = await this.userUseCase.getAllUsers();
      const groups = await this.groupUseCase.getAllGroups();
      const tasks = await this.taskUseCase.getAllTasks();

      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const pendingTasks = tasks.filter(task => task.status === 'pending').length;
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;

      const message = `📊 *System Statistics*

👥 **Users:** ${users.length}
   • Admins: ${users.filter(u => u.role === 'admin').length}
   • Regular Users: ${users.filter(u => u.role === 'user').length}

📁 **Groups:** ${groups.length}

📋 **Tasks:** ${tasks.length}
   • ✅ Completed: ${completedTasks}
   • ⏳ Pending: ${pendingTasks}
   • 🔄 In Progress: ${inProgressTasks}

📈 **Completion Rate:** ${tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.reply('❌ Error fetching statistics.');
    }
  }

  private getMainKeyboard(role: string) {
    const userButtons = [
      ['📋 My Tasks', '📁 My Groups'],
      ['📅 Today', '📆 This Week'],
      ['✅ Complete Task', '❓ Help']
    ];

    const adminButtons = [
      ['🛠 Admin Panel'],
      ['📁 Create Group', '➕ Create Task'],
      ['👥 All Users', '📊 All Tasks'],
      ['📋 My Tasks', '📁 My Groups'],
      ['📅 Today', '📆 This Week'],
      ['✅ Complete Task', '❓ Help']
    ];

    const buttons = role === 'admin' ? adminButtons : userButtons;
    
    return Markup.keyboard(buttons)
      .resize()
      .persistent();
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

  private getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return '🔴 High Priority';
      case 'medium': return '🟡 Medium Priority';
      case 'low': return '🟢 Low Priority';
      default: return 'Unknown Priority';
    }
  }

  private getUserHelpText(): string {
    return `*Task Manager Bot - User Guide*

**Available Commands:**
• /start - Register/login to the bot
• /mytasks - View your assigned tasks
• /mygroups - View your groups
• /complete - Mark a task as complete
• /today - View tasks due today
• /week - View tasks due this week
• /overdue - View overdue tasks
• /help - Show this help message

**Quick Actions:**
Use the keyboard buttons below for quick access to common functions.

**Task Completion:**
Use the task ID or the "Complete Task" button to mark tasks as done.

**Need Help?**
Contact your administrator if you need assistance with tasks or groups.`;
  }

  private getAdminHelpText(): string {
    return `*Task Manager Bot - Admin Guide*

**User Commands:**
• /mytasks - View your tasks
• /mygroups - View your groups  
• /complete - Mark tasks complete
• /today - Today's tasks
• /week - This week's tasks
• /overdue - Overdue tasks

**Admin Commands:**
• /admin - Open admin panel
• /creategroup - Create new group
• /createtask - Create new task
• /users - View all users
• /groups - View all groups
• /tasks - View all tasks
• /stats - System statistics

**Management Features:**
• User registration & role management
• Group creation & member management
• Task creation & assignment
• Priority & deadline management
• Progress tracking & statistics

**Tips:**
• Use inline keyboards for quick actions
• Tasks can be filtered by priority, status, or date
• Bulk operations available through admin panel`;
  }

  public async startBot() {
    try {
      await this.bot.launch();
      console.log('🚀 Telegram bot started successfully!');
      
      // Enable graceful stop
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      console.error('❌ Failed to start Telegram bot:', error);
      throw error;
    }
  }

  public async stopBot() {
    try {
      await this.bot.stop();
      console.log('🛑 Telegram bot stopped successfully!');
    } catch (error) {
      console.error('❌ Error stopping Telegram bot:', error);
      throw error;
    }
  }

  public getBotInfo() {
    return {
      name: 'Task Manager Bot',
      version: '1.0.0',
      status: 'running'
    };
  }
}