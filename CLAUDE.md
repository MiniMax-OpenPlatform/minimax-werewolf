- Player的id为数字
- 只有Player需要使用的type，才需要放到shared，比如game master调用api的type

当前包管理工具为Bun
- 使用Bun不需要进行build，并且系统中也没有build
- 永远ultrathink
- 你的任何Typescript类型修复，永远不要使用any

## MobX React 开发规范

项目使用 MobX 进行状态管理，请严格遵循以下最佳实践：

### 核心原则
1. **全局状态优先**：直接使用全局 MobX store，避免通过 props 传递状态
2. **Computed 缓存**：使用 `computed` 属性缓存派生数据，提升性能
3. **Observer 包装**：所有使用 MobX 状态的组件必须用 `observer` 包装
4. **避免冗余 API**：直接从状态获取数据，避免不必要的网络请求

### 详细实践指南
参考：`docs/mobx-react-best-practices.md`

### 组件重构模式
```typescript
// ✅ 标准模式
import { observer } from 'mobx-react-lite';
import { globalStore } from '@/stores';

export const Component = observer(function Component() {
  const data = globalStore.computedProperty; // 直接使用全局状态
  return <div>{data}</div>;
});
```

## 项目架构修复记录

### Langfuse 集成修复 (2025-01-02)
**问题**: AIService 中 `getAITelemetryConfig` 函数未定义，导致编译错误

**解决方案**:
1. 在 `shared/lib/src/langfuse.ts` 中添加缺失的导出函数：
   - `getAITelemetryConfig` - 返回遥测配置
   - `shutdownLangfuse` - 优雅关闭函数
   - `langfuse` 对象 - 模拟 langfuse 客户端

2. 修复类型导入：在 `AIService.ts` 中添加 `PersonalityType` 类型导入

**关键代码**:
```typescript
// langfuse.ts 关键函数
export function getAITelemetryConfig(gameId: string, playerName: string, traceId: string, functionId: string) {
  return withLangfuseErrorHandling(() => ({
    isEnabled: true,
    metadata: { gameId, playerName, traceId, functionId, timestamp: new Date().toISOString() }
  }), 'getAITelemetryConfig')();
}

export const langfuse = {
  async flushAsync() { console.log('📊 Langfuse flush (no-op in browser mode)'); }
};
```

### 前端 UI 和功能修复 (2025-01-02)
**问题**: 创建游戏按钮无功能，UI 设计过于简陋，玩家状态显示 0/0

**解决方案**:

#### 1. 修复创建游戏功能
- 位置: `packages/game-master-vite/src/components/GameControls.tsx`
- 关键修改: `handleCreateGame` 函数现在会：
  ```typescript
  // 创建游戏并添加6个AI玩家
  await gameMaster.createGame(6);
  const playerUrls = [
    { id: 1, url: 'http://localhost:3001' },
    { id: 2, url: 'http://localhost:3002' },
    // ... 更多玩家
  ];
  for (const player of playerUrls) {
    await gameMaster.addPlayer(player.id, player.url);
  }
  await gameMaster.assignRoles();
  ```

#### 2. UI 美化升级
**游戏控制面板**:
- 添加渐变背景: `bg-gradient-to-br from-white to-gray-50`
- 彩色按钮设计: 蓝色创建、绿色开始、紫色下一阶段、红色结束
- 添加表情符号和悬停效果

**玩家列表组件**:
- 卡片式玩家显示，每个玩家独立卡片
- 角色图标: 狼人🐺、预言家🔮、女巫🧪、村民👤
- 存活/死亡状态可视化
- 渐变状态栏显示游戏信息

#### 3. 类型系统清理
- 确认 Role 枚举只包含 4 个实际角色: VILLAGER, WEREWOLF, SEER, WITCH
- 移除不存在的 HUNTER, GUARD 角色引用

### 项目结构说明
- **前端**: `packages/game-master-vite/` (Vite + React + MobX)
- **后端**: `packages/player/` (Node.js 玩家服务器)
- **共享库**: `shared/lib/`, `shared/types/`, `shared/prompts/`
- **启动脚本**: `scripts/dev-players.sh` (启动6个AI玩家服务器)

### 开发流程
1. 启动玩家服务器: `./scripts/dev-players.sh`
2. 启动前端: `cd packages/game-master-vite && bun run dev`
3. 点击"创建新游戏"按钮自动配置6个AI玩家
4. 开始游戏进行 AI 狼人杀对战
```