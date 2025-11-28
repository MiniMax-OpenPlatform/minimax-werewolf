# 夜间行动LLM决策与信息传递分析

## 问题1：第一夜的夜间行动是否由LLM决策？

### ✅ 结论：**是的，所有夜间行动都由LLM决策**

### 代码证据：

#### 1. 狼人杀人决策
**位置**: `packages/game-master-vite/src/lib/GameMaster.ts:264-288`

```typescript
// 狼人夜间杀人
const leadWerewolf = this.getAlivePlayerOfType(isWerewolfPlayer);

if (leadWerewolf) {
  console.log(`🐺 Asking ${leadWerewolf.id} to choose kill target`);
  this.operationLogSystem.logPlayerRequest(leadWerewolf.id, '选择杀害目标');

  const result = await leadWerewolf.useAbility(this);  // ← 调用LLM

  if (result) {
    console.log(`🐺 Werewolf action result:`, result);
    this.operationLogSystem.logPlayerResponse(leadWerewolf.id, '夜间杀害',
      `行动:${result.action}, 击杀玩家${result.target}。${result.reason}`);
    this.processWerewolfAction(result);
  }
}
```

- **LLM调用链**: `leadWerewolf.useAbility()` → `PlayerServer.useAbility()` → `generateAbilityUse()` → LLM生成
- **返回结果**: `{ action: 'kill', target: number, reason: string }`

#### 2. 预言家查验决策
**位置**: `packages/game-master-vite/src/lib/GameMaster.ts:290-311`

```typescript
// 预言家查验
const seer = this.getAlivePlayerOfType(isSeerPlayer);
if (seer) {
  console.log(`🔮 Asking ${seer.id} to choose investigation target`);
  this.operationLogSystem.logPlayerRequest(seer.id, '选择查验目标');

  const result = await seer.useAbility(this);  // ← 调用LLM

  if (result) {
    console.log(`🔮 Seer investigation result:`, result);
    this.operationLogSystem.logPlayerResponse(seer.id, '夜间查验',
      `查验玩家${result.target}。${result.reason}`);
    this.processSeerAction(result);
    // seerResult已经保存，不添加到公开speech以免暴露身份
  }
}
```

- **LLM调用链**: `seer.useAbility()` → `PlayerServer.useAbility()` → `generateAbilityUse()` → LLM生成
- **返回结果**: `{ action: 'check', target: number, reason: string }`
- **查验结果保存**: `this.seerResult[this.round] = { target, isGood }`

#### 3. 女巫救人/毒人决策
**位置**: `packages/game-master-vite/src/lib/GameMaster.ts:313-352`

```typescript
// 女巫行动
const witch = this.getAlivePlayerOfType(isWitchPlayer);
if (witch) {
  console.log(`🧙 Asking ${witch.id} to use abilities`);
  this.operationLogSystem.logPlayerRequest(witch.id, '是否使用药水');

  const result = await witch.useAbility(this);  // ← 调用LLM

  if (result) {
    console.log(`🧙 Witch action result:`, result);

    let actionDesc = '';
    if (result.action === 'using') {
      if (result.healTarget > 0) {
        actionDesc += `救了玩家${result.healTarget}。${result.healReason} `;
      }
      if (result.poisonTarget > 0) {
        actionDesc += `毒了玩家${result.poisonTarget}。${result.poisonReason}`;
      }
    } else {
      actionDesc = '选择不使用药水。';
    }

    this.operationLogSystem.logPlayerResponse(witch.id, '药水使用', actionDesc);
    this.processWitchAction(witch, result);
    // 女巫行动已记录到operationLog，不添加到公开speech以免暴露身份
  }
}
```

- **LLM调用链**: `witch.useAbility()` → `PlayerServer.useAbility()` → `generateAbilityUse()` → LLM生成
- **返回结果**: `{ action: 'using'|'idle', healTarget?: number, poisonTarget?: number, healReason?: string, poisonReason?: string }`
- **女巫得知信息**: 通过`WitchContext`知道`killedTonight` (当晚被狼人杀的玩家)

---

## 问题2：夜间行动信息是否在第二天的对话中传递给LLM？

### 结论：**部分角色可以，但不是通过公开发言，而是通过私有Context**

### 关键发现：

夜间行动结果**不会**添加到公开的`allSpeeches`中，而是通过各角色的**私有Context**传递：

#### ✅ 预言家 - **可以获得查验结果**

