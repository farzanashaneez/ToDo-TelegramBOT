import { Scenes, Markup } from 'telegraf';
import { GroupUseCase } from '../../domain/usecases/GroupUseCase';
import { TaskUseCase } from '../../domain/usecases/TaskUseCase';
import { UserUseCase } from '../../domain/usecases/UserUseCase';

interface BotSessionData extends Scenes.WizardSessionData {
    userId?: string;
    userRole?: "admin" | "user";
    currentAction?: string;
    tempData?: any;
  }
  
  type BotContext = Scenes.WizardContext<BotSessionData>;
  

export class TelegrafScenes {
  constructor(
    private userUseCase: UserUseCase,
    private groupUseCase: GroupUseCase,
    private taskUseCase: TaskUseCase
  ) {}

  // Enhanced Create Group Scene with validation
  createGroupScene() {
    return new Scenes.WizardScene<BotContext>(
      'create-group',
      // Step 1: Get group name
      async (ctx) => {
        if ((ctx.session as BotSessionData).userRole !== 'admin') {
            await ctx.reply('❌ Only admins can create groups.');
          return ctx.scene.leave();
        }

        await ctx.reply(
          '📁 *Create New Group*\n\n' +
          'Please enter a unique group name:\n\n' +
          '• Name should be 3-30 characters\n' +
          '• Only letters, numbers, and spaces allowed\n' +
          '• Cannot start or end with spaces',
          { parse_mode: 'Markdown' }
        );

        return ctx.wizard.next();
      },
      
      // Step 2: Validate name and get description
      async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          await ctx.reply('❌ Please send a text message with the group name.');
          return;
        }

        const groupName = ctx.message.text.trim();
        
        // Validation
        if (!groupName || groupName.length < 3 || groupName.length > 30) {
          await ctx.reply('❌ Group name must be between 3-30 characters. Please try again.');
          return;
        }

        if (!/^[a-zA-Z0-9\s]+$/.test(groupName)) {
          await ctx.reply('❌ Group name can only contain letters, numbers, and spaces. Please try again.');
          return;
        }

        // Check if group already exists
        try {
          const existingGroup = await this.groupUseCase.getAllGroups();
          if (existingGroup.some(group => group.name.toLowerCase() === groupName.toLowerCase())) {
            await ctx.reply('❌ A group with this name already exists. Please choose a different name.');
            return;
          }
        } catch (error) {
          await ctx.reply('❌ Error checking group name. Please try again.');
          return;
        }

        (ctx.session as BotSessionData)!.tempData = { groupName };
        
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('⏭️ Skip Description', 'skip_description')],
          [Markup.button.callback('❌ Cancel', 'cancel_creation')]
        ]);

        await ctx.reply(
          '📝 *Group Name Accepted!*\n\n' +
          `Group: *${groupName}*\n\n` +
          'Now enter a description for the group (optional):',
          { parse_mode: 'Markdown', ...keyboard }
        );

        return ctx.wizard.next();
      },
      
      // Step 3: Process description and create group
      async (ctx) => {
        let description: string | undefined;

        if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
          if (ctx.callbackQuery.data === 'skip_description') {
            description = undefined;
            await ctx.answerCbQuery('Description skipped');
          } else if (ctx.callbackQuery.data === 'cancel_creation') {
            await ctx.answerCbQuery('Group creation cancelled');
            await ctx.editMessageText('❌ Group creation cancelled.');
            return ctx.scene.leave();
          }
        } else if (ctx.message && 'text' in ctx.message) {
          description = ctx.message.text.trim();
          if (description.length > 200) {
            await ctx.reply('❌ Description is too long (max 200 characters). Please try again.');
            return;
          }
        } else {
          await ctx.reply('❌ Please send a text description or use the buttons.');
          return;
        }

        // Create the group
        try {
          const group = await this.groupUseCase.createGroup(
           (ctx.session as BotSessionData)!.tempData.groupName,
           (ctx.session as BotSessionData)!.userId!,
            description
          );

          const successMessage = `✅ *Group Created Successfully!*\n\n` +
            `📁 Name: *${group.name}*\n` +
            `📝 Description: ${group.description || 'None'}\n` +
            `🆔 Group ID: \`${group.id}\`\n` +
            `👤 Created by: You\n` +
            `👥 Members: 1 (You)\n\n` +
            `Use /admin to manage group members.`;

          if (ctx.callbackQuery) {
            await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });
          } else {
            await ctx.reply(successMessage, { parse_mode: 'Markdown' });
          }

        } catch (error) {
          const errorMessage = `❌ Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`;
          
          if (ctx.callbackQuery) {
            await ctx.editMessageText(errorMessage);
          } else {
            await ctx.reply(errorMessage);
          }
        }

        return ctx.scene.leave();
      }
    );
  }

  // Enhanced Create Task Scene with better UX
  createTaskScene() {
    return new Scenes.WizardScene<BotContext>(
      'create-task',
      // Step 1: Get task title
      async (ctx) => {
        if ((ctx.session as BotSessionData)?.userRole !== 'admin') {
          await ctx.reply('❌ Only admins can create tasks.');
          return ctx.scene.leave();
        }

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_task_creation')]
        ]);

        await ctx.reply(
          '📋 *Create New Task*\n\n' +
          'Please enter the task title:\n\n' +
          '• Title should be 5-100 characters\n' +
          '• Be descriptive and clear\n' +
          '• Avoid special characters',
          { parse_mode: 'Markdown', ...keyboard }
        );

        return ctx.wizard.next();
      },
      
      // Step 2: Validate title and get description
      async (ctx) => {
        if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_task_creation') {
          await ctx.answerCbQuery('Task creation cancelled');
          await ctx.editMessageText('❌ Task creation cancelled.');
          return ctx.scene.leave();
        }

        if (!ctx.message || !('text' in ctx.message)) {
          await ctx.reply('❌ Please send a text message with the task title.');
          return;
        }

        const title = ctx.message.text.trim();
        
        if (!title || title.length < 5 || title.length > 100) {
          await ctx.reply('❌ Task title must be between 5-100 characters. Please try again.');
          return;
        }

        (ctx.session as BotSessionData)!.tempData = { title };
        
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('⏭️ Skip Description', 'skip_task_description')],
          [Markup.button.callback('❌ Cancel', 'cancel_task_creation')]
        ]);

        await ctx.reply(
          '📝 *Title Accepted!*\n\n' +
          `Task: *${title}*\n\n` +
          'Now enter a detailed description (optional):',
          { parse_mode: 'Markdown', ...keyboard }
        );

        return ctx.wizard.next();
      },
      
      // Step 3: Process description and get deadline
      async (ctx) => {
        if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
          if (ctx.callbackQuery.data === 'skip_task_description') {
            (ctx.session as BotSessionData)!.tempData.description = undefined;
            await ctx.answerCbQuery('Description skipped');
          } else if (ctx.callbackQuery.data === 'cancel_task_creation') {
            await ctx.answerCbQuery('Task creation cancelled');
            await ctx.editMessageText('❌ Task creation cancelled.');
            return ctx.scene.leave();
          }
        } else if (ctx.message && 'text' in ctx.message) {
          const description = ctx.message.text.trim();
          if (description.length > 500) {
            await ctx.reply('❌ Description is too long (max 500 characters). Please try again.');
            return;
          }
          (ctx.session as BotSessionData)!.tempData.description = description;
        } else {
          await ctx.reply('❌ Please send a text description or use the buttons.');
          return;
        }

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('📅 Tomorrow', 'deadline_tomorrow')],
          [Markup.button.callback('📅 Next Week', 'deadline_next_week')],
          [Markup.button.callback('📅 Custom Date', 'deadline_custom')],
          [Markup.button.callback('❌ Cancel', 'cancel_task_creation')]
        ]);

        const message = `📅 *Select Deadline*\n\n` +
          `Task: *${( (ctx.session as BotSessionData))!.tempData.title}*\n` +
          `Description: ${( (ctx.session as BotSessionData))!.tempData.description || 'None'}\n\n` +
          `Choose when this task should be completed:`;

        if (ctx.callbackQuery) {
          await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
        } else {
          await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        }

        return ctx.wizard.next();
      },
      
      // Step 4: Process deadline selection and get priority
      async (ctx) => {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
          if (ctx.message && 'text' in ctx.message) {
            // Custom date input
            try {
              const deadline = new Date(ctx.message.text.trim());
              if (isNaN(deadline.getTime()) || deadline <= new Date()) {
                await ctx.reply('❌ Invalid date format or date in the past. Please enter a valid future date (YYYY-MM-DD HH:MM) or use the buttons.');
                return;
              }
              ( (ctx.session as BotSessionData))!.tempData.deadline = deadline;
            } catch (error) {
              await ctx.reply('❌ Invalid date format. Please use YYYY-MM-DD HH:MM format or select from the buttons.');
              return;
            }
          } else {
            await ctx.reply('❌ Please select a deadline option or send a custom date.');
            return;
          }
        } else {
          const action = ctx.callbackQuery.data;
          
          if (action === 'cancel_task_creation') {
            await ctx.answerCbQuery('Task creation cancelled');
            await ctx.editMessageText('❌ Task creation cancelled.');
            return ctx.scene.leave();
          }

          let deadline: Date;
          switch (action) {
            case 'deadline_tomorrow':
              deadline = new Date();
              deadline.setDate(deadline.getDate() + 1);
              deadline.setHours(23, 59, 59, 999);
              await ctx.answerCbQuery('Tomorrow selected');
              break;
            case 'deadline_next_week':
              deadline = new Date();
              deadline.setDate(deadline.getDate() + 7);
              deadline.setHours(23, 59, 59, 999);
              await ctx.answerCbQuery('Next week selected');
              break;
            case 'deadline_custom':
              await ctx.answerCbQuery('Enter custom date');
              await ctx.editMessageText(
                '📅 *Enter Custom Deadline*\n\n' +
                'Please enter the deadline in format:\n' +
                '`YYYY-MM-DD HH:MM`\n\n' +
                'Example: `2024-12-25 18:00`',
                { parse_mode: 'Markdown' }
              );
              return;
            default:
              await ctx.answerCbQuery('Invalid option');
              return;
          }
          
          ( (ctx.session as BotSessionData))!.tempData.deadline = deadline;
        }

        // Show priority selection
        const priorityKeyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback('🔴 High', 'task_priority_high'),
            Markup.button.callback('🟡 Medium', 'task_priority_medium'),
            Markup.button.callback('🟢 Low', 'task_priority_low')
          ],
          [Markup.button.callback('❌ Cancel', 'cancel_task_creation')]
        ]);

        const message = `⚡ *Select Priority*\n\n` +
          `Task: *${( (ctx.session as BotSessionData))!.tempData.title}*\n` +
          `Deadline: ${( (ctx.session as BotSessionData))!.tempData.deadline.toLocaleString()}\n\n` +
          `Choose the task priority:`;

        if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data !== 'deadline_custom') {
          await ctx.editMessageText(message, { parse_mode: 'Markdown', ...priorityKeyboard });
        } else {
          await ctx.reply(message, { parse_mode: 'Markdown', ...priorityKeyboard });
        }

        return ctx.wizard.next();
      },
      
      // Step 5: Process priority and create task
      async (ctx) => {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
          await ctx.reply('❌ Please select a priority option.');
          return;
        }

        const action = ctx.callbackQuery.data;
        
        if (action === 'cancel_task_creation') {
          await ctx.answerCbQuery('Task creation cancelled');
          await ctx.editMessageText('❌ Task creation cancelled.');
          return ctx.scene.leave();
        }

        let priority: 'high' | 'medium' | 'low';
        switch (action) {
          case 'task_priority_high':
            priority = 'high';
            await ctx.answerCbQuery('High priority selected');
            break;
          case 'task_priority_medium':
            priority = 'medium';
            await ctx.answerCbQuery('Medium priority selected');
            break;
          case 'task_priority_low':
            priority = 'low';
            await ctx.answerCbQuery('Low priority selected');
            break;
          default:
            await ctx.answerCbQuery('Invalid priority');
            return;
        }

        ( (ctx.session as BotSessionData))!.tempData.priority = priority;

        // Get available groups
        try {
          const groups = await this.groupUseCase.getAllGroups();
          
          if (groups.length === 0) {
            await ctx.editMessageText('❌ No groups available. Please create a group first using /creategroup');
            return ctx.scene.leave();
          }

          // For now, assign to first group (in production, you'd want group selection)
          const task = await this.taskUseCase.createTask(
            ( (ctx.session as BotSessionData))!.tempData.title,
            ( (ctx.session as BotSessionData))!.tempData.description || '',
            ( (ctx.session as BotSessionData))!.tempData.deadline,
            priority,
            ( (ctx.session as BotSessionData))!.userId!,
            undefined, // assignedTo users
            groups[0].id // assign to first group
          );

          const successMessage = `✅ *Task Created Successfully!*\n\n` +
            `📋 Title: *${task.title}*\n` +
            `📝 Description: ${task.description || 'None'}\n` +
            `📅 Deadline: ${new Date(task.deadline).toLocaleString()}\n` +
            `⚡ Priority: ${this.getPriorityText(task.priority)}\n` +
            `👥 Assigned to: Group "${groups[0].name}"\n` +
            `🆔 Task ID: \`${task.id}\`\n\n` +
            `✉️ Notifications have been sent to all group members.`;

          await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });

        } catch (error) {
          await ctx.editMessageText(`❌ Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return ctx.scene.leave();
      }
    );
  }

  private getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return '🔴 High';
      case 'medium': return '🟡 Medium';
      case 'low': return '🟢 Low';
      default: return '⚪ Normal';
    }
  }
}