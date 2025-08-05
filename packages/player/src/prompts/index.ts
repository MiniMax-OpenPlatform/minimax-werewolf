import { type GameContext } from '@ai-werewolf/types';
import type { PlayerServer } from '../PlayerServer';

// Personality functions
export * from './personality';

// Speech generation functions
export * from './speech';

// Voting decision functions
export * from './voting';

// Night action functions
export * from './night';

// Special scenario functions
export * from './special';

// Main prompt factory class
export class WerewolfPrompts {
  // Personality prompts
  static getPersonality(
    personalityType: 'aggressive' | 'conservative' | 'cunning'
  ): string {
    const { getPersonalityPrompt } = require('./personality');
    return getPersonalityPrompt(personalityType);
  }

  // Speech prompts
  static getSpeech(
    playerServer: PlayerServer,
    context: GameContext
  ): string {
    const { getRoleSpeech } = require('./speech');
    return getRoleSpeech(playerServer, context);
  }

  // Voting prompts
  static getVoting(
    playerServer: PlayerServer,
    context: GameContext
  ): string {
    const { getRoleVoting } = require('./voting');
    return getRoleVoting(playerServer, context);
  }

  // Night action prompts
  static getNightAction(
    playerServer: PlayerServer,
    context: GameContext
  ): string {
    const { getRoleNightAction } = require('./night');
    return getRoleNightAction(playerServer, context);
  }

  // Special scenario prompts
  // TODO: 遗言功能暂时注释，待后续实现
  // static getLastWords(
  //   playerServer: PlayerServer,
  //   context: PlayerContext
  // ): string {
  //   const { getLastWords } = require('./special');
  //   return getLastWords(playerServer, context);
  // }
}

// Default export
export default WerewolfPrompts;