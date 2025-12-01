import type { PlayerContext, SeerContext, WitchContext, GameContext } from '@ai-werewolf/types';
import { Role } from '@ai-werewolf/types';
import type { PlayerServer } from '../../PlayerServer';

function formatPlayerList(players: any[]): string {
  return players.map(p => p.name || p.id || p).join(', ');
}

function formatSpeechSummary(speeches: any[]): string {
  // 过滤掉投票阶段的发言，只保留白天讨论的发言
  const nonVotingSpeeches = speeches.filter(s => !s.content?.includes('[投票]'));
  return nonVotingSpeeches.map(s => `- ${s.playerId}: "${s.content}"`).join('\n');
}

function formatVotingHistory(votes: any): string {
  if (!votes) return '暂无历史投票记录';

  // AllVotes 格式：按轮次提取投票记录，简洁显示 "X号投Y号"
  const voteRecords: string[] = [];
  for (const [round, roundVotes] of Object.entries(votes)) {
    if (Array.isArray(roundVotes) && roundVotes.length > 0) {
      const roundVoteStr = roundVotes.map((v: any) => `${v.voterId}号投${v.targetId}号`).join('，');
      voteRecords.push(`第${round}轮: ${roundVoteStr}`);
    }
  }

  return voteRecords.length > 0 ? voteRecords.join('\n') : '暂无历史投票记录';
}

export function getVillagerVoting(playerServer: PlayerServer, context: PlayerContext): string {
  const playerId = playerServer.getPlayerId();
  const params = {
    playerId: playerId?.toString() || '0',
    role: playerServer.getRole() || Role.VILLAGER,
    alivePlayers: context.alivePlayers,
    speechSummary: Object.values(context.allSpeeches).flat(),
    currentVotes: [] as any[],
    allVotes: context.allVotes,
    currentRound: context.round
  };
  const playerList = formatPlayerList(params.alivePlayers);
  const speechSummary = formatSpeechSummary(params.speechSummary);
  const votingHistory = formatVotingHistory(params.allVotes);

  return `你是${params.playerId}号玩家，狼人杀游戏中的村民角色。当前投票环节：

存活玩家：[${playerList}]
今日发言摘要（白天讨论阶段）：
${speechSummary}

历史投票记录：
${votingHistory}

作为村民，你的投票策略：
1. 优先投票给发言逻辑矛盾、行为可疑的玩家
2. 避免盲从，独立分析
3. 注意保护可能的神职角色

投票说明：
- 投票不需要公开理由，其他玩家只会看到"X号投票给Y号"
- reason字段是你的内心独白，用于自己分析决策过程
- 请返回JSON格式：{"target": 玩家编号, "reason": "你的内心思考过程"}
`;
}

export function getWerewolfVoting(playerServer: PlayerServer, context: PlayerContext): string {
  const playerId = playerServer.getPlayerId();
  const teammateIds = playerServer.getTeammates();
  const params = {
    playerId: playerId?.toString() || '0',
    role: playerServer.getRole() || Role.WEREWOLF,
    alivePlayers: context.alivePlayers,
    speechSummary: Object.values(context.allSpeeches).flat(),
    currentVotes: [] as any[],
    allVotes: context.allVotes,
    currentRound: context.round,
    teammates: teammateIds?.map(id => id.toString())
  };
  const playerList = formatPlayerList(params.alivePlayers);
  const speechSummary = formatSpeechSummary(params.speechSummary);
  const votingHistory = formatVotingHistory(params.allVotes);
  const teammates = params.teammates?.join('、') || '暂无队友信息';

  return `你是${params.playerId}号玩家，狼人杀游戏中的狼人角色。当前投票环节：

存活玩家：[${playerList}]
你的狼人队友：${teammates}
今日发言摘要（白天讨论阶段）：
${speechSummary}

历史投票记录：
${votingHistory}

作为狼人，你的投票策略：
1. 投票给最可能被放逐的好人
2. 保护队友，避免投票给队友
3. 必要时分票，避免狼人团队暴露
4. 制造好人之间的矛盾

投票说明：
- 投票不需要公开理由，其他玩家只会看到"X号投票给Y号"
- reason字段是你的内心独白，用于自己分析决策过程
- 请返回JSON格式：{"target": 玩家编号, "reason": "你的内心思考过程"}
`;
}

export function getSeerVoting(playerServer: PlayerServer, context: SeerContext): string {
  const playerId = playerServer.getPlayerId();
  const params = {
    playerId: playerId?.toString() || '0',
    role: playerServer.getRole() || Role.SEER,
    alivePlayers: context.alivePlayers,
    speechSummary: Object.values(context.allSpeeches).flat(),
    currentVotes: [] as any[],
    allVotes: context.allVotes,
    currentRound: context.round,
    checkResults: Object.fromEntries(
      Object.entries(context.investigatedPlayers).map(([round, data]) => [
        data.target.toString(),
        data.isGood ? 'good' as const : 'werewolf' as const
      ])
    )
  };
  const playerList = formatPlayerList(params.alivePlayers);
  const speechSummary = formatSpeechSummary(params.speechSummary);
  const votingHistory = formatVotingHistory(params.allVotes);
  const checkInfo = params.checkResults ? Object.entries(params.checkResults)
    .map(([player, result]) => `- ${player}: ${result === 'good' ? '好人' : '狼人'}`)
    .join('\n') : '暂无查验结果';

  return `你是${params.playerId}号玩家，狼人杀游戏中的预言家角色。当前投票环节：

存活玩家：[${playerList}]
今日发言摘要（白天讨论阶段）：
${speechSummary}

历史投票记录：
${votingHistory}

你的查验结果：
${checkInfo}

作为预言家，你的投票策略：
1. 优先投票给你确认的狼人
2. 保护你确认的好人
3. 引导好人投票正确目标
4. 在身份公开后，发挥领导作用

投票说明：
- 投票不需要公开理由，其他玩家只会看到"X号投票给Y号"
- reason字段是你的内心独白，用于自己分析决策过程
- 请返回JSON格式：{"target": 玩家编号, "reason": "你的内心思考过程"}
`;
}

