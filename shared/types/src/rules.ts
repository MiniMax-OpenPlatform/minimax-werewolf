// 游戏规则配置类型定义

export interface GameRules {
  // 基础配置
  playerCount: number;

  // 角色配置
  roles: {
    werewolf: number;    // 狼人数量
    seer: number;        // 预言家数量
    witch: number;       // 女巫数量
    villager: number;    // 村民数量
  };

  // 胜利条件
  winConditions: {
    villagersWin: string;      // 好人胜利条件描述
    werewolvesWin: string;     // 狼人胜利条件描述
  };

  // 特殊规则
  specialRules: {
    witchFirstNightSelfSave: boolean;  // 女巫首夜可否自救
    witchSamaNightBothPotions: boolean; // 女巫同夜可否同时用两瓶药
    tieVoteNoElimination: boolean;     // 平票是否无人出局
    deadPlayersSilent: boolean;        // 死亡玩家是否禁言
    revealRoleOnDeath: boolean;        // 死亡是否公开身份
  };

  // 游戏流程
  gameFlow: {
    nightOrder: string[];     // 夜晚行动顺序
    dayDiscussion: boolean;   // 是否有白天讨论
    votingEnabled: boolean;   // 是否启用投票
  };

  // 角色技能说明
  roleDescriptions: {
    villager: string;
    werewolf: string;
    seer: string;
    witch: string;
  };
}

// 默认规则配置
export const DEFAULT_GAME_RULES: GameRules = {
  playerCount: 6,

  roles: {
    werewolf: 2,
    seer: 1,
    witch: 1,
    villager: 2,
  },

  winConditions: {
    villagersWin: '所有狼人被淘汰',
    werewolvesWin: '狼人数量 ≥ 好人数量',
  },

  specialRules: {
    witchFirstNightSelfSave: true,
    witchSamaNightBothPotions: false,
    tieVoteNoElimination: true,
    deadPlayersSilent: true,
    revealRoleOnDeath: false,
  },

  gameFlow: {
    nightOrder: ['werewolf', 'seer', 'witch'],
    dayDiscussion: true,
    votingEnabled: true,
  },

  roleDescriptions: {
    villager: '👤 村民：无特殊技能，通过讨论和投票找出狼人',
    werewolf: '🐺 狼人：每晚击杀一名玩家，知道队友身份',
    seer: '🔮 预言家：每晚查验一名玩家的身份（好人/狼人）',
    witch: '🧪 女巫：拥有解药和毒药各一瓶，解药可以救人，毒药可以毒死一人',
  },
};
