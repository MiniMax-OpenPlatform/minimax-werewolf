import type { GameContext, PlayerContext, SeerContext, WitchContext } from '@ai-werewolf/types';
import { formatPlayerList, formatHistoryEvents } from '../utils';
import { Role } from '@ai-werewolf/types';
import type { PlayerServer } from '../../PlayerServer';

export function getWerewolfNightAction(playerServer: PlayerServer, context: GameContext): string {
  const playerList = formatPlayerList(context.alivePlayers);
  const historyEvents = formatHistoryEvents(['夜间行动阶段']);
  const teammates = playerServer.getTeammates()?.join('、') || '暂无队友信息';
  
  // 添加游戏进度说明，防止AI幻觉
  const gameProgressInfo = context.round === 1 
    ? `【重要提示】现在是第1轮夜间阶段，游戏刚刚开始：
  - 还没有任何白天发言记录
  - 还没有任何投票记录
  - 没有玩家暴露身份
  - 你的击杀决策应基于随机性或位置策略
  - 不要假设或编造不存在的玩家行为`
    : '';
  
  return `你是${playerServer.getPlayerId()}号玩家，狼人杀游戏中的狼人角色。当前游戏状态：
- 存活玩家: [${playerList}]
- 你的狼人队友ID: [${teammates}]
- 当前轮次: 第${context.round}轮
- 历史事件: ${historyEvents}

${gameProgressInfo}

作为狼人，你需要决定：
- action: 固定为'kill'
- target: 要击杀的目标玩家ID（数字）
- reason: 选择该目标的详细理由

击杀策略建议：
1. 第1轮时基于位置或随机选择目标
2. 后续轮次优先击杀对狼人威胁最大的玩家（如预言家、女巫、守卫）
3. 避免在早期暴露团队
4. 与队友协调选择目标

请分析当前局势并选择最佳击杀目标。`;
}

export function getSeerNightAction(playerServer: PlayerServer, context: SeerContext): string {
  const playerList = formatPlayerList(context.alivePlayers);
  const historyEvents = formatHistoryEvents(['夜间行动阶段']);
  const checkInfo = context.investigatedPlayers ? Object.values(context.investigatedPlayers)
    .map((investigation) => {
      const investigationData = investigation as { target: number; isGood: boolean };
      return `玩家${investigationData.target}是${investigationData.isGood ? '好人' : '狼人'}`;
    })
    .join('，') : '暂无查验结果';
  
  // 添加游戏进度说明，防止AI幻觉
  const gameProgressInfo = context.round === 1 
    ? `【重要提示】现在是第1轮夜间阶段，游戏刚刚开始：
  - 还没有任何白天发言记录
  - 还没有任何投票记录
  - 你只能基于随机性或位置选择查验目标
  - 不要假设或编造不存在的玩家行为`
    : '';
  
  return `你是${playerServer.getPlayerId()}号玩家，狼人杀游戏中的预言家角色。当前游戏状态：
- 存活玩家: [${playerList}]
- 当前轮次: 第${context.round}轮
- 历史事件: ${historyEvents}
- 已查验结果: ${checkInfo}

${gameProgressInfo}

作为预言家，你需要决定：
- action: 固定为'investigate'
- target: 要查验的目标玩家ID（数字，不能是${playerServer.getPlayerId()}）
- reason: 选择该玩家的理由

查验策略建议：
1. 【重要】不能查验自己（${playerServer.getPlayerId()}号玩家）
2. 第1轮时基于位置或随机选择其他玩家
3. 后续轮次优先查验行为可疑的玩家
4. 避免查验已经暴露身份的玩家
5. 考虑查验结果对白天发言的影响

请分析当前局势并选择最佳查验目标。`;
}