export function getWitchVoting(playerServer: PlayerServer, context: WitchContext): string {
  const playerId = playerServer.getPlayerId();
  const params = {
    playerId: playerId?.toString() || '0',
    role: playerServer.getRole() || Role.WITCH,
    alivePlayers: context.alivePlayers,
    speechSummary: Object.values(context.allSpeeches).flat(),
    currentVotes: [] as any[],
    allVotes: context.allVotes,
    currentRound: context.round,
    potionUsed: context.potionUsed
  };
  const playerList = formatPlayerList(params.alivePlayers);
  const speechSummary = formatSpeechSummary(params.speechSummary);
  const votingHistory = formatVotingHistory(params.allVotes);
  const potionInfo = params.potionUsed ?
    `解药${params.potionUsed.heal ? '已用' : '可用'}，毒药${params.potionUsed.poison ? '已用' : '可用'}`
    : '解药已用，毒药可用';

  return `你是${params.playerId}号玩家，狼人杀游戏中的女巫角色。当前投票环节：

存活玩家：[${playerList}]
今日发言摘要（白天讨论阶段）：
${speechSummary}

历史投票记录：
${votingHistory}

你的药水使用情况：${potionInfo}

作为女巫，你的投票策略：
1. 分析玩家逻辑，投票给最可疑的玩家
2. 隐藏身份，避免被狼人发现
3. 在必要时可以暗示有重要信息
4. 考虑毒药使用的影响

投票说明：
- 投票不需要公开理由，其他玩家只会看到"X号投票给Y号"
- reason字段是你的内心独白，用于自己分析决策过程
- 请返回JSON格式：{"target": 玩家编号, "reason": "你的内心思考过程"}
`;
}

export function getGuardVoting(playerServer: PlayerServer, context: PlayerContext): string {
  const playerId = playerServer.getPlayerId();
  const params = {
    playerId: playerId?.toString() || '0',
    role: playerServer.getRole() || Role.VILLAGER,
    alivePlayers: context.alivePlayers,
    speechSummary: Object.values(context.allSpeeches).flat(),
    currentVotes: [] as any[],
    allVotes: context.allVotes,
    currentRound: context.round,
    guardHistory: [] as string[]
  };
  const playerList = formatPlayerList(params.alivePlayers);
  const speechSummary = formatSpeechSummary(params.speechSummary);
  const votingHistory = formatVotingHistory(params.allVotes);
  const guardInfo = params.guardHistory?.join('，') || '守护历史';

  return `你是${params.playerId}号玩家，狼人杀游戏中的守卫角色。当前投票环节：

存活玩家：[${playerList}]
今日发言摘要（白天讨论阶段）：
${speechSummary}

历史投票记录：
${votingHistory}

你的守护记录：${guardInfo}

作为守卫，你的投票策略：
1. 分析玩家逻辑，投票给最可疑的玩家
2. 隐藏身份，避免被狼人发现
3. 在必要时可以暗示有保护能力
4. 考虑守护对象的安全

投票说明：
- 投票不需要公开理由，其他玩家只会看到"X号投票给Y号"
- reason字段是你的内心独白，用于自己分析决策过程
- 请返回JSON格式：{"target": 玩家编号, "reason": "你的内心思考过程"}
`;
}

export function getHunterVoting(playerServer: PlayerServer, context: PlayerContext): string {
  const playerId = playerServer.getPlayerId();
  const params = {
    playerId: playerId?.toString() || '0',
    role: playerServer.getRole() || Role.VILLAGER,
    alivePlayers: context.alivePlayers,
    speechSummary: Object.values(context.allSpeeches).flat(),
    currentVotes: [] as any[],
    allVotes: context.allVotes,
    currentRound: context.round
  };
  const playerList = formatPlayerList(params.alivePlayers);
  const speechSummary = formatSpeechSummary(params.speechSummary);
  const votingHistory = formatVotingHistory(params.allVotes);

  return `你是${params.playerId}号玩家，狼人杀游戏中的猎人角色。当前投票环节：

存活玩家：[${playerList}]
今日发言摘要（白天讨论阶段）：
${speechSummary}

历史投票记录：
${votingHistory}

作为猎人，你的投票策略：
1. 分析玩家逻辑，投票给最可疑的玩家
2. 隐藏身份，避免被狼人发现
3. 在必要时可以威胁或暗示身份
4. 考虑开枪技能的威慑作用

投票说明：
- 投票不需要公开理由，其他玩家只会看到"X号投票给Y号"
- reason字段是你的内心独白，用于自己分析决策过程
- 请返回JSON格式：{"target": 玩家编号, "reason": "你的内心思考过程"}
`;
}

// 工厂函数
export function getRoleVoting(playerServer: PlayerServer, context: GameContext): string {
  const role = playerServer.getRole();
  
  if (!role) {
    throw new Error('PlayerServer must have role set');
  }
  
  switch (role) {
    case Role.VILLAGER:
      return getVillagerVoting(playerServer, context as PlayerContext);
    case Role.WEREWOLF:
      return getWerewolfVoting(playerServer, context as PlayerContext);
    case Role.SEER:
      return getSeerVoting(playerServer, context as SeerContext);
    case Role.WITCH:
      return getWitchVoting(playerServer, context as WitchContext);
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}