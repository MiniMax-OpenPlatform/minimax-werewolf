# AI狼人杀 - LLM Prompt 拼接逻辑完整文档

## 概览

本文档详细说明了所有角色（VILLAGER、WEREWOLF、SEER、WITCH）在所有游戏环节（发言、投票、夜间行动）的Prompt构建逻辑。

## 核心拼接流程

### 入口文件：`PlayerServer.ts`

所有LLM请求都通过 `generateWithLangfuse<T>()` 方法统一处理：

```typescript
// 第171-259行：核心生成方法
private async generateWithLangfuse<T>(params: {
  functionId: string;
  schema: any;  // Zod schema for validation
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  context?: PlayerContext;
}): Promise<T>
```

**Prompt 后缀固定添加**：
```typescript
prompt: prompt + '\n\n请直接返回JSON格式的结果，不要包含其他说明文字。'
```

**温度参数**：
```typescript
temperature: temperature ?? this.config.ai.temperature  // 当前配置为1.0
```

---

## 一、发言环节 (Speech Generation)

### 调用路径

```
PlayerServer.speak()
  → generateSpeech()
  → buildSpeechPrompt()
  → WerewolfPrompts.getSpeech()
  → getRoleSpeech()
```

### 通用构建逻辑 (`buildSpeechPrompt` - 第305-321行)

```typescript
private buildSpeechPrompt(context: PlayerContext): string {
  const speechPrompt = WerewolfPrompts.getSpeech(this, context);

  // 1. 添加玩家内心独白历史
  let thinkingContext = '';
  if (this.thinkingHistory.length > 0) {
    thinkingContext = '\n\n## 你之前的内心独白（只有你自己知道）：\n';
    this.thinkingHistory.forEach((thinking, index) => {
      thinkingContext += `第${index + 1}次：${thinking}\n`;
    });
  }

  // 2. 添加发言长度要求
  return speechPrompt + thinkingContext +
    '\n\n注意：发言内容控制在30-80字，语言自然，像真人玩家。';
}
```

### 1.1 村民 (VILLAGER) 发言

**文件**：`prompts/speech/index.ts` 第34-71行

**Prompt结构**：
```
你是{playerId}号玩家，狼人杀游戏中的村民角色。当前游戏状态：
- 存活玩家: [{playerList}]
- 当前发言轮次: 第{round}轮
- 历史发言摘要: {speechSummary}

{性格描述 - 来自config.yaml}

作为村民，你的发言策略：
1. 分析玩家发言逻辑，指出矛盾点
2. 独立思考，不盲从他人
3. 保护可能的神职角色

当前局势分析：
- 可疑玩家: {suspiciousInfo}
- 逻辑矛盾点: {logicalContradictions}

请返回JSON格式，包含以下字段：
- speech: 你的发言内容（30-80字的自然对话，其他玩家都能听到）

注意：speech字段是你的公开发言，要符合村民身份，分析逻辑，不要暴露太多信息。

## 你之前的内心独白（只有你自己知道）：
第1次：{thinking1}
第2次：{thinking2}
...

注意：发言内容控制在30-80字，语言自然，像真人玩家。

请直接返回JSON格式的结果，不要包含其他说明文字。
```

### 1.2 狼人 (WEREWOLF) 发言

**文件**：`prompts/speech/index.ts` 第73-122行

**Prompt结构**：
```
你是{playerId}号玩家，狼人杀游戏中的狼人角色。当前游戏状态：
- 存活玩家: [{playerList}]
- 当前发言轮次: 第{round}轮
- 历史发言摘要: {speechSummary}
- 本局游戏狼人ID: [{teammateList}]

{性格描述}

作为狼人，你的发言策略：
1. 伪装成好人，避免暴露
2. 引导好人投票错误目标
3. 保护队友，必要时为队友辩护
4. 制造混乱，转移注意力
5. 考虑自爆策略（如必要）

当前局势分析：
- 昨晚狼人试图杀害的玩家: {killedInfo}
- 需要重点关注的玩家: {suspiciousPlayers}

## 你之前的内心独白（只有你自己知道）：
第1次：{thinking1}
第2次：{thinking2}
...

请返回JSON格式，包含以下字段：
- speech: 你的发言内容（30-80字的自然对话，其他玩家都能听到）

请直接返回JSON格式的结果，不要包含其他说明文字。
```

