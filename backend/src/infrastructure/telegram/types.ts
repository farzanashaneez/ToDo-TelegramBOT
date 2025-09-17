import { Scenes } from 'telegraf';

// Extend the WizardSessionData by adding your own properties, including the required cursor
export interface BotSessionData extends Scenes.WizardSessionData {
  userId?: string;
  userRole?: 'admin' | 'user';
  currentAction?: string;
  tempData?: any;
}

// Use the extended interface as the generic parameter for WizardContext
export interface BotContext extends Scenes.WizardContext<BotSessionData> {
  match?: RegExpExecArray;
}
