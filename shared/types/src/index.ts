
export interface NightTempState {
  werewolfTarget?: number;
  witchHealTarget?: number;
  witchPoisonTarget?: number;
}

export interface GameEvent {
  type: string;
  playerId?: number;
  content?: any;
  timestamp: Date;
}

export type PersonalityType = 'aggressive' | 'conservative' | 'cunning';

export * from './api';
export * from './schemas';
export * from './prompts';