**特殊信息**：
- `lastKillTarget`: 上一轮狼人击杀的目标
- `teammates`: 狼人队友ID列表

### 1.3 预言家 (SEER) 发言

**文件**：`prompts/speech/index.ts` 第124-172行

**Prompt结构**：
```
你是{playerId}号玩家，狼人杀游戏中的预言家角色。当前游戏状态：
- 存活玩家: [{playerList}]
- 当前发言轮次: 第{round}轮
- 历史发言摘要: {speechSummary}
- 你的查验结果: {checkInfo}

{性格描述}

作为预言家，你的发言策略：
1. 在适当时机公布身份（通常在确认2只狼人后）
2. 清晰传达查验信息
3. 分析玩家行为逻辑，指出可疑点
4. 避免过早暴露导致被狼人针对

当前局势分析：
- 可疑玩家: {suspiciousPlayers}
- 需要保护的玩家: 暂无

## 你之前的内心独白（只有你自己知道）：
第1次：{thinking1}
第2次：{thinking2}
...

请返回JSON格式，包含以下字段：
- speech: 你的发言内容（30-80字的自然对话，其他玩家都能听到）

请直接返回JSON格式的结果，不要包含其他说明文字。
```

**特殊信息**：
- `investigatedPlayers`: 查验结果 `{target: number, isGood: boolean}`
- 格式化为: "1号是好人，3号是狼人"

### 1.4 女巫 (WITCH) 发言

**文件**：`prompts/speech/index.ts` 第174-216行

**Prompt结构**：
```
你是{playerId}号玩家，狼人杀游戏中的女巫角色。当前游戏状态：
- 存活玩家: [{playerList}]
- 当前发言轮次: 第{round}轮
- 历史发言摘要: {speechSummary}
- 你的药水使用情况: {potionInfo}

{性格描述}

作为女巫，你的发言策略：
1. 隐藏身份，避免被狼人发现
2. 暗示自己有重要信息，但不要直接暴露
3. 引导好人投票正确目标
4. 在必要时可以半报身份

当前局势分析：
- 今晚被杀的玩家: {killedInfo}（你{已救/未救}）
- 是否使用毒药: {已使用/未使用}
- 可疑玩家: {suspiciousPlayers}

## 你之前的内心独白（只有你自己知道）：
第1次：{thinking1}
第2次：{thinking2}
...

请返回JSON格式，包含以下字段：
- speech: 你的发言内容（30-80字的自然对话，其他玩家都能听到）

请直接返回JSON格式的结果，不要包含其他说明文字。
```

**特殊信息**：
- `potionUsed`: `{heal: boolean, poison: boolean}`
- `killedTonight`: 被杀玩家ID

---

## 二、投票环节 (Voting)

### 调用路径

```
PlayerServer.vote()
  → generateVote()
  → buildVotePrompt()
  → WerewolfPrompts.getVoting()
  → getRoleVoting()
```

### 通用构建逻辑 (`buildVotePrompt` - 第323-358行)

```typescript
private buildVotePrompt(context: PlayerContext): string {
  // 1. 添加性格描述
  const personalityPrompt = this.buildPersonalityPrompt();

  // 2. 为预言家添加查验结果
  const additionalParams = { teammates: this.teammates };
  if (this.role === Role.SEER && 'investigatedPlayers' in context) {
    const checkResults = {};
    for (const investigation of Object.values(context.investigatedPlayers)) {
      checkResults[investigation.target.toString()] =
        investigation.isGood ? 'good' : 'werewolf';
    }
    additionalParams.checkResults = checkResults;
  }

  // 3. 获取投票prompt
  const votingPrompt = WerewolfPrompts.getVoting(this, context);

  // 4. 添加内心独白历史
  let thinkingContext = '';
  if (this.thinkingHistory.length > 0) {
    thinkingContext = '\n\n## 你之前的内心独白（只有你自己知道）：\n';
    this.thinkingHistory.forEach((thinking, index) => {
      thinkingContext += `第${index + 1}次：${thinking}\n`;
    });
  }

  return personalityPrompt + votingPrompt + thinkingContext;
}
```

### 2.1 村民 (VILLAGER) 投票

**文件**：`prompts/voting/index.ts` 第33-65行

