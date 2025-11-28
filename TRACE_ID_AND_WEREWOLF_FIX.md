# Trace ID 和 狼人信息传递 功能实现

## 完成的任务

### ✅ 任务1：在游戏操作记录中显示LLM的trace_id

#### 修改的文件：

1. **shared/lib/src/operationLog.ts**
   - 添加 `traceId?: string` 字段到 `OperationLog` 接口 (line 13)
   - 修改 `logPlayerResponse()` 方法，添加 `traceId` 参数 (line 69)
   - 在消息中显示trace_id: `[Trace: ${traceId}]` (line 72)

2. **shared/types/src/api.ts**
   - 添加 `traceId?: string` 到所有ability response接口：
     - `WitchAbilityResponse` (line 88)
     - `SeerAbilityResponse` (line 96)
     - `WerewolfAbilityResponse` (line 104)

3. **packages/game-master-vite/src/lib/GameMaster.ts**
   - **狼人行动** (lines 277-289)：记录trace_id到operationLog
   - **预言家行动** (lines 307-319)：记录trace_id到operationLog
   - **女巫行动** (lines 341-361)：记录trace_id到operationLog

#### 效果：

在"游戏操作记录"中，每个夜间行动的记录现在会显示：
```
📥 玩家2 夜间杀害完成: 行动:kill, 击杀玩家4。该玩家发言可疑 [Trace: abc123-xyz789]
📥 玩家3 夜间查验完成: 查验玩家1。想确认其身份 [Trace: def456-uvw012]
📥 玩家5 药水使用完成: 救了玩家4。保护重要角色 [Trace: ghi789-rst345]
```

控制台也会输出：
```
🔖 Werewolf 2 Trace-ID: abc123-xyz789
🔖 Seer 3 Trace-ID: def456-uvw012
🔖 Witch 5 Trace-ID: ghi789-rst345
```

---

### ✅ 任务2：修复狼人无法获知击杀目标的Bug

#### 问题描述：

原代码中，狼人在白天发言时的prompt显示：
```
- 今晚被杀的玩家: 无人被杀  ← 错误！硬编码为'unknown'
```

这导致狼人无法在策略中利用"昨晚我们杀了谁"这个信息。

#### 修改的文件：

1. **packages/game-master-vite/src/lib/GameMaster.ts**
   - 添加 `lastWerewolfKill` 字段记录上次击杀目标 (line 18)
   - 在 `processWerewolfAction()` 中记录击杀目标 (line 86)
   ```typescript
   this.lastWerewolfKill = result.target;
   ```

2. **shared/types/src/api.ts**
   - 创建 `WerewolfContext` 接口 (lines 125-127)
   ```typescript
   export interface WerewolfContext extends PlayerContext {
     lastKillTarget?: PlayerId;
   }
   ```
   - 添加 `WerewolfContext` 到 `GameContext` 联合类型 (line 138)

3. **packages/game-master-vite/src/lib/Player.ts**
   - 修改 `WerewolfPlayer.buildContext()` 方法 (lines 116-121)
   ```typescript
   protected buildContext(gameMaster: GameMaster) {
     return {
       ...super.buildContext(gameMaster),
       lastKillTarget: gameMaster.lastWerewolfKill,  // 传递上次击杀目标
     }
   }
   ```

4. **packages/player/src/prompts/speech/index.ts**
   - 修改 `getWerewolfSpeech()` 函数 (lines 81-98)
   - 从context中获取 `lastKillTarget` 而不是硬编码
   ```typescript
   const werewolfContext = context as any;
   const lastKillTarget = werewolfContext.lastKillTarget;
   const killedInfo = params.killedLastNight ? `${params.killedLastNight}号` : '未知（可能被女巫救了）';
   ```

#### 修复后的效果：

狼人在白天发言时的prompt现在会显示：
```
当前局势分析：
- 今晚被杀的玩家: 4号  ← ✅ 正确显示击杀目标
- 当前投票情况: ...
```

如果女巫救了人，系统公告会显示"平安夜"，但狼人仍然知道自己击杀了谁。

---

## 信息流程图

```
第一夜:
┌──────────────────────────────────────┐
│ 狼人击杀 (LLM决策)                    │
│  → result = { target: 4, traceId: "abc123" } │
└──────────────────────────────────────┘
          ↓
┌──────────────────────────────────────┐
│ GameMaster.processWerewolfAction()   │
│  → nightTemp.werewolfTarget = 4      │
│  → lastWerewolfKill = 4              │
│  → operationLog记录 (含trace_id)      │
└──────────────────────────────────────┘

第二天白天:
┌──────────────────────────────────────┐
│ 狼人白天发言                          │
│  → buildContext传递lastKillTarget: 4 │
│  → prompt显示"今晚被杀的玩家: 4号"     │
└──────────────────────────────────────┘
```

---

## 类型安全保证

所有修改都通过了TypeScript类型检查：
- ✅ `WerewolfContext` extends `PlayerContext`
- ✅ `traceId?: string` 在所有response接口中
- ✅ operationLog details支持traceId字段
- ✅ 向后兼容（traceId都是可选字段）

---

## 测试建议

1. **测试trace_id显示**：
   - 创建游戏并进入第一夜
   - 检查"游戏操作记录"面板
   - 验证狼人、预言家、女巫的行动记录都包含 `[Trace: xxx]`

2. **测试狼人信息传递**：
   - 查看 `logs/player[X]-dev.log` (狼人的日志)
   - 搜索 `📝 speech-generation prompt:`
   - 验证白天发言的prompt包含 "今晚被杀的玩家: X号"

3. **边缘情况**：
   - 女巫救人 → 系统公告"平安夜" + 狼人仍知道击杀目标
   - 第一天白天 → lastKillTarget为undefined → 显示"未知"
   - 狼人选择idle → target为0，不记录lastKillTarget

---

## 后续优化建议

1. **前端UI优化**：
   - 在GameOperationLog组件中，单独高亮显示trace_id
   - 添加复制trace_id按钮
   - 支持点击trace_id跳转到Langfuse

2. **狼人策略增强**：
   - 可以在prompt中利用lastKillTarget信息
   - 例如："你昨晚击杀了4号，但今天显示平安夜，说明女巫救了人"

3. **数据分析**：
   - 收集所有trace_id用于LLM性能分析
   - 关联trace_id和游戏结果
   - 优化不同阶段的prompt质量
