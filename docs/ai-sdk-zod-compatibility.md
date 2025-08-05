# AI SDK 和 Zod 兼容性指南

## 版本兼容性

### AI SDK 版本支持情况

- **AI SDK 3.x**: 主要支持 Zod v3，对 Zod v4 支持有限
- **AI SDK 4.x**: 开始改进对 Zod v4 的支持
- **AI SDK 5.x**: 完全支持 Zod v3 和 v4，推荐使用 Zod v4

### 当前项目状态 (已更新)

- 项目使用 AI SDK 5.0.2 ✅
- 全局使用 Zod v4.0.14 ✅
- **状态**: AI SDK 5.x 完全支持 Zod v4，不再有兼容性问题

## 常见错误及解决方案

### 1. ZodObject 类型不兼容错误 (AI SDK 5.x 已解决)

**注意**: 在 AI SDK 5.x 中，这个问题已经被解决。以下内容供参考。

**历史错误信息**:
```
Type 'ZodObject<...>' is not assignable to type 'ZodType<...>'
```

**AI SDK 5.x 解决方案**:

直接使用 Zod schema，无需包装器：
```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const schema = z.object({
  speech: z.string()
});

const result = await generateObject({
  model: this.getModel(),
  schema: schema,
  prompt: prompt
});
```

### 2. generateObject API 更新 (AI SDK 5.x)

**AI SDK 5.x 中的新 API**:
```typescript
// AI SDK 5.x 支持的参数
const result = await generateObject({
  model: this.getModel(),
  schema: schema,  // 直接使用 Zod schema
  prompt: prompt,
  maxTokens: 500,
  temperature: 0.8,
  // 新增参数
  system: "系统提示词",
  messages: [],  // 支持消息历史
  seed: 123,     // 确定性生成
});
```

**注意事项**:
- 不再需要 `mode: 'json'`
- 直接传入 Zod schema，无需包装
- 支持更多配置选项

## AI SDK 5.x + Zod v4 实际示例

### 生成游戏角色对话

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

// 定义响应 schema
const SpeechResponseSchema = z.object({
  speech: z.string().describe('角色的发言内容'),
  confidence: z.number().min(0).max(1).describe('发言的信心程度'),
  targetPlayer: z.number().optional().describe('指向的玩家 ID'),
});

// 使用 AI SDK 5.x 生成
const result = await generateObject({
  model: this.getModel(),
  schema: SpeechResponseSchema,
  system: "你是一个狼人杀游戏中的角色",
  prompt: `作为${role}，在${phase}阶段发言`,
  temperature: 0.8,
});

// result.object 直接包含类型安全的数据
console.log(result.object.speech);
```

### 处理复杂游戏状态

```typescript
// 使用 Zod v4 的新特性
const GameStateSchema = z.object({
  players: z.array(z.object({
    id: z.number(),
    role: z.enum(['VILLAGER', 'WEREWOLF', 'SEER', 'WITCH']),
    alive: z.boolean(),
    // 使用 .transform() 进行数据转换
    lastSpeech: z.string().transform(str => str.trim()),
  })),
  // 使用 .catch() 处理解析失败
  phase: z.enum(['DAY', 'NIGHT']).catch('DAY'),
  // 使用 .brand() 创建品牌类型
  gameId: z.string().uuid().brand('GameId'),
});

// 类型推断完美工作
type GameState = z.infer<typeof GameStateSchema>;
```

## Zod Schema 最佳实践

### 1. 使用 describe() 提供上下文

```typescript
const schema = z.object({
  name: z.string().describe('Name of a fictional person'),
  message: z.string().describe('Message. Do not use emojis or links.')
});
```

### 2. 处理可选参数 (Zod v4)

```typescript
// Zod v4 中 .optional() 完全支持
const schema = z.object({
  workdir: z.string().optional(),  // ✅ 在 Zod v4 中正常工作
  nullable: z.string().nullable(),  // 允许 null 值
  nullish: z.string().nullish(),    // 允许 null 或 undefined
});

// 带默认值
const withDefaults = z.object({
  port: z.number().default(3000),
  host: z.string().default('localhost')
});
```

### 3. 复杂的 transform 操作

```typescript
// 带 transform 的 schema 可能需要特殊处理
export const SpeechResponseSchema = z.object({
  speech: z.string().transform(val => {
    try {
      const parsed = JSON.parse(val);
      if (parsed.speech_content) return parsed.speech_content;
      if (parsed.statement) return parsed.statement;
      if (typeof parsed === 'string') return parsed;
      return val;
    } catch {
      return val;
    }
  })
});
```

### 4. 递归 Schema (AI SDK 5.x)

```typescript
import { z } from 'zod';

// AI SDK 5.x 直接支持递归 schema
interface Category {
  name: string;
  subcategories: Category[];
}

const categorySchema: z.ZodType<Category> = z.object({
  name: z.string(),
  subcategories: z.lazy(() => categorySchema.array()),
});

// 直接使用，无需包装
const result = await generateObject({
  model: this.getModel(),
  schema: z.object({
    category: categorySchema,
  }),
  prompt: "生成一个分类树"
});
```

## 调试技巧

### 1. 检查 Schema Shape

```typescript
console.log('Schema shape:', JSON.stringify(SpeechResponseSchema.shape, null, 2));
```

### 2. 查看警告信息

```typescript
const result = await generateObject({...});
console.log(result.warnings); // 查看兼容性警告
```

### 3. AI SDK 5.x 新特性

```typescript
// 流式对象生成
import { streamObject } from 'ai';

const { partialObjectStream } = await streamObject({
  model: this.getModel(),
  schema: schema,
  prompt: prompt,
});

// 处理流式响应
for await (const partialObject of partialObjectStream) {
  console.log(partialObject);
}
```

## 项目迁移建议 (已完成 ✅)

### 迁移成果
1. ✅ 已升级到 AI SDK 5.0.2
2. ✅ 统一使用 Zod v4.0.14
3. ✅ 移除了所有兼容性包装器

### AI SDK 5.x 主要优势
1. **完全兼容 Zod v4** - 无需特殊处理
2. **更好的类型推断** - TypeScript 支持更完善
3. **流式生成支持** - `streamObject`, `streamText`
4. **更丰富的配置** - 支持 system prompts, seed 等

### Zod v4 新特性
1. **更好的性能** - 解析速度提升
2. **改进的错误消息** - 更清晰的验证错误
3. **新的 API** - `.catch()`, `.pipe()`, `.brand()`
4. **更好的 TypeScript 支持** - 类型推断更准确

## 参考资源

- [AI SDK 5.x 文档](https://sdk.vercel.ai/docs)
- [Zod v4 文档](https://zod.dev)
- [AI SDK 5.x 迁移指南](https://sdk.vercel.ai/docs/migrations/migrating-from-4-to-5)
- [Zod v3 到 v4 迁移](https://github.com/colinhacks/zod/blob/main/MIGRATION.md)