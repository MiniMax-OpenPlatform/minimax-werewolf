# 🐺 MiniMax 狼人杀 Demo

一个基于 AI 的多人狼人杀游戏框架，通过 MiniMax-M2 的交错思维链，可以看到玩家的思考和发言之间的戏剧性表现，同时通过音乐语音等沉浸式方式增强真实感。希望这个项目可以为大家如何使用 agentic 模型开发游戏提供些启发，同时本项目也是用 MiniMax-M2 在 AI-Werewolf 项目基础上开发出来的，可以感受到 M2 模型的代码能力。

🎮 **[在线体验 →](https://solution.minimaxi.com/werewolf/)**
<img width="926" height="489" alt="image" src="https://github.com/user-attachments/assets/d545494d-5d18-4461-a116-bb4cbd61e587" />


[![GitHub Stars](https://img.shields.io/github/stars/MiniMax-OpenPlatform/minimax-werewolf?style=social)](https://github.com/MiniMax-OpenPlatform/minimax-werewolf)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com)

## ✨ 核心特性

- 🤖 **AI 驱动游戏**: 6 个具有不同个性和策略的 AI 玩家自主决策
- 🎮 **完整游戏流程**: 白天讨论投票、夜晚角色技能，完全遵循经典狼人杀规则
- 🎭 **四大角色**: 村民、狼人、预言家、女巫，各具特色技能
- 👤 **个性化配置**: 可自定义每个玩家的性格、策略和说话风格
- 📊 **实时可视化**: React + MobX 实时状态管理，查看所有玩家行为
- 📜 **游戏历史**: 完整记录每局游戏，包括发言、投票、夜间行动和 AI 思考过程
- 💭 **内心独白**: 查看 AI 玩家的思考过程和推理逻辑
- 🎵 **沉浸式模式**: 背景音乐、TTS 语音、玩家圆形布局，提供沉浸式游戏体验
- 🐳 **Docker 部署**: 一键部署，开箱即用

## 🎯 项目亮点

- **Web 界面配置**: 直接在 Web 界面输入 MiniMax API Key，无需配置环境变量
- **MiniMax AI 驱动**: 使用 MiniMax-M2 模型提供智能对话和推理能力
- **详细日志系统**: 记录完整的游戏过程，包括 AI 思考、投票理由等
- **操作记录**: 实时显示游戏操作日志，方便调试和分析
- **玩家对话**: 分别显示公开发言和内心独白
- **游戏回放**: 可查看历史游戏的完整过程
- **沉浸式体验**: 动态背景音乐、实时 TTS 语音、精美 UI 设计

## 🛠 技术栈

- **部署**: Docker + Docker Compose
- **前端**: Vite + React + MobX + TailwindCSS
- **后端**: Node.js + Express + TypeScript
- **AI 服务**:
  - MiniMax AI (MiniMax-M2 模型)
  - 自定义个性系统
  - Structured Outputs (Zod Schema)
- **音频系统**: Web Audio API + TTS
- **架构**: Monorepo

## 📦 项目结构

```
minimax-werewolf/
├── packages/
│   ├── game-master-vite/        # 游戏主控前端
│   │   ├── src/
│   │   │   ├── components/      # React 组件
│   │   │   │   ├── ImmersiveMode/        # 沉浸式模式组件
│   │   │   │   ├── ChatDisplay.tsx       # 玩家对话显示
│   │   │   │   ├── GameOperationLog.tsx  # 操作记录
│   │   │   │   ├── GameHistory.tsx       # 游戏历史
│   │   │   │   ├── PlayerList.tsx        # 玩家列表
│   │   │   │   └── GameControls.tsx      # 游戏控制
│   │   │   ├── lib/             # 核心逻辑
│   │   │   │   ├── audio/                # 音频系统
│   │   │   │   ├── GameMaster.ts         # 游戏主控逻辑
│   │   │   │   ├── Player.ts             # 玩家类
│   │   │   │   └── PlayerAPIClient.ts    # API 客户端
│   │   │   └── stores/          # MobX 状态管理
│   │   └── game-logs/           # 游戏日志存储
│   └── player/                  # AI 玩家服务器
│       └── src/
│           ├── prompts/         # AI 提示模板
│           │   ├── personality/ # 性格提示
│           │   ├── speech/      # 发言提示
│           │   ├── voting/      # 投票提示
│           │   └── night/       # 夜间行动提示
│           └── services/        # AI 服务 + TTS 服务
├── shared/
│   ├── types/                   # 共享类型定义
│   │   ├── api.ts               # API 类型
│   │   ├── schemas.ts           # Zod 验证模式
│   │   └── gameLog.ts           # 游戏日志类型
│   ├── lib/                     # 共享工具库
│   │   ├── operationLog.ts      # 操作日志系统
│   │   └── speechSystem.ts      # 发言系统
│   └── prompts/                 # 共享提示模板
├── audio/                       # 音频资源
│   ├── bgm/                     # 背景音乐
│   └── sfx/                     # 音效
├── docker-compose.yml           # Docker Compose 配置
├── Dockerfile                   # Docker 镜像配置
└── nginx.conf                   # Nginx 配置
```

## 🚀 快速开始

### 前置要求

- **Docker** 20.10+
- **Docker Compose** 1.29+
- **MiniMax API Key**: 从 [MiniMax 开放平台](https://platform.minimaxi.com) 获取

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/MiniMax-OpenPlatform/minimax-werewolf.git
cd minimax-werewolf

# 2. 构建并启动 Docker 容器
docker compose up -d --build

# 3. 查看容器状态
docker compose ps

# 4. 查看日志
docker compose logs -f
```

### 访问游戏

1. 打开浏览器访问 **http://localhost:5001/werewolf**（本地部署）
   - 如果是服务器部署，访问 **http://YOUR_SERVER_IP:5001/werewolf**
2. 点击 **"🔑 配置 API Key"** 输入您的 MiniMax API Key
3. 点击 **"👤 配置玩家性格"** 自定义 AI 玩家个性（可选）
4. 点击 **"创建新游戏"** - 自动添加 6 个 AI 玩家并分配角色
5. 点击 **"开始游戏"** - 进入夜晚阶段
6. 点击 **"下一阶段"** 推进游戏流程

### Docker 管理命令

```bash
# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f ai-werewolf

# 进入容器
docker exec -it ai-werewolf-game sh

# 清理并重新构建
docker compose down -v
docker compose up -d --build
```

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

### 沉浸式模式 🎵

点击右上角的 **"沉浸模式"** 按钮，进入沉浸式游戏体验：

- 🎵 **动态背景音乐**: 根据游戏阶段（夜晚/白天/投票）自动切换 BGM
- 🔊 **TTS 语音播报**: AI 玩家发言时自动语音播报（需要 MiniMax TTS API）
- 🎨 **玩家圆形布局**: 模拟真实桌游场景
- 📊 **阶段指示器**: 实时显示当前游戏阶段
- 🎛️ **音频控制面板**: 可调节 BGM 和 TTS 音量

## 🤖 AI 玩家配置

### 默认玩家配置

| 玩家 | 性格特点 |
|------|----------|
| 玩家1 | 理性分析型，善于逻辑推理 |
| 玩家2 | 激进冒险型，主动出击 |
| 玩家3 | 谨慎保守型，倾向观察 |
| 玩家4 | 幽默风趣型，活跃气氛 |
| 玩家5 | 沉默寡言型，一针见血 |
| 玩家6 | 情绪化，容易受影响 |

### 自定义玩家性格

在游戏控制面板中：
1. 点击 **"配置玩家性格"**
2. 编辑每个玩家的性格描述
3. 点击 **"重置默认"** 恢复默认配置

## 📊 功能特性

### 1. 实时游戏界面

- **玩家列表**: 显示所有玩家状态、角色、性格
- **对话记录**: 查看玩家发言、内心独白
- **操作记录**: 实时显示游戏操作日志
- **游戏控制**: 创建游戏、开始游戏、推进阶段
- **沉浸式模式**: 背景音乐、TTS 语音、玩家圆形布局

### 2. AI 思考过程可视化

每条发言都包含：
- 💬 **公开发言**: 其他玩家可见的内容
- 💭 **内心独白**: AI 的思考过程和推理逻辑

### 3. 游戏历史与回放

- 📜 查看所有历史游戏
- 🔍 查看游戏详情（发言、投票、夜间行动）
- 📊 分析 AI 决策过程

### 4. 操作日志系统

实时记录所有游戏操作：
- 🎯 阶段切换
- 💬 玩家请求/响应
- 📊 游戏结果

### 5. 音频系统

- 🎵 **背景音乐**: 三种游戏阶段 BGM（夜晚/白天/投票）
- 🔊 **TTS 语音**: MiniMax TTS API 支持的语音播报
- 🎛️ **音量控制**: 独立控制 BGM 和 TTS 音量
- 🔇 **智能降噪**: TTS 播放时自动降低 BGM 音量

## 📊 监控与调试

### 健康检查

```bash
# 检查服务健康状态（本地部署）
curl http://localhost:5001/werewolf/health

# 服务器部署
curl http://YOUR_SERVER_IP:5001/werewolf/health
```

### 游戏日志存储

完整的游戏日志保存在容器内：

```
/app/game-logs/{gameId}.json
```

每个游戏日志包含：
- 游戏配置（玩家数、角色分配）
- 所有发言记录（含 thinking）
- 所有投票记录（含理由）
- 所有夜间行动
- 游戏事件（阶段切换、玩家死亡等）
- 游戏结果（胜利方、幸存玩家）

## 🎯 待完成功能

- [ ] 游戏结束时 AI 评分
- [ ] 遗言系统
- [ ] 狼队夜晚交流功能
- [ ] 添加守卫、猎人等角色
- [ ] 9 人游戏模式
- [ ] 提升 UI/UX
- [ ] 游戏录像回放
- [ ] AI 对战排行榜
- [ ] 更多背景音乐和音效
- [ ] 多语言支持

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

## 🔒 安全说明

- API Key 仅在浏览器会话中使用，不会被存储到服务器
- 避免在代码中硬编码 API Key
- Docker 容器以非特权用户运行
- 定期更新依赖包，修复安全漏洞

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

本项目基于 [AI-Werewolf](https://github.com/monad-developers/AI-Werewolf) 开源项目优化定制而来，感谢原作者的贡献！

在原项目基础上，我们进行了以下优化和定制：
- ✨ 添加了玩家个性化配置系统
- 📊 增强的游戏历史记录功能
- 💭 显示 AI 内心独白和思考过程
- 🎨 优化的 UI/UX 设计
- 🔧 更灵活的配置系统
- 🎵 沉浸式模式：背景音乐 + TTS 语音
- 🐳 Docker 一键部署

同时感谢以下开源项目和服务：
- [MiniMax AI](https://www.minimaxi.com) - 强大的 AI 大模型服务
- [Docker](https://www.docker.com) - 容器化部署平台
- [React](https://react.dev) - UI 框架
- [MobX](https://mobx.js.org) - 状态管理
- [Vite](https://vitejs.dev) - 前端构建工具

## 📞 联系方式

- GitHub Issues: [提交问题](https://github.com/MiniMax-OpenPlatform/minimax-werewolf/issues)
- GitHub Discussions: [讨论区](https://github.com/MiniMax-OpenPlatform/minimax-werewolf/discussions)

---

⭐ 如果这个项目对你有帮助，欢迎 Star！