**Prompt结构**：
```
{性格描述 - aggressive/conservative/cunning}

你是{playerId}号玩家，狼人杀游戏中的村民角色。当前投票环节：

存活玩家：[{playerList}]
今日发言摘要：
{speechSummary}
当前投票情况：{currentVotes}

作为村民，你的投票策略：
1. 优先投票给发言逻辑矛盾、行为可疑的玩家
2. 避免盲从，独立分析
3. 注意保护可能的神职角色

请返回你的投票决定，格式要求：
- target: 你要投票的玩家ID（数字）
- reason: 你投票的详细理由

{内心独白历史}
{JSON格式要求}
```

### 2.2 狼人 (WEREWOLF) 投票

**文件**：`prompts/voting/index.ts` 第67-104行

**Prompt结构**：
```
{性格描述}

你是{playerId}号玩家，狼人杀游戏中的狼人角色。当前投票环节：

存活玩家：[{playerList}]
本局游戏狼人ID：{teammates}
今日发言摘要：
{speechSummary}
当前投票情况：{currentVotes}

作为狼人，你的投票策略：
1. 投票给最可能被放逐的好人
2. 保护队友，避免投票给队友
3. 必要时分票，避免狼人团队暴露
4. 制造好人之间的矛盾

请返回你的投票决定，格式要求：
- target: 你要投票的玩家ID（数字）
- reason: 你投票的详细理由

{内心独白历史}
{JSON格式要求}
```

### 2.3 预言家 (SEER) 投票

**文件**：`prompts/voting/index.ts` 第106-151行

**Prompt结构**：
```
{性格描述}

你是{playerId}号玩家，狼人杀游戏中的预言家角色。当前投票环节：

存活玩家：[{playerList}]
今日发言摘要：
{speechSummary}
当前投票情况：{currentVotes}

你的查验结果：
- {player1}: 好人
- {player2}: 狼人
...

作为预言家，你的投票策略：
1. 优先投票给你确认的狼人
2. 保护你确认的好人
3. 引导好人投票正确目标
4. 在身份公开后，发挥领导作用

请返回你的投票决定，格式要求：
- target: 你要投票的玩家ID（数字）
- reason: 你投票的详细理由

{内心独白历史}
{JSON格式要求}
```

**特殊处理**：
- 第331-341行在 `buildVotePrompt` 中为预言家添加 `checkResults`

### 2.4 女巫 (WITCH) 投票

**文件**：`prompts/voting/index.ts` 第153-191行

**Prompt结构**：
```
{性格描述}

你是{playerId}号玩家，狼人杀游戏中的女巫角色。当前投票环节：

存活玩家：[{playerList}]
今日发言摘要：
{speechSummary}
当前投票情况：{currentVotes}
你的药水使用情况：{potionInfo}

作为女巫，你的投票策略：
1. 分析玩家逻辑，投票给最可疑的玩家
2. 隐藏身份，避免被狼人发现
3. 在必要时可以暗示有重要信息
4. 考虑毒药使用的影响

请返回你的投票决定，格式要求：
- target: 你要投票的玩家ID（数字）
- reason: 你投票的详细理由

{内心独白历史}
{JSON格式要求}
```

---

## 三、夜间行动环节 (Night Action)

### 调用路径

```
PlayerServer.useAbility()
  → generateAbilityUse()
  → buildAbilityPrompt()
  → WerewolfPrompts.getNightAction()
  → getRoleNightAction()
```

### 通用构建逻辑 (`buildAbilityPrompt` - 第360-373行)

```typescript
private buildAbilityPrompt(context: PlayerContext | WitchContext | SeerContext): string {
  const nightPrompt = WerewolfPrompts.getNightAction(this, context);

  // 添加玩家自己的内心独白历史
  let thinkingContext = '';
  if (this.thinkingHistory.length > 0) {
    thinkingContext = '\n\n## 你之前的内心独白（只有你自己知道）：\n';
    this.thinkingHistory.forEach((thinking, index) => {
      thinkingContext += `第${index + 1}次：${thinking}\n`;
    });
  }

  return nightPrompt + thinkingContext;
}
```

### 3.1 狼人 (WEREWOLF) 夜间行动

**文件**：`prompts/night/index.ts` 第6-41行

