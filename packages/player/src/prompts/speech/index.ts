import type { PlayerContext, SeerContext, WitchContext, GameContext } from '@ai-werewolf/types';
import { Role } from '@ai-werewolf/types';
import { formatPlayerList, formatSpeechHistory } from '../utils';
import type { PlayerServer } from '../../PlayerServer';

// 通用的 JSON 格式说明函数
function getSpeechFormatInstruction(role: Role): string {
  let roleSpecificTip = '';
  
  switch (role) {
    case Role.VILLAGER:
      roleSpecificTip = '要符合村民身份，分析逻辑，不要暴露太多信息。';
      break;
    case Role.WEREWOLF:
      roleSpecificTip = '要伪装成好人，避免暴露狼人身份，可以适当误导其他玩家。';
      break;
    case Role.SEER:
      roleSpecificTip = '要合理传达查验信息，但要避免过早暴露身份被狼人针对。';
      break;
    case Role.WITCH:
      roleSpecificTip = '要隐藏女巫身份，可以暗示重要信息但不要直接暴露。';
      break;
    default:
      roleSpecificTip = '要符合你的角色身份。';
  }
  
  return `
请返回JSON格式，包含以下字段：
- speech: 你的发言内容（30-80字的自然对话，其他玩家都能听到）

注意：speech字段是你的公开发言，${roleSpecificTip}`;
}

export function getVillagerSpeech(playerServer: PlayerServer, context: PlayerContext): string {
  const playerId = playerServer.getPlayerId();
  if (playerId === undefined) {
    throw new Error('PlayerServer must have playerId set');
  }
  const personalityPrompt = playerServer.getPersonalityPrompt();
  const params = {
    playerId: playerId.toString(),
    playerName: `Player${playerId}`,
    role: 'villager',
    speechHistory: Object.values(context.allSpeeches).flat(),
    customContent: personalityPrompt,
    suspiciousPlayers: [] as string[],
    logicalContradictions: ''
  };
  const playerList = formatPlayerList(context.alivePlayers);
  const speechSummary = formatSpeechHistory(params.speechHistory);
  const suspiciousInfo = params.suspiciousPlayers?.join('、') || '暂无明确可疑目标';
  
  const customContent = params.customContent || '';
  
  return `你是${params.playerId}号玩家，狼人杀游戏中的村民角色，性格特点：正直、逻辑清晰。当前游戏状态：
- 存活玩家: [${playerList}]
- 当前发言轮次: 第${context.round}轮
- 历史发言摘要: ${speechSummary}

${customContent}

作为村民，你的发言策略：
1. 分析玩家发言逻辑，指出矛盾点
2. 独立思考，不盲从他人
3. 保护可能的神职角色

当前局势分析：
- 可疑玩家: ${suspiciousInfo}
- 逻辑矛盾点: ${params.logicalContradictions || '暂无明显矛盾'}
${getSpeechFormatInstruction(Role.VILLAGER)}`;
}

export function getWerewolfSpeech(playerServer: PlayerServer, context: PlayerContext): string {
  const playerId = playerServer.getPlayerId();
  if (playerId === undefined) {
    throw new Error('PlayerServer must have playerId set');
  }
  const teammateIds = playerServer.getTeammates();
  const personalityPrompt = playerServer.getPersonalityPrompt();
  const params = {
    playerId: playerId.toString(),
    playerName: `Player${playerId}`,
    role: 'werewolf',
    speechHistory: Object.values(context.allSpeeches).flat(),
    teammates: teammateIds?.map(id => id.toString()),
    customContent: personalityPrompt,
    suspiciousPlayers: [] as string[],
    killedLastNight: 'unknown'
  };
  const playerList = formatPlayerList(context.alivePlayers);
  const speechSummary = formatSpeechHistory(params.speechHistory);
  const teammateList = params.teammates?.join('、') || '暂无队友信息';
  const killedInfo = params.killedLastNight || '无人被杀';
  
  const customContent = params.customContent || '';
  
  return `你是${params.playerId}号玩家，狼人杀游戏中的狼人角色，性格特点：狡猾、善于伪装。当前游戏状态：
- 存活玩家: [${playerList}]
- 当前发言轮次: 第${context.round}轮
- 历史发言摘要: ${speechSummary}
- 你的狼人队友: [${teammateList}]

${customContent}

作为狼人，你的发言策略：
1. 伪装成好人，避免暴露
2. 引导好人投票错误目标
3. 保护队友，必要时为队友辩护
4. 制造混乱，转移注意力
5. 考虑自爆策略（如必要）

当前局势分析：
- 今晚被杀的玩家: ${killedInfo}
- 当前投票情况: ${speechSummary}
- 需要重点关注的玩家: ${params.suspiciousPlayers?.join('、') || '暂无'}
${getSpeechFormatInstruction(Role.WEREWOLF)}`;
}

