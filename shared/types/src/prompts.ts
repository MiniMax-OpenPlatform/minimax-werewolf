import { Role, type AllVotes, type Round, type Speech, type PlayerInfo } from "./api";

// Speech history type - using Speech from types
export type SpeechHistory = Speech;

// 投票信息
export interface VoteInfo {
  voter: string;
  target: string;
  reason?: string;
}

// 人格特征参数
export interface PersonalityParams {
  role: Role;
  playerId: string;
  playerName: string;
}

// 发言生成参数
export interface SpeechParams {
  playerId: string;
  playerName: string;
  role: string;  // 改为string，因为传入的是中文角色名
  speechHistory: SpeechHistory[];
  customContent?: string;
  teammates?: string[];  // 狼人队友
  suspiciousPlayers?: string[];
  logicalContradictions?: string;
}

// 投票决策参数
export interface VotingParams {
  playerId: string;
  role: Role;
  alivePlayers: PlayerInfo[];
  speechSummary: SpeechHistory[];
  currentVotes: VoteInfo[];
  allVotes?: AllVotes; // 完整投票历史，供AI分析投票模式
  currentRound?: Round;
  teammates?: string[]; // 狼人队友
}

// 夜间决策参数
export interface NightActionParams {
  playerId: number;
  role: Role;
  alivePlayers: PlayerInfo[];
  currentRound: number;
  historyEvents: string[];
  teammates?: number[]; // 队友信息
  customContent?: string; // 自定义内容
  checkedPlayers?: { [key: string]: 'good' | 'werewolf' }; // 预言家查验结果
  potionUsed?: { heal: boolean; poison: boolean }; // 女巫药水使用情况
  guardHistory?: string[]; // 守卫历史
}


// 遗言生成参数
export interface LastWordsParams {
  playerId: string;
  playerName: string;
  role: Role;
  killedBy: 'werewolf' | 'vote' | 'poison';
  alivePlayers: PlayerInfo[];
  importantInfo?: string;
}

// 狼人团队协商参数
export interface WerewolfTeamParams {
  playerId: string;
  teammates: PlayerInfo[];
  alivePlayers: PlayerInfo[];
  targetCandidates: string[];
  gameAnalysis: string;
}


// Response interfaces for internal use
export interface NightActionResponse {
  action: string;
  target?: string;
  reason: string;
}

export interface VotingResponse {
  target: string;
  reason: string;
}

export interface RoleSettingResponse {
  name: string;
  personality: string;
  playstyle: string;
  catchphrase: string;
}