**Prompt结构**：
```
你是{playerId}号玩家，狼人杀游戏中的狼人角色。当前游戏状态：
- 存活玩家: [{playerList}]
- 本局游戏狼人ID: [{teammates}]
- 当前轮次: 第{round}轮
- 历史事件: {historyEvents}
- 历史发言摘要: {speechSummary}

{第1轮特殊提示（防止AI幻觉）}:
【重要提示】现在是第1轮夜间阶段，游戏刚刚开始：
  - 还没有任何白天发言记录
  - 还没有任何投票记录
  - 没有玩家暴露身份
  - 你的击杀决策应基于随机性或位置策略
  - 不要假设或编造不存在的玩家行为

作为狼人，你需要决定：
- action: 固定为'kill'
- target: 要击杀的目标玩家ID（数字）
- reason: 选择该目标的详细理由

击杀策略建议：
1. 第1轮时基于位置或随机选择目标
2. 后续轮次优先击杀对狼人威胁最大的玩家（如预言家、女巫、守卫）
3. 避免在早期暴露团队
4. 与队友协调选择目标

请分析当前局势并选择最佳击杀目标。

{内心独白历史}
{JSON格式要求}
```

**Schema**：`WerewolfNightActionSchema`
```typescript
{
  action: 'kill',
  target: number,
  reason: string
}
```

### 3.2 预言家 (SEER) 夜间行动

**文件**：`prompts/night/index.ts` 第43-83行

**Prompt结构**：
```
你是{playerId}号玩家，狼人杀游戏中的预言家角色。当前游戏状态：
- 存活玩家: [{playerList}]
- 当前轮次: 第{round}轮
- 历史事件: {historyEvents}
- 历史发言摘要: {speechSummary}
- 已查验结果: {checkInfo}

{第1轮特殊提示}:
【重要提示】现在是第1轮夜间阶段，游戏刚刚开始：
  - 还没有任何白天发言记录
  - 还没有任何投票记录
  - 你只能基于随机性或位置选择查验目标
  - 不要假设或编造不存在的玩家行为

作为预言家，你需要决定：
- action: 固定为'investigate'
- target: 要查验的目标玩家ID（数字，不能是{playerId}）
- reason: 选择该玩家的理由

查验策略建议：
1. 【重要】不能查验自己（{playerId}号玩家）
2. 第1轮时基于位置或随机选择其他玩家
3. 后续轮次优先查验行为可疑的玩家
4. 避免查验已经暴露身份的玩家
5. 考虑查验结果对白天发言的影响

请分析当前局势并选择最佳查验目标。

{内心独白历史}
{JSON格式要求}
```

**Schema**：`SeerNightActionSchema`
```typescript
{
  action: 'investigate',
  target: number,
  reason: string
}
```

### 3.3 女巫 (WITCH) 夜间行动

**文件**：`prompts/night/index.ts` 第85-123行

**Prompt结构**：
```
你是{playerId}号玩家，狼人杀游戏中的女巫角色。当前游戏状态：
- 存活玩家: [{playerList}]
- 当前轮次: 第{round}轮
- 今晚被杀玩家ID: {killedTonight} (0表示无人被杀)
- 历史事件: {historyEvents}
- 历史发言摘要: {speechSummary}

{第1轮特殊提示}:
【重要提示】现在是第1轮夜间阶段，游戏刚刚开始：
  - 还没有任何白天发言记录
  - 还没有任何投票记录
  - 你只知道当前存活的玩家和今晚被杀的玩家
  - 请基于当前已知信息做决策，不要假设或编造不存在的信息

你的药水使用情况：
{potionInfo}

作为女巫，你需要决定：
1. 是否使用解药救人（healTarget: 被杀玩家的ID或0表示不救）
2. 是否使用毒药毒人（poisonTarget: 要毒的玩家ID或0表示不毒）
3. action: 'using'（使用任意药水）或'idle'（不使用药水）

注意：
- 如果救人，healTarget设为被杀玩家的ID
- 如果毒人，poisonTarget设为目标玩家的ID
- 如果都不使用，action设为'idle'，两个target都设为0
- 请为每个决定提供详细的理由（healReason和poisonReason）
- 第1轮夜间时，你的决策理由应该基于：被杀玩家的身份、药水的战略价值、随机性等，而不是基于不存在的"白天发言"

{内心独白历史}
{JSON格式要求}
```

**Schema**：`WitchNightActionSchema`
```typescript
{
  action: 'using' | 'idle',
  healTarget: number,
  healReason: string,
  poisonTarget: number,
  poisonReason: string
}
```

---

## 四、性格系统 (Personality)

**文件**：`prompts/personality/index.ts`

性格通过 `buildPersonalityPrompt()` (第415-423行) 添加到投票prompt前缀：