**位置**: `packages/player/src/prompts/speech/index.ts:119-166`

```typescript
export function getSeerSpeech(playerServer: PlayerServer, context: SeerContext): string {
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

  return `你是${playerId}号玩家，狼人杀游戏中的预言家角色...
- 存活玩家: [${playerList}]
- 当前发言轮次: 第${context.round}轮
- 历史发言摘要: ${speechSummary}
- 你的查验结果: ${checkInfo}  ← 明确传递给LLM
...`;
}
```

**Context构建**: `SeerPlayer.buildContext()` (packages/game-master-vite/src/lib/Player.ts:189-194)
```typescript
protected buildContext(gameMaster: GameMaster): SeerContext {
  return {
    ...super.buildContext(gameMaster),
    investigatedPlayers: gameMaster.getInvestigatedPlayers()  // ← 获取查验历史
  };
}
```

**示例prompt**:
```
你是3号玩家，狼人杀游戏中的预言家角色...
- 你的查验结果: 1号是好人，5号是狼人
```

#### ✅ 女巫 - **可以获得昨晚被杀信息和药水使用情况**

**位置**: `packages/player/src/prompts/speech/index.ts:169-210`

```typescript
export function getWitchSpeech(playerServer: PlayerServer, context: WitchContext): string {
  const potionInfo = context.potionUsed ?
    `解药${context.potionUsed.heal ? '已用' : '可用'}，毒药${context.potionUsed.poison ? '已用' : '可用'}`
    : '解药可用，毒药可用';
  const killedInfo = context.killedTonight ? `${context.killedTonight}号` : '无人被杀';

  return `你是${playerId}号玩家，狼人杀游戏中的女巫角色...
- 存活玩家: [${playerList}]
- 当前发言轮次: 第${context.round}轮
- 历史发言摘要: ${speechSummary}
- 你的药水使用情况: ${potionInfo}  ← 明确传递
...
当前局势分析：
- 今晚被杀的玩家: ${killedInfo}（你${context.potionUsed?.heal ? '已救' : '未救'}）  ← 明确传递
- 是否使用毒药: ${context.potionUsed?.poison ? '已使用' : '未使用'}
...`;
}
```

**Context构建**: `WitchPlayer.buildContext()` (packages/game-master-vite/src/lib/Player.ts:149-158)
```typescript
protected buildContext(gameMaster: GameMaster): WitchContext {
  return {
    ...super.buildContext(gameMaster),
    killedTonight: gameMaster.nightTemp?.werewolfTarget,  // ← 获取狼人击杀目标
    potionUsed: {
      heal: this.healUsedOn > 0,
      poison: this.poisonUsedOn > 0
    }
  };
}
```

**注意**: 女巫在**夜间行动时**能看到`killedTonight`，但在**白天发言时**也能看到（如果还在nightTemp中）

**示例prompt**:
```
你是2号玩家，狼人杀游戏中的女巫角色...
- 你的药水使用情况: 解药已用，毒药可用
当前局势分析：
- 今晚被杀的玩家: 4号（你已救）
- 是否使用毒药: 未使用
```

#### ⚠️ 狼人 - **只知道队友，不知道昨晚杀了谁**

**位置**: `packages/player/src/prompts/speech/index.ts:73-116`

```typescript
export function getWerewolfSpeech(playerServer: PlayerServer, context: PlayerContext): string {
  const params = {
    teammates: teammateIds?.map(id => id.toString()),
    killedLastNight: 'unknown'  // ← 硬编码为'unknown'！
  };

  return `你是${playerId}号玩家，狼人杀游戏中的狼人角色...
- 存活玩家: [${playerList}]
- 当前发言轮次: 第${context.round}轮
- 历史发言摘要: ${speechSummary}
- 你的狼人队友: [${teammateList}]  ← ✅ 知道队友
...
当前局势分析：
- 今晚被杀的玩家: 无人被杀  ← ❌ 显示为'无人被杀'（因为killedLastNight='unknown'）
...`;
}
```

**问题**: 狼人在白天发言时**不知道**昨晚自己杀了谁！只能通过系统公告得知。

**Context构建**: `WerewolfPlayer.buildContext()` (packages/game-master-vite/src/lib/Player.ts:116-120)
```typescript
protected buildContext(gameMaster: GameMaster) {
  return {
    ...super.buildContext(gameMaster),  // 只有基础信息，没有killedTarget
  }
}
```