export function getSeerSpeech(playerServer: PlayerServer, context: SeerContext): string {
  const playerId = playerServer.getPlayerId();
  if (playerId === undefined) {
    throw new Error('PlayerServer must have playerId set');
  }
  const personalityPrompt = playerServer.getPersonalityPrompt();
  const params = {
    playerId: playerId.toString(),
    playerName: `Player${playerId}`,
    role: 'seer',
    speechHistory: Object.values(context.allSpeeches).flat(),
    customContent: personalityPrompt,
    suspiciousPlayers: [] as string[]
  };
  const playerList = formatPlayerList(context.alivePlayers);
  const speechSummary = formatSpeechHistory(params.speechHistory);
  
  // 处理查验结果
  let checkInfo = '暂无查验结果';
  if (context.investigatedPlayers && Object.keys(context.investigatedPlayers).length > 0) {
    const results: string[] = [];
    for (const investigation of Object.values(context.investigatedPlayers)) {
      const investigationData = investigation as { target: number; isGood: boolean };
      results.push(`${investigationData.target}号是${investigationData.isGood ? '好人' : '狼人'}`);
    }
    checkInfo = results.join('，');
  }
  
  const customContent = params.customContent || '';
  
  return `你是${params.playerId}号玩家，狼人杀游戏中的预言家角色，性格特点：理性、分析能力强。当前游戏状态：
- 存活玩家: [${playerList}]
- 当前发言轮次: 第${context.round}轮
- 历史发言摘要: ${speechSummary}
- 你的查验结果: ${checkInfo}

${customContent}

作为预言家，你的发言策略：
1. 在适当时机公布身份（通常在确认2只狼人后）
2. 清晰传达查验信息
3. 分析玩家行为逻辑，指出可疑点
4. 避免过早暴露导致被狼人针对

当前局势分析：
- 可疑玩家: ${params.suspiciousPlayers?.join('、') || '根据查验结果确定'}
- 需要保护的玩家: 暂无
${getSpeechFormatInstruction(Role.SEER)}`;
}

export function getWitchSpeech(playerServer: PlayerServer, context: WitchContext): string {
  const playerId = playerServer.getPlayerId();
  if (playerId === undefined) {
    throw new Error('PlayerServer must have playerId set');
  }
  const personalityPrompt = playerServer.getPersonalityPrompt();
  const params = {
    playerId: playerId.toString(),
    playerName: `Player${playerId}`,
    role: 'witch',
    speechHistory: Object.values(context.allSpeeches).flat(),
    customContent: personalityPrompt,
    suspiciousPlayers: [] as string[]
  };
  const playerList = formatPlayerList(context.alivePlayers);
  const speechSummary = formatSpeechHistory(params.speechHistory);
  const potionInfo = context.potionUsed ? 
    `解药${context.potionUsed.heal ? '已用' : '可用'}，毒药${context.potionUsed.poison ? '已用' : '可用'}` 
    : '解药可用，毒药可用';
  const killedInfo = context.killedTonight ? `${context.killedTonight}号` : '无人被杀';
  
  const customContent = params.customContent || '';
  
  return `你是${params.playerId}号玩家，狼人杀游戏中的女巫角色，性格特点：谨慎、观察力强。当前游戏状态：
- 存活玩家: [${playerList}]
- 当前发言轮次: 第${context.round}轮
- 历史发言摘要: ${speechSummary}
- 你的药水使用情况: ${potionInfo}

${customContent}

作为女巫，你的发言策略：
1. 隐藏身份，避免被狼人发现
2. 暗示自己有重要信息，但不要直接暴露
3. 引导好人投票正确目标
4. 在必要时可以半报身份

当前局势分析：
- 今晚被杀的玩家: ${killedInfo}（你${context.potionUsed?.heal ? '已救' : '未救'}）
- 是否使用毒药: ${context.potionUsed?.poison ? '已使用' : '未使用'}
- 可疑玩家: ${params.suspiciousPlayers?.join('、') || '暂无明确目标'}
${getSpeechFormatInstruction(Role.WITCH)}`;
}


// 工厂函数
export function getRoleSpeech(playerServer: PlayerServer, context: GameContext): string {
  const role = playerServer.getRole();
  
  if (!role) {
    throw new Error('PlayerServer must have role set');
  }
  
  switch (role) {
    case Role.VILLAGER:
      return getVillagerSpeech(playerServer, context as PlayerContext);
    case Role.WEREWOLF:
      return getWerewolfSpeech(playerServer, context as PlayerContext);
    case Role.SEER:
      return getSeerSpeech(playerServer, context as SeerContext);
    case Role.WITCH:
      return getWitchSpeech(playerServer, context as WitchContext);
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}