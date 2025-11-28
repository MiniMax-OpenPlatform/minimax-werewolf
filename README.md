# 🐺 MiniMax Werewolf - AI 狼人杀游戏框架

一个基于 AI 的多人狼人杀游戏框架，采用 monorepo 架构，支持多个具有独特个性的 AI 玩家进行游戏。使用 MiniMax AI 模型驱动，提供完整的游戏体验和详细的行为追踪。

[![GitHub Stars](https://img.shields.io/github/stars/MiniMax-OpenPlatform/minimax-werewolf?style=social)](https://github.com/MiniMax-OpenPlatform/minimax-werewolf)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)

## ✨ 核心特性

- 🤖 **AI 驱动游戏**: 6 个具有不同个性和策略的 AI 玩家自主决策
- 🎮 **完整游戏流程**: 白天讨论投票、夜晚角色技能，完全遵循经典狼人杀规则
- 🎭 **四大角色**: 村民、狼人、预言家、女巫，各具特色技能
- 👤 **个性化配置**: 可自定义每个玩家的性格、策略和说话风格
- 📊 **实时可视化**: React + MobX 实时状态管理，查看所有玩家行为
- 🔍 **AI 遥测追踪**: 集成 Langfuse，记录每次 AI 决策的 Trace ID
- 📜 **游戏历史**: 完整记录每局游戏，包括发言、投票、夜间行动和 AI 思考过程
- 💭 **内心独白**: 查看 AI 玩家的思考过程和推理逻辑
- 🚀 **高性能**: 使用 Bun 运行时，开发模式无需构建

## 🎯 项目亮点

- **前端 API Key 配置**: 无需配置环境变量，直接在 Web 界面输入 MiniMax API Key
- **MiniMax AI 驱动**: 使用 MiniMax-M2 模型提供智能对话和推理能力
- **详细日志系统**: 记录完整的游戏过程，包括 AI 思考、Trace ID、投票理由等
- **操作记录**: 实时显示游戏操作日志，方便调试和分析
- **玩家对话**: 分别显示公开发言、内心独白和 Trace ID
- **游戏回放**: 可查看历史游戏的完整过程

## 🛠 技术栈

- **运行时**: Bun 1.0+
- **前端**: Vite + React + MobX + TailwindCSS
- **后端**: Express + TypeScript
- **AI 服务**:
  - MiniMax AI (MiniMax-M2 模型)
  - 自定义个性系统
  - Structured Outputs (Zod Schema)
- **监控**: Langfuse 遥测与追踪
- **架构**: Monorepo (Bun Workspaces)

## 📦 项目结构

```
minimax-werewolf/
├── packages/
│   ├── game-master-vite/        # 游戏主控前端 (端口 3000)
│   │   ├── src/
│   │   │   ├── components/      # React 组件
│   │   │   │   ├── ChatDisplay.tsx          # 玩家对话显示
│   │   │   │   ├── GameOperationLog.tsx     # 操作记录
│   │   │   │   ├── GameHistory.tsx          # 游戏历史
│   │   │   │   ├── PlayerList.tsx           # 玩家列表
│   │   │   │   └── GameControls.tsx         # 游戏控制
│   │   │   ├── lib/             # 核心逻辑
│   │   │   │   ├── GameMaster.ts            # 游戏主控逻辑
│   │   │   │   ├── Player.ts                # 玩家类
│   │   │   │   └── PlayerAPIClient.ts       # API 客户端
│   │   │   └── stores/          # MobX 状态管理
│   │   └── game-logs/           # 游戏日志存储
│   └── player/                  # AI 玩家服务器 (端口 3001-3006)
│       └── src/
│           ├── prompts/         # AI 提示模板
│           │   ├── personality/ # 性格提示
│           │   ├── speech/      # 发言提示
│           │   ├── voting/      # 投票提示
│           │   └── night/       # 夜间行动提示
│           └── services/        # AI 服务
├── shared/
│   ├── types/                   # 共享类型定义
│   │   ├── api.ts               # API 类型
│   │   ├── schemas.ts           # Zod 验证模式
│   │   └── gameLog.ts           # 游戏日志类型
│   ├── lib/                     # 共享工具库
│   │   ├── langfuse.ts          # Langfuse 集成
│   │   ├── operationLog.ts      # 操作日志系统
│   │   └── speechSystem.ts      # 发言系统
│   └── prompts/                 # 共享提示模板
├── config/                      # 玩家配置文件 (YAML)
│   ├── player1.yaml
│   ├── player2.yaml
│   └── ...
├── scripts/                     # 启动脚本
│   ├── dev-players.sh           # 启动所有玩家
│   └── ...
└── logs/                        # 开发模式日志
    ├── player1-dev.log
    └── ...
```

## 🚀 快速开始

### 前置要求

- **Node.js** 18+
- **Bun** 1.0+
- **MiniMax API Key**: 从 [MiniMax 开放平台](https://platform.minimaxi.com) 获取

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/MiniMax-OpenPlatform/minimax-werewolf.git
cd minimax-werewolf

# 2. 安装依赖
bun install

# 3. 配置环境变量（可选）
cp .env.example .env
```

### 配置说明

#### API Key 配置（两种方式）

**方式 1：前端界面配置（推荐）** ✨
- 启动游戏后，在游戏控制面板点击 **"🔑 配置 API Key"**
- 输入您的 MiniMax API Key
- API Key 仅在当前游戏会话中使用，不会被存储

**方式 2：环境变量配置**
```bash
# 在 .env 文件中配置（可选）
OPENROUTER_API_KEY=your_minimax_api_key_here
AI_MODEL=MiniMax-M2
AI_BASE_URL=https://api.minimaxi.com/v1
```

#### Langfuse 遥测配置（可选）
```bash
# 在 .env 文件中配置
LANGFUSE_SECRET_KEY=your_secret_key
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_BASEURL=https://us.cloud.langfuse.com
```

### 启动游戏

```bash
# 方式 1: 分别启动 (推荐，方便查看日志)

# 终端 1: 启动所有 AI 玩家 (端口 3001-3006)
bun run dev:players

# 终端 2: 启动游戏主控界面 (端口 3000)
bun run dev:game-master

# 方式 2: 一键启动所有服务
bun run dev:game
```

### 开始游戏

1. 访问 **http://localhost:3000**
2. 点击 **"🔑 配置 API Key"** 输入您的 MiniMax API Key
3. 点击 **"👤 配置玩家性格"** 自定义 AI 玩家个性（可选）
4. 点击 **"创建新游戏"** - 自动添加 6 个 AI 玩家并分配角色
5. 点击 **"开始游戏"** - 进入夜晚阶段
6. 点击 **"下一阶段"** 推进游戏流程

## 🎮 游戏玩法

### 游戏流程

```
准备阶段 → 夜晚阶段 → 白天讨论 → 投票阶段 → 判定胜负 → 下一轮...
```

1. **🌙 夜晚阶段**:
   - 狼人选择击杀目标
   - 预言家查验玩家身份
   - 女巫使用解药/毒药

2. **🌞 白天讨论**:
   - 所有存活玩家依次发言
   - AI 根据性格和策略进行推理

3. **🗳️ 投票阶段**:
   - 所有玩家投票放逐可疑对象
   - 得票最多者出局

4. **🏆 胜利条件**:
   - **村民阵营胜利**: 所有狼人被淘汰
   - **狼人阵营胜利**: 狼人数量 ≥ 好人数量

### 角色介绍

| 角色 | 图标 | 阵营 | 技能 | 技能说明 |
|-----|------|------|------|---------|
| 村民 | 👤 | 好人 | 无 | 白天投票，推理找狼 |
| 狼人 | 🐺 | 狼人 | 击杀 | 夜晚杀人，知道队友 |
| 预言家 | 🔮 | 好人 | 查验 | 每晚查验一人身份 |
| 女巫 | 🧪 | 好人 | 救人/毒人 | 解药救人，毒药杀人（各一次） |

## 🤖 AI 玩家配置

### 默认玩家配置

| 端口 | 玩家 | 性格特点 |
|------|------|----------|
| 3001 | 玩家1 | 理性分析型，善于逻辑推理 |
| 3002 | 玩家2 | 激进冒险型，主动出击 |
| 3003 | 玩家3 | 谨慎保守型，倾向观察 |
| 3004 | 玩家4 | 幽默风趣型，活跃气氛 |
| 3005 | 玩家5 | 沉默寡言型，一针见血 |
| 3006 | 玩家6 | 情绪化，容易受影响 |

### 自定义玩家性格

在游戏控制面板中：
1. 点击 **"配置玩家性格"**
2. 编辑每个玩家的性格描述
3. 点击 **"重置默认"** 恢复默认配置

### YAML 配置文件

每个玩家都有独立的 YAML 配置文件 (`config/player*.yaml`)：

```yaml
server:
  port: 3001
  host: "0.0.0.0"

ai:
  provider: "openrouter"
  model: "google/gemini-2.0-flash-exp:free"
  maxTokens: 5000
  temperature: 0.8

game:
  personality: "理性分析型玩家，善于逻辑推理"
  strategy: "balanced"

logging:
  enabled: true
```

## 📊 功能特性

### 1. 实时游戏界面

- **玩家列表**: 显示所有玩家状态、角色、性格
- **对话记录**: 查看玩家发言、内心独白、Trace ID
- **操作记录**: 实时显示游戏操作日志
- **游戏控制**: 创建游戏、开始游戏、推进阶段

### 2. AI 思考过程可视化

每条发言都包含：
- 💬 **公开发言**: 其他玩家可见的内容
- 💭 **内心独白**: AI 的思考过程和推理逻辑
- 🔖 **Trace ID**: Langfuse 追踪 ID，可查看详细 AI 调用过程

### 3. 游戏历史与回放

- 📜 查看所有历史游戏
- 🔍 查看游戏详情（发言、投票、夜间行动）
- 📊 分析 AI 决策过程
- 🔖 追踪每次 AI 调用的 Trace ID

### 4. 操作日志系统

实时记录所有游戏操作：
- 🎯 阶段切换
- 💬 玩家请求/响应
- 📊 游戏结果
- 🔖 每个操作的 Trace ID

## 🔧 开发命令

### 开发模式

```bash
# 启动所有 AI 玩家
bun run dev:players

# 启动游戏主控
bun run dev:game-master

# 同时启动所有服务
bun run dev:game

# 启动单个玩家
bun --watch packages/player/src/index.ts --config=config/player1.yaml
```

### 代码质量

```bash
# 类型检查（整个 monorepo）
bun run typecheck

# 检查特定包
bun run typecheck:frontend
bun run typecheck:backend

# 代码规范检查
bun run lint
```

## 📊 监控与调试

### AI 玩家状态接口

每个 AI 玩家都提供 HTTP 状态接口：

```bash
# 检查玩家状态
curl http://localhost:3001/api/player/status
curl http://localhost:3002/api/player/status
# ... (3003-3006)
```

### 日志文件位置

开发模式日志保存在 `logs/` 目录：

```
logs/
├── player1-dev.log
├── player2-dev.log
├── player3-dev.log
├── player4-dev.log
├── player5-dev.log
└── player6-dev.log
```

### 游戏日志存储

完整的游戏日志保存在：

```
packages/game-master-vite/game-logs/
└── {gameId}.json
```

每个游戏日志包含：
- 游戏配置（玩家数、角色分配）
- 所有发言记录（含 thinking 和 traceId）
- 所有投票记录（含理由和 traceId）
- 所有夜间行动（含 thinking 和 traceId）
- 游戏事件（阶段切换、玩家死亡等）
- 游戏结果（胜利方、幸存玩家）

### Langfuse 追踪

如果配置了 Langfuse，可以在 Langfuse 平台查看：
- 每次 AI 调用的详细参数
- 提示词和响应
- 性能指标
- 成本统计

## 🎯 待完成功能

- [ ] 游戏结束时 AI 评分
- [ ] 遗言系统
- [ ] 狼队夜晚交流功能
- [ ] 添加守卫、猎人等角色
- [ ] 9 人游戏模式
- [ ] 提升 UI/UX
- [ ] 游戏录像回放
- [ ] AI 对战排行榜

## 🤝 贡献指南

欢迎提交 Pull Request 或创建 Issue！

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript，**禁止使用 `any`** 类型
- 遵循 ESLint 规则
- 编写有意义的提交信息
- 添加必要的注释和文档

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

本项目基于 [AI-Werewolf](https://github.com/monad-developers/AI-Werewolf) 开源项目优化定制而来，感谢原作者的贡献！

在原项目基础上，我们进行了以下优化和定制：
- ✨ 添加了玩家个性化配置系统
- 🔍 集成 Langfuse AI 行为追踪，支持 Trace ID 显示
- 📊 增强的游戏历史记录功能
- 💭 显示 AI 内心独白和思考过程
- 🎨 优化的 UI/UX 设计
- 🔧 更灵活的配置系统

同时感谢以下开源项目和服务：
- [MiniMax AI](https://www.minimaxi.com) - 强大的 AI 大模型服务
- [Bun](https://bun.sh) - 快速的 JavaScript 运行时
- [Langfuse](https://langfuse.com) - AI 遥测平台
- [React](https://react.dev) - UI 框架
- [MobX](https://mobx.js.org) - 状态管理

## 📞 联系方式

- GitHub Issues: [提交问题](https://github.com/MiniMax-OpenPlatform/minimax-werewolf/issues)
- GitHub Discussions: [讨论区](https://github.com/MiniMax-OpenPlatform/minimax-werewolf/discussions)

---

⭐ 如果这个项目对你有帮助，欢迎 Star！