#### ❌ 村民 - **只能通过公开信息推理**

村民没有夜间行动，只能通过：
- 系统公告（"💀 昨晚 X号 死亡了！" 或 "🌅 昨晚是平安夜"）
- 其他玩家的发言
- 投票历史

获取信息。

---

## 信息传递流程图

```
第一夜:
┌─────────────────────────────────────────────────────┐
│ 狼人杀人 (LLM决策)                                    │
│  → nightTemp.werewolfTarget = X                     │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 预言家查验 (LLM决策)                                  │
│  → seerResult[round] = { target: Y, isGood: true }  │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 女巫行动 (LLM决策)                                    │
│  → 获知 killedTonight = X                           │
│  → 决定是否使用解药/毒药                              │
│  → witch.healUsedOn = X (如果救人)                   │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 计算夜间死亡                                          │
│  → deaths = calculateNightDeaths()                  │
│  → 添加系统公告到allSpeeches                          │
└─────────────────────────────────────────────────────┘

第二天白天发言:
┌─────────────────────────────────────────────────────┐
│ 所有玩家都能看到:                                     │
│  - allSpeeches (包含系统死亡公告)                     │
│  - alivePlayers                                     │
│  - allVotes                                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 预言家额外能看到:                                     │
│  - investigatedPlayers (所有查验历史)                │
│    示例: "1号是好人，5号是狼人"                        │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 女巫额外能看到:                                       │
│  - killedTonight (昨晚被杀的玩家)                     │
│  - potionUsed (药水使用情况)                          │
│    示例: "昨晚4号被杀（你已救），解药已用，毒药可用"    │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 狼人额外能看到:                                       │
│  - teammates (队友列表)                              │
│  ❌ 但不知道昨晚杀了谁！                               │
└─────────────────────────────────────────────────────┘
```

---

## 潜在问题

### 1. 狼人不知道昨晚杀了谁
**位置**: `packages/player/src/prompts/speech/index.ts:88`
```typescript
killedLastNight: 'unknown'  // 硬编码！
```

**影响**: 狼人在白天发言时只能通过系统公告知道结果，无法在发言策略中利用"我们昨晚杀了X"这个信息。

**建议修复**:
```typescript
// WerewolfPlayer.buildContext() 中添加
protected buildContext(gameMaster: GameMaster): WerewolfContext {
  return {
    ...super.buildContext(gameMaster),
    lastKillTarget: gameMaster.nightTemp?.werewolfTarget  // 添加这行
  };
}
```

### 2. 女巫在白天发言时可能获取不到killedTonight
**原因**: `killedTonight: gameMaster.nightTemp?.werewolfTarget`

如果`nightTemp`在夜间结束后被清空，女巫在白天发言时将无法获取这个信息。

**当前代码**: GameMaster.ts:258初始化`this.nightTemp = {}`在夜晚开始时，但没有看到在夜晚结束后清空。

### 3. 预言家查验结果累积存储
**当前实现**: `this.seerResult[this.round] = { target, isGood }`

预言家可以看到**所有轮次**的查验结果，这是合理的。

---

## 总结

| 角色 | 夜间行动是否LLM决策 | 白天发言时能否获得夜间信息 | 获得的信息内容 |
|------|-------------------|-------------------------|---------------|
| 狼人 | ✅ 是 (选择击杀目标) | ⚠️ 部分 | ✅ 队友列表<br>❌ 昨晚杀了谁（硬编码为unknown） |
| 预言家 | ✅ 是 (选择查验目标) | ✅ 是 | ✅ 所有历史查验结果 (例: "1号是好人，5号是狼人") |
| 女巫 | ✅ 是 (选择是否用药) | ✅ 是 | ✅ 昨晚被杀的玩家<br>✅ 药水使用情况<br>✅ 是否已救人/毒人 |
| 村民 | ❌ 无夜间行动 | ❌ 否 | 只能通过公开的系统公告和其他玩家发言 |

**核心机制**:
1. ✅ 所有夜间决策都由LLM完成
2. ✅ 夜间信息通过**角色私有Context**传递，不在公开发言中暴露
3. ⚠️ 狼人无法获知昨晚击杀目标（可能是bug）
4. ✅ 预言家和女巫在白天发言时能看到完整的夜间行动结果

**验证方法**:
查看日志文件 `logs/player[1-6]-dev.log`，搜索 `📝 speech-generation prompt:` 可以看到实际传递给LLM的完整prompt内容。
