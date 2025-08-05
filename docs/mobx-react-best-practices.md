# MobX React 最佳实践经验

## 核心原则

### 1. 全局状态优先原则
- **直接使用全局 store**：组件应直接导入并使用全局 MobX store，而非通过 props 传递
- **移除冗余接口**：删除所有为 props 传递而定义的接口类型
- **简化组件签名**：组件不需要接收状态相关的 props

```typescript
// ❌ 错误：通过 props 传递状态
interface ComponentProps {
  gameState: GameState;
  gameId: string;
}
export function Component({ gameState, gameId }: ComponentProps) {}

// ✅ 正确：直接使用全局状态
import { gameMaster } from '@/stores/gameStore';
export const Component = observer(function Component() {
  const gameState = gameMaster.getGameState();
});
```

### 2. MobX Computed 性能优化
- **缓存派生数据**：使用 `computed` 属性缓存昂贵的计算结果
- **同步访问**：将异步方法转换为同步的 computed 属性供 UI 直接访问
- **标记 computed**：在 `makeAutoObservable` 中明确标记 computed 属性

```typescript
// ✅ 在 store 中添加 computed 属性
class GameMaster {
  constructor() {
    makeAutoObservable(this, {
      recentOperationLogs: computed, // 明确标记
    });
  }

  // 同步 computed 属性，自动缓存
  get recentOperationLogs() {
    return this.operationLogSystem.getLogs().slice(-20);
  }
}

// ✅ 组件中直接使用
const operationLogs = gameMaster.recentOperationLogs; // 同步访问，自动缓存
```

### 3. Observer 包装必须
- **包装所有组件**：使用 MobX 状态的组件必须用 `observer` 包装
- **移除手动状态**：删除 `useState`, `useEffect` 等手动状态管理
- **函数组件语法**：使用 `observer(function ComponentName() {})` 语法

```typescript
// ✅ 正确的 observer 使用
export const GameControls = observer(function GameControls() {
  const gameState = gameMaster.getGameState(); // 自动响应变化
  return <div>{gameState.round}</div>;
});
```

### 4. 避免不必要的 API 调用
- **前端状态管理**：在纯前端状态管理场景中，避免 HTTP API 调用
- **直接状态访问**：直接从全局状态获取数据，而非通过网络请求
- **移除异步逻辑**：删除 fetch、useEffect 等异步数据获取逻辑

```typescript
// ❌ 错误：不必要的 API 调用
useEffect(() => {
  const fetchLogs = async () => {
    const response = await fetch(`/api/game/${gameId}/operation-logs`);
    // ...
  };
  fetchLogs();
}, [gameId]);

// ✅ 正确：直接访问状态
const operationLogs = gameMaster.recentOperationLogs;
```

## 重构步骤

### 步骤 1：添加 Computed 属性
在 MobX store 中添加 computed 属性替代异步方法：

```typescript
// 在 constructor 中标记
makeAutoObservable(this, {
  derivedProperty: computed,
});

// 添加 getter
get derivedProperty() {
  return this.someData.slice(-20); // 同步计算
}
```

### 步骤 2：重构组件
1. 移除 props 接口定义
2. 添加 `observer` 包装
3. 导入全局 store
4. 直接使用 store 数据

### 步骤 3：清理父组件
移除所有不必要的 props 传递

### 步骤 4：清理导入
移除不再使用的导入和依赖

## 性能关键点

1. **Computed 缓存**：computed 属性只在依赖变化时重新计算，大幅提升性能
2. **精确更新**：observer 确保只有使用到变化数据的组件才重新渲染
3. **减少网络请求**：直接状态访问避免不必要的 API 调用
4. **内存优化**：移除冗余的状态管理代码

## 常见陷阱

1. **忘记 observer 包装**：组件不会响应 MobX 状态变化
2. **异步访问 computed**：computed 应该是同步的
3. **props 传递状态**：破坏了 MobX 的反应性系统
4. **混合状态管理**：不要同时使用 useState 和 MobX