```typescript
private buildPersonalityPrompt(): string {
  if (!this.config.game.strategy) return '';

  // balanced → cunning
  const personalityType = this.config.game.strategy === 'balanced'
    ? 'cunning'
    : this.config.game.strategy as PersonalityType;

  return WerewolfPrompts.getPersonality(personalityType) + '\n\n';
}
```

### 4.1 激进型 (Aggressive)

```
## 性格特点
性格：激进、好斗、喜欢主导局面
行为特点：主动发起攻击，敢于冒险，善于制造混乱
弱点：容易暴露，缺乏耐心
角色扮演要求：

- 所有发言和决策都应符合你的性格特点
- 在游戏中保持角色一致性
- 根据性格特点调整策略（如更主动发起攻击）
- 在发言中体现性格特点（如直接、强势）
```

### 4.2 保守型 (Conservative)

```
## 性格特点
性格：保守、谨慎、避免风险
行为特点：观察仔细，不轻易表态，喜欢隐藏自己
弱点：过于被动，可能错失机会
角色扮演要求：

- 所有发言和决策都应符合你的性格特点
- 在游戏中保持角色一致性
- 根据性格特点调整策略（如更谨慎行动）
- 在发言中体现性格特点（如谨慎、含蓄）
```

### 4.3 狡猾型 (Cunning)

```
## 性格特点
性格：狡猾、善于伪装、精于算计
行为特点：隐藏真实意图，误导他人，长期布局
弱点：过于复杂可能导致逻辑漏洞
角色扮演要求：

- 所有发言和决策都应符合你的性格特点
- 在游戏中保持角色一致性
- 根据性格特点调整策略（如更善于伪装）
- 在发言中体现性格特点（如模棱两可、误导性）
```

---

## 五、内心独白系统 (Thinking History)

### 机制说明

**存储**：`PlayerServer.thinkingHistory: string[]` (第45行)

**重置时机**：每场游戏开始时清空 (第56行)
```typescript
async startGame(params: StartGameParams): Promise<void> {
  this.thinkingHistory = [];  // 防止角色污染
}
```

**添加时机**：每次LLM响应后提取 `<think>...</think>` 标签内容 (第244-247行)
```typescript
if (thinking) {
  (validated as any).thinking = thinking;
  this.thinkingHistory.push(thinking);
  console.log(`💭 内心独白已保存 (历史记录数: ${this.thinkingHistory.length})`);
}
```

**使用时机**：所有环节的prompt都会附加历史记录

**格式**：
```
## 你之前的内心独白（只有你自己知道）：
第1次：{thinking1}
第2次：{thinking2}
第3次：{thinking3}
...
```

---

## 六、Schema验证

### Zod Schema 映射

**文件**：`PlayerServer.ts` 第32-37行

```typescript
const ROLE_SCHEMA_MAP = {
  [Role.WEREWOLF]: WerewolfNightActionSchema,
  [Role.SEER]: SeerNightActionSchema,
  [Role.WITCH]: WitchNightActionSchema,
} as const;
```

### 各环节Schema

| 环节 | Schema | 字段 |
|------|--------|------|
| 发言 | `SpeechResponseSchema` | `{speech: string, thinking?: string}` |
| 投票 | `VotingResponseSchema` | `{target: number, reason: string}` |
| 狼人夜间 | `WerewolfNightActionSchema` | `{action: 'kill', target: number, reason: string}` |
| 预言家夜间 | `SeerNightActionSchema` | `{action: 'investigate', target: number, reason: string}` |
| 女巫夜间 | `WitchNightActionSchema` | `{action: 'using'\|'idle', healTarget: number, healReason: string, poisonTarget: number, poisonReason: string}` |

---

## 七、辅助工具函数

**文件**：`prompts/utils.ts`

```typescript
// 格式化玩家列表
export function formatPlayerList(players: any[]): string {
  return players.map(p => p.name || p.id || p).join(', ');
}

// 格式化发言历史
export function formatSpeechHistory(speeches: any[]): string {
  return speeches.map(s => `${s.playerId}号: "${s.content}"`).join('\n');
}

// 格式化历史事件
export function formatHistoryEvents(events: string[]): string {
  return events.join('，') || '暂无';
}
```

---

## 八、特殊处理与防护

### 8.1 第一轮夜间行动防护

为防止AI在第1轮夜间编造不存在的信息，所有夜间行动prompt都包含：

