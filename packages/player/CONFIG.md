# Player 配置文件说明

## 概述

Player服务器现在支持通过配置文件来自定义AI玩家的行为、个性和服务器设置。这使得你可以创建具有不同特点的AI玩家来进行游戏。

## 使用方法

### 命令行启动

```bash
# 使用默认配置
pnpm dev:player

# 使用指定配置文件
pnpm dev:player --config=configs/aggressive.json
pnpm run dev:player:aggressive    # 快捷方式

# 生产环境
pnpm build
node dist/index.js --config=configs/default.json
```

### 可用的预设配置

- `configs/default.json` - 默认平衡型玩家
- `configs/aggressive.json` - 激进攻击型玩家  
- `configs/conservative.json` - 保守稳重型玩家
- `configs/witty.json` - 风趣幽默型玩家

### 快捷启动脚本

```bash
pnpm dev:player:default      # 使用默认配置
pnpm dev:player:aggressive   # 激进型玩家
pnpm dev:player:conservative # 保守型玩家  
pnpm dev:player:witty        # 幽默型玩家
```

## 配置文件结构

```json
{
  "server": {
    "port": 3001,        // 服务器端口
    "host": "0.0.0.0"    // 监听主机
  },
  "ai": {
    "model": "anthropic/claude-3-haiku",  // AI模型
    "maxTokens": 150,                     // 最大token数
    "temperature": 0.8,                   // 创造性参数(0-2)
    "provider": "openrouter"              // AI提供商
  },
  "game": {
    "name": "智能分析师",                  // 玩家显示名称
    "personality": "理性分析型玩家...",     // 个性描述
    "strategy": "balanced",               // 策略类型
    "speakingStyle": "casual"             // 说话风格
  },
  "logging": {
    "level": "info",     // 日志级别
    "enabled": true      // 是否启用日志
  }
}
```

## 配置选项详解

### 服务器配置 (server)

- `port` (number): 服务器监听端口，默认3001
- `host` (string): 监听地址，默认"0.0.0.0"

### AI配置 (ai)

- `model` (string): AI模型名称
  - OpenRouter: `anthropic/claude-3-haiku`, `anthropic/claude-3.5-sonnet`, `openai/gpt-4`等
  - OpenAI: `gpt-3.5-turbo`, `gpt-4`等
- `maxTokens` (number): 单次生成最大token数，范围10-2000
- `temperature` (number): 创造性参数，范围0-2，越高越有创意
- `provider` (string): AI提供商，"openrouter"或"openai"
- `apiKey` (string, 可选): API密钥，通常通过环境变量设置

### 游戏配置 (game)

- `name` (string): 玩家在游戏中的显示名称
- `personality` (string): 详细的个性描述，影响AI的发言风格
- `strategy` (string): 游戏策略类型
  - `"aggressive"`: 积极主动，敢于质疑和攻击
  - `"conservative"`: 谨慎稳重，多观察少发言
  - `"balanced"`: 平衡理性，灵活应对
- `speakingStyle` (string): 说话风格
  - `"formal"`: 正式严谨，逻辑清晰
  - `"casual"`: 轻松随意，贴近日常对话
  - `"witty"`: 风趣幽默，善用比喻

### 日志配置 (logging)

- `level` (string): 日志级别，"debug", "info", "warn", "error"
- `enabled` (boolean): 是否启用日志输出

## 环境变量覆盖

配置文件中的设置可以被环境变量覆盖：

```bash
# AI配置
export AI_MODEL="openai/gpt-4"
export AI_MAX_TOKENS=200
export AI_TEMPERATURE=0.9
export OPENROUTER_API_KEY="your_key"
export OPENAI_API_KEY="your_key"

# 服务器配置
export PORT=3005
export HOST="127.0.0.1"

# 游戏配置
export PLAYER_NAME="我的AI玩家"
export PLAYER_PERSONALITY="善于分析的理性玩家"
export PLAYER_STRATEGY="aggressive"
export PLAYER_SPEAKING_STYLE="formal"

# 日志配置
export LOG_LEVEL="debug"
export LOG_ENABLED="true"
```

## 自定义配置文件

你可以创建自己的配置文件：

```json
{
  "server": {
    "port": 3005,
    "host": "0.0.0.0"
  },
  "ai": {
    "model": "anthropic/claude-3.5-sonnet",
    "maxTokens": 200,
    "temperature": 0.7,
    "provider": "openrouter"
  },
  "game": {
    "name": "推理大师",
    "personality": "逻辑推理能力极强，善于从细节中发现线索，说话简洁有力",
    "strategy": "balanced", 
    "speakingStyle": "formal"
  },
  "logging": {
    "level": "info",
    "enabled": true
  }
}
```

保存为 `configs/detective.json`，然后启动：

```bash
pnpm dev:player --config=configs/detective.json
```

## 多玩家部署

通过配置不同端口，可以同时运行多个AI玩家：

```bash
# 终端1: 激进型玩家 (端口3002)
pnpm dev:player:aggressive

# 终端2: 保守型玩家 (端口3003)  
pnpm dev:player:conservative

# 终端3: 幽默型玩家 (端口3004)
pnpm dev:player:witty
```

## 故障排除

### 配置文件加载失败
- 检查文件路径是否正确
- 确认JSON格式是否有效
- 查看控制台的错误信息

### AI API调用失败
- 检查API密钥是否正确设置
- 确认网络连接正常
- AI服务会自动降级到预设回复

### 端口被占用
- 修改配置文件中的端口号
- 或通过环境变量 `PORT=3005` 覆盖

## 示例场景

### 测试不同策略
```bash
# 同时启动三种策略的玩家进行对比测试
pnpm dev:player:aggressive &    # 后台运行激进玩家
pnpm dev:player:conservative &  # 后台运行保守玩家  
pnpm dev:player:witty          # 前台运行幽默玩家
```

### 自定义角色扮演
创建角色特定的配置文件，比如`configs/detective.json`用于扮演侦探角色，`configs/newbie.json`用于扮演新手玩家等。