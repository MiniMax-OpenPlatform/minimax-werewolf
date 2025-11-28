import { DEFAULT_GAME_RULES, type GameRules } from './rules';

/**
 * 生成游戏规则的文本描述
 * 用于LLM的system message
 */
export function generateGameRulesText(rules: GameRules = DEFAULT_GAME_RULES): string {
  return `# 狼人杀游戏规则

## 游戏目标
- 好人阵营：${rules.winConditions.villagersWin}
- 狼人阵营：${rules.winConditions.werewolvesWin}

## 角色说明

### 狼人（WEREWOLF）
- 阵营：狼人阵营
- 能力：每晚可以击杀一名玩家
- 特点：知道所有狼人队友的身份
- 本局配置：${rules.roles.werewolf}名狼人

### 预言家（SEER）
- 阵营：好人阵营
- 能力：每晚可以查验一名玩家的身份（好人或狼人）
- 特点：拥有信息优势，但需要谨慎公布身份避免被狼人针对
- 本局配置：${rules.roles.seer}名预言家

### 女巫（WITCH）
- 阵营：好人阵营
- 能力：拥有两瓶药水
  - 解药：可以救活当晚被狼人击杀的玩家（全局只能使用1次）
  - 毒药：可以毒死任意一名玩家（全局只能使用1次）
- 特点：知道每晚被狼人击杀的玩家
- 特殊规则：${rules.specialRules.witchFirstNightSelfSave ? '首夜可以自救' : '首夜不能自救'}
- 本局配置：${rules.roles.witch}名女巫

### 村民（VILLAGER）
- 阵营：好人阵营
- 能力：无特殊能力
- 特点：需要通过发言分析和逻辑推理找出狼人
- 本局配置：${rules.roles.villager}名村民

## 游戏流程

### 夜间阶段
夜间行动顺序：
${rules.gameFlow.nightOrder.map((role, index) => {
  const roleNames: Record<string, string> = {
    werewolf: '狼人',
    seer: '预言家',
    witch: '女巫'
  };
  return `${index + 1}. ${roleNames[role] || role}行动`;
}).join('\n')}

### 白天阶段
1. 公布昨晚死亡信息${rules.specialRules.revealRoleOnDeath ? '（公开角色）' : '（不公开角色）'}
2. ${rules.gameFlow.dayDiscussion ? '玩家依次发言讨论' : '跳过讨论阶段'}
3. ${rules.gameFlow.votingEnabled ? '投票放逐：所有玩家投票选择要放逐的玩家' : '不进行投票'}
4. 被放逐玩家出局

## 特殊规则
- 女巫首夜自救：${rules.specialRules.witchFirstNightSelfSave ? '允许' : '不允许'}
- 平票处理：${rules.specialRules.tieVoteNoElimination ? '无人出局' : '重新投票'}
- 死亡玩家：${rules.specialRules.deadPlayersSilent ? '禁止发言' : '可以发言'}
- 身份公开：${rules.specialRules.revealRoleOnDeath ? '死亡时公开身份' : '死亡时不公开身份'}

## JSON响应格式要求

### 发言（Speech）
返回JSON对象，包含字段：
- speech: 你的发言内容（30-80字的自然对话）

### 投票（Voting）
返回JSON对象，包含字段：
- target: 你要投票的玩家编号（数字）
- reason: 你投票的详细理由

### 夜间行动（Night Action）
根据角色不同，返回不同的JSON对象：
- 狼人：{action: "kill", target: 编号, reason: 理由}
- 预言家：{action: "investigate", target: 编号, reason: 理由}
- 女巫：{action: "using"或"idle", healTarget: 编号, healReason: 理由, poisonTarget: 编号, poisonReason: 理由}

## 重要提示
- 所有响应必须是有效的JSON格式
- 不要在JSON之外添加任何说明文字
- 根据你的角色和阵营做出决策
- 白天发言时要隐藏自己的真实身份（除非你是预言家且决定跳出）`;
}

/**
 * 默认游戏规则文本（基于DEFAULT_GAME_RULES生成）
 */
export const GAME_RULES_TEXT = generateGameRulesText(DEFAULT_GAME_RULES);