```typescript
const gameProgressInfo = context.round === 1
  ? `【重要提示】现在是第1轮夜间阶段，游戏刚刚开始：
  - 还没有任何白天发言记录
  - 还没有任何投票记录
  - {角色特定说明}
  - 不要假设或编造不存在的玩家行为`
  : '';
```

### 8.2 JSON提取与清理

**文件**：`PlayerServer.ts` 第139-168行

```typescript
private extractJSON(text: string): { json: string; thinking?: string } {
  // 1. 提取<think>...</think>标签
  let thinking: string | undefined;
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    thinking = thinkMatch[1].trim();
  }

  // 2. 移除<think>标签及其内容
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');

  // 3. 移除markdown代码块
  cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // 4. 提取JSON对象
  if (cleaned.includes('{')) {
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
  }

  return { json: cleaned, thinking };
}
```

### 8.3 Trace ID追踪

**文件**：`PlayerServer.ts` 第202-229行

```typescript
// 从多个来源提取trace_id
let traceId: string | undefined;

// 1. 从provider metadata获取
if ((result as any).experimental_providerMetadata) {
  const metadata = (result as any).experimental_providerMetadata;
  traceId = metadata?.traceId || metadata?.requestId || metadata?.['trace-id'];
}

// 2. 从response headers获取
if (!traceId && (result as any).response?.headers) {
  const headers = (result as any).response.headers;
  traceId = headers?.get?.('trace-id') || headers?.get?.('x-trace-id');
}

// 3. 生成fallback trace_id
if (!traceId) {
  traceId = `${functionId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
```

---

## 九、完整示例

### 示例：狼人在第2轮白天发言

**最终拼接的Prompt**：

```
你是2号玩家，狼人杀游戏中的狼人角色。当前游戏状态：
- 存活玩家: [1, 2, 3, 4, 5]
- 当前发言轮次: 第2轮
- 历史发言摘要: 1号: "我认为3号比较可疑"
3号: "我是好人"
- 本局游戏狼人ID: [4]

## 性格特点
性格：激进、好斗、喜欢主导局面
行为特点：主动发起攻击，敢于冒险，善于制造混乱
弱点：容易暴露，缺乏耐心
角色扮演要求：
- 所有发言和决策都应符合你的性格特点
- 在游戏中保持角色一致性
- 根据性格特点调整策略（如更主动发起攻击）
- 在发言中体现性格特点（如直接、强势）

作为狼人，你的发言策略：
1. 伪装成好人，避免暴露
2. 引导好人投票错误目标
3. 保护队友，必要时为队友辩护
4. 制造混乱，转移注意力
5. 考虑自爆策略（如必要）

当前局势分析：
- 昨晚狼人试图杀害的玩家: 6号
- 需要重点关注的玩家: 暂无

请返回JSON格式，包含以下字段：
- speech: 你的发言内容（30-80字的自然对话，其他玩家都能听到）

注意：speech字段是你的公开发言，要伪装成好人，避免暴露狼人身份，可以适当误导其他玩家。

## 你之前的内心独白（只有你自己知道）：
第1次：我需要混淆视听，引导好人怀疑3号
第2次：1号似乎在带节奏，我要配合他

注意：发言内容控制在30-80字，语言自然，像真人玩家。

请直接返回JSON格式的结果，不要包含其他说明文字。
```

**LLM配置**：
```typescript
{
  model: "anthropic/claude-sonnet-4-5",
  maxTokens: 5000,
  temperature: 1.0,
  experimental_telemetry: {...}
}
```

---

## 总结

### Prompt结构层次

```
[性格描述]                    ← 仅投票环节
+ [角色+身份信息]
+ [游戏状态]
+ [角色特定信息]              ← 队友、查验结果、药水等
+ [策略建议]
+ [格式要求]
+ [内心独白历史]              ← 所有环节
+ [发言长度要求]              ← 仅发言环节
+ [JSON格式后缀]              ← 所有环节
```

### 关键设计原则

1. **角色隔离**：每场游戏开始时清空 `thinkingHistory`
2. **上下文累积**：历史独白在同一场游戏中持续累积
3. **防止幻觉**：第1轮特殊提示防止AI编造不存在信息
4. **性格一致性**：性格描述贯穿所有决策
5. **Schema强制**：Zod验证确保输出格式正确
6. **Trace追踪**：完整的Trace ID链路追踪
