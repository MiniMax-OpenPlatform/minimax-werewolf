// 基础类型定义
export enum Role {
  VILLAGER = 'villager',
  WEREWOLF = 'werewolf',
  SEER = 'seer',
  WITCH = 'witch',
}

export enum GamePhase {
  PREPARING = 'preparing',
  NIGHT = 'night',
  DAY = 'day',
  VOTING = 'voting',
  ENDED = 'ended'
}

export enum WinCondition {
  ONGOING = 'ongoing',
  WEREWOLVES_WIN = 'werewolves_win',
  VILLAGERS_WIN = 'villagers_win'
}

export interface PlayerInfo {
  id: number;
  isAlive: boolean;
}

export type Round = number;
export type PlayerId = number;



export interface Speech {
  playerId: number;
  content: string;
  type?: 'player' | 'system';
}

// 所有发言记录的类型定义
export type AllSpeeches = Record<Round, Speech[]>;

// 投票记录
export interface Vote {
  voterId: number;
  targetId: number;
}

// 所有投票记录的类型定义
export type AllVotes = Record<Round, Vote[]>;



// 基础能力请求接口
export interface BaseAbilityRequest {
  reason: string;
  alivePlayers: Array<PlayerInfo>;
  currentRound: number;
}

export type InvestigatedPlayers = Record<Round, {
  target: number;
  isGood: boolean;
}>

// 女巫能力请求
export interface WitchAbilityRequest extends BaseAbilityRequest {
  killedTonight?: number;
  potionUsed: { heal: boolean; poison: boolean };
}

// 预言家能力请求
export interface SeerAbilityRequest extends BaseAbilityRequest {}

// 狼人能力请求
export interface WerewolfAbilityRequest extends BaseAbilityRequest {
}


// 女巫能力响应
export interface WitchAbilityResponse {
  action: 'using'|"idle"
  healTarget:number // 0 表示 不行动
  healReason:string
  poisonTarget:number // 0 表示 不行动
  poisonReason:string
}

// 预言家能力响应
export interface SeerAbilityResponse {
  action: 'investigate';
  target: number;
  reason: string;
}

// 狼人能力响应
export interface WerewolfAbilityResponse {
  action: 'kill'|'idle';
  target: number;
  reason: string;
}

// Player API 上下文类型
export interface PlayerContext {
  round: Round;
  currentPhase: GamePhase;
  alivePlayers: PlayerInfo[];
  allSpeeches: AllSpeeches;
  allVotes: AllVotes;
}

// 女巫特有上下文
export interface WitchContext extends PlayerContext {
  killedTonight?: PlayerId;
  potionUsed: { heal: boolean; poison: boolean };
}

// 预言家特有上下文
export interface SeerContext extends PlayerContext {
  investigatedPlayers: InvestigatedPlayers;
}

// 开始游戏参数
export interface StartGameParams {
  gameId: string;
  playerId: number;
  role: string;
  teammates: PlayerId[];
}

// Combined context type for all roles
export type GameContext = PlayerContext | SeerContext | WitchContext;


