/**
 * 游戏日志相关类型定义
 */

export interface GameLogPlayerInfo {
  id: number;
  role: string;
  personality?: string;
  isAlive: boolean;
  deathRound?: number;
  deathReason?: string; // 'werewolf_kill' | 'vote' | 'poison'
}

export interface SpeechLog {
  round: number;
  playerId: number;
  content: string;
  thinking?: string;
  traceId?: string;
  timestamp: string;
}

export interface VoteLog {
  round: number;
  voterId: number;
  targetId: number;
  reason: string;
  thinking?: string;
  traceId?: string;
  timestamp: string;
}

export interface NightActionLog {
  round: number;
  playerId: number;
  role: string;
  action: string;
  target?: number;
  healTarget?: number;
  poisonTarget?: number;
  reason?: string;
  healReason?: string;
  poisonReason?: string;
  thinking?: string;
  traceId?: string;
  timestamp: string;
}

export interface GameLogEvent {
  type: string; // 'game_start' | 'night_start' | 'day_start' | 'player_death' | 'game_end'
  description: string;
  data?: any;
  timestamp: string;
}

export interface GameLog {
  // 基础信息
  gameId: string; // 游戏唯一ID（时间戳）
  startTime: string;
  endTime?: string;
  duration?: number; // 游戏时长（秒）

  // 游戏配置
  config: {
    playerCount: number;
    roles: {
      werewolf: number;
      seer: number;
      witch: number;
      villager: number;
    };
  };

  // 玩家信息
  players: GameLogPlayerInfo[];

  // 游戏记录
  totalRounds: number;
  speeches: SpeechLog[];
  votes: VoteLog[];
  nightActions: NightActionLog[];
  events: GameLogEvent[];

  // 游戏结果
  result?: {
    winner: 'werewolf' | 'villager' | 'draw';
    reason: string;
    survivingPlayers: number[];
  };
}

export interface GameLogSummary {
  gameId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  playerCount: number;
  totalRounds: number;
  winner?: 'werewolf' | 'villager' | 'draw';
  isCompleted: boolean;
}
