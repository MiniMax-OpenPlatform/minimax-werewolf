import type { LastWordsParams } from '@ai-werewolf/types';
import { formatPlayerList } from '../utils';


export function getLastWords(params: LastWordsParams): string {
  const playerList = formatPlayerList(params.alivePlayers);
  const killedByInfo = params.killedBy === 'werewolf' ? '狼人击杀' : 
                      params.killedBy === 'vote' ? '投票放逐' : '女巫毒杀';
  const importantInfo = params.importantInfo || '暂无特殊信息';
  
  return `你是${params.playerId}号玩家，狼人杀游戏中的${params.role}角色，你已被${killedByInfo}。当前游戏状态：
- 存活玩家: [${playerList}]
- 放逐原因: ${killedByInfo}
- 重要信息: ${importantInfo}

作为被${killedByInfo}的${params.role}，你需要发表遗言：
1. 可以留下对游戏的最后分析
2. 可以暗示自己的身份（如果是神职）
3. 可以指认你认为的狼人
4. 可以给好人阵营提供建议

`;
}