export function getWitchNightAction(playerServer: PlayerServer, context: WitchContext): string {
  const playerList = formatPlayerList(context.alivePlayers);
  const historyEvents = formatHistoryEvents(['夜间行动阶段']);
  const potionInfo = context.potionUsed ? 
    `解药${context.potionUsed.heal ? '已用' : '可用'}，毒药${context.potionUsed.poison ? '已用' : '可用'}` 
    : '解药可用，毒药可用';
  
  // 添加游戏进度说明，防止AI幻觉
  const gameProgressInfo = context.round === 1 
    ? `【重要提示】现在是第1轮夜间阶段，游戏刚刚开始：
  - 还没有任何白天发言记录
  - 还没有任何投票记录
  - 你只知道当前存活的玩家和今晚被杀的玩家
  - 请基于当前已知信息做决策，不要假设或编造不存在的信息`
    : '';
  
  return `你是${playerServer.getPlayerId()}号玩家，狼人杀游戏中的女巫角色。当前游戏状态：
- 存活玩家: [${playerList}]
- 当前轮次: 第${context.round}轮
- 今晚被杀玩家ID: ${context.killedTonight || 0} (0表示无人被杀)
- 历史事件: ${historyEvents}

${gameProgressInfo}

你的药水使用情况：
${potionInfo}

作为女巫，你需要决定：
1. 是否使用解药救人（healTarget: 被杀玩家的ID或0表示不救）
2. 是否使用毒药毒人（poisonTarget: 要毒的玩家ID或0表示不毒）
3. action: 'using'（使用任意药水）或'idle'（不使用药水）

注意：
- 如果救人，healTarget设为被杀玩家的ID
- 如果毒人，poisonTarget设为目标玩家的ID
- 如果都不使用，action设为'idle'，两个target都设为0
- 请为每个决定提供详细的理由（healReason和poisonReason）
- 第1轮夜间时，你的决策理由应该基于：被杀玩家的身份、药水的战略价值、随机性等，而不是基于不存在的"白天发言"`;
}

export function getGuardNightAction(playerServer: PlayerServer, context: PlayerContext): string {
  const playerId = playerServer.getPlayerId();
  const params = {
    playerId,
    role: playerServer.getRole(),
    currentRound: context.round,
    alivePlayers: context.alivePlayers,
    historyEvents: [],
    guardHistory: [] as string[]
  };
  const playerList = formatPlayerList(params.alivePlayers);
  const historyEvents = formatHistoryEvents(params.historyEvents);
  const guardInfo = params.guardHistory?.join('，') || '第1夜守护玩家A，第2夜守护玩家B';
  
  return `你是${playerServer.getPlayerId()}号玩家，狼人杀游戏中的守卫角色。当前游戏状态：
- 存活玩家: [${playerList}]
- 当前轮次: 第${context.round}轮
- 历史事件: ${historyEvents}
- 你的守护记录: ${guardInfo}

作为守卫，你的任务是：
1. 选择一名玩家进行守护
2. 保护可能的神职角色
3. 避免连续守护同一玩家

请分析当前局势，特别是：
- 哪些玩家可能是神职角色，需要优先保护？
- 狼人可能会选择击杀谁？
- 如何在白天发言中隐藏身份？`;
}

export function getHunterDeathAction(playerServer: PlayerServer, context: PlayerContext, killedBy: 'werewolf' | 'vote' | 'poison'): string {
  const playerId = playerServer.getPlayerId();
  const params = {
    playerId,
    role: playerServer.getRole(),
    currentRound: context.round,
    alivePlayers: context.alivePlayers,
    historyEvents: [],
    killedBy
  };
  const playerList = formatPlayerList(params.alivePlayers);
  const killedByInfo = params.killedBy === 'werewolf' ? '狼人击杀' : 
                      params.killedBy === 'vote' ? '投票放逐' : '女巫毒杀';
  
  return `你是${playerServer.getPlayerId()}号玩家，狼人杀游戏中的猎人角色。当前游戏状态：
- 存活玩家: [${playerList}]
- 你被${killedByInfo}
- 当前轮次: 第${context.round}轮

作为猎人，你的决策是：
1. 选择一名玩家开枪击杀
2. 优先击杀最可疑的狼人
3. 避免误伤好人
4. 最大化好人阵营收益

请分析当前局势，特别是：
- 哪些玩家最可疑，最可能是狼人？
- 根据之前的发言和行为，谁最值得击杀？
- 如何避免误伤神职角色？`;
}

// 工厂函数 - 统一使用 PlayerServer 和 GameContext
export function getRoleNightAction(playerServer: PlayerServer, context: GameContext): string {
  const role = playerServer.getRole();
  const playerId = playerServer.getPlayerId();
  
  if (!role || playerId === undefined) {
    throw new Error('PlayerServer must have role and playerId set');
  }
  
  switch (role) {
    case Role.VILLAGER:
      throw new Error('Villager has no night action, should be skipped');
    case Role.WEREWOLF: {
      return getWerewolfNightAction(playerServer, context as PlayerContext);
    }
    case Role.SEER: {
      return getSeerNightAction(playerServer, context as SeerContext);
    }
    case Role.WITCH: {
      return getWitchNightAction(playerServer, context as WitchContext);
    }
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}