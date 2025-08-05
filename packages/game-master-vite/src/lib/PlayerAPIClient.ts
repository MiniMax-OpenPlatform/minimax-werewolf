// 导入共享类型
// 导入共享类型
import type {
  PlayerContext,
  StartGameParams
} from '@ai-werewolf/types';

export class PlayerAPIClient {
  private url: string;
  private playerId: number;

  constructor(playerId: number, url: string) {
    this.playerId = playerId;
    this.url = url;
  }

  // 统一的API调用方法
  private async call(endpoint: 'use-ability' | 'speak' | 'vote' | 'start-game', params: any): Promise<any> {
    try {
      const response = await fetch(`${this.url}/api/player/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        const errorText = await response.text();
        console.error(`❌ API call failed for player ${this.playerId}: ${response.status} ${errorText}`);
        return null;
      }
    } catch (error) {
      console.error(`💥 Error calling API for player ${this.playerId}:`, error);
      return null;
    }
  }

  // 调用能力API
  async useAbility(params: PlayerContext): Promise<any> {
    return this.call('use-ability', params);
  }

  // 调用发言API
  async speak(params: PlayerContext): Promise<any> {
    return this.call('speak', params);
  }

  // 调用投票API
  async vote(params: PlayerContext): Promise<any> {
    return this.call('vote', params);
  }

  // 开始游戏API
  async startGame(params: StartGameParams): Promise<any> {
    return this.call('start-game', params);
  }
}