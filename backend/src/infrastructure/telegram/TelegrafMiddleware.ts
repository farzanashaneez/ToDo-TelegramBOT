import { Context, Middleware, Scenes } from 'telegraf';
import { UserUseCase } from '../../domain/usecases/UserUseCase';
import { Update } from 'telegraf/typings/core/types/typegram';

// interface BotContext extends Context<Update> {
//     session?: {
//       userId?: string;
//       userRole?: 'admin' | 'user';
//       currentAction?: string;
//       tempData?: any;
//     };
//   }
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
  }
  

export class TelegrafMiddleware {
  constructor(private userUseCase: UserUseCase) {}

  // Rate limiting middleware
  rateLimit(): Middleware<BotContext> {
    const userRequests = new Map<string, number[]>();

    return async (ctx, next) => {
      if (!ctx.from) return next();

      const userId = ctx.from.id.toString();
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute
      const maxRequests = 30; // max 30 requests per minute

      if (!userRequests.has(userId)) {
        userRequests.set(userId, []);
      }

      const requests = userRequests.get(userId)!;
      // Remove old requests outside the window
      const validRequests = requests.filter(time => now - time < windowMs);
      
      if (validRequests.length >= maxRequests) {
        await ctx.reply('⚠️ Rate limit exceeded. Please wait a moment before sending more commands.');
        return;
      }

      validRequests.push(now);
      userRequests.set(userId, validRequests);

      return next();
    };
  }

  // Authentication middleware
  authenticate(): Middleware<BotContext> {
    return async (ctx, next) => {
      if (!ctx.from) {
        await ctx.reply('❌ Unable to authenticate user.');
        return;
      }

      const user = await this.userUseCase.getUserByTelegramId(ctx.from.id.toString());
      
      if (!user) {
        await ctx.reply('❌ Please register first using /start command.');
        return;
      }

      if (ctx.session) {
        (ctx.session as BotSessionData).userId = user.id;
        (ctx.session as BotSessionData).userRole = user.role;
      }

      return next();
    };
  }

  // Admin authorization middleware
  requireAdmin(): Middleware<BotContext> {
    return async (ctx, next) => {
      if ((ctx.session as BotSessionData)?.userRole !== 'admin') {
        await ctx.reply('❌ This command requires admin privileges.');
        return;
      }
      return next();
    };
  }

  // Logging middleware
  logging(): Middleware<BotContext> {
    return async (ctx, next) => {
      const start = Date.now();
      const userId = ctx.from?.id;
      const username = ctx.from?.username;

      let command: string | undefined;

      if (ctx.message && 'text' in ctx.message) {
        command = ctx.message.text;
      } else if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        command = ctx.callbackQuery.data;
      }
      console.log(`📥 Incoming: User ${userId} (@${username}) - ${command}`);

      await next();

      const responseTime = Date.now() - start;
      console.log(`📤 Response: ${responseTime}ms`);
    };
  }
}