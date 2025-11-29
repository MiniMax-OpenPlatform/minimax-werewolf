import 'dotenv/config';

// 初始化 Langfuse OpenTelemetry (必须在其他导入之前)
import { initializeLangfuse, shutdownLangfuse, langfuse } from './services/langfuse';
initializeLangfuse();

import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { PlayerManager } from './PlayerManager';
import { ConfigLoader } from './config/PlayerConfig';
import { GameLogService } from './services/GameLogService';
import {
  VotingResponseSchema,
  SpeechResponseSchema,
  LastWordsResponseSchema
} from './validation';
import type {
  StartGameParams,
  PlayerContext,
  WitchContext,
  SeerContext,
  GameLog
} from '@ai-werewolf/types';

// 加载默认配置（用于创建玩家）
const configLoader = new ConfigLoader();
const defaultConfig = configLoader.getConfig();

// 验证配置
if (!configLoader.validateConfig()) {
  console.error('❌ 配置验证失败，程序退出');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// 创建 PlayerManager 实例
const playerManager = new PlayerManager(defaultConfig);

// 创建 GameLogService 实例
// 使用 /app/game-logs 目录（Docker容器内）或 ./game-logs（本地开发）
const logDir = process.env.NODE_ENV === 'production' ? '/app/game-logs' : path.join(process.cwd(), 'game-logs');
const gameLogService = new GameLogService(logDir);

// 配置端口
const PORT = parseInt(process.env.PORT || String(defaultConfig.server.port)) || 3001;
const HOST = defaultConfig.server.host || '0.0.0.0';

console.log('🎮 Multi-Player Service 启动配置:');
console.log(`  端口: ${PORT}`);
console.log(`  主机: ${HOST}`);
console.log();

// 辅助函数：在AI请求后刷新Langfuse数据
async function flushLangfuseData() {
  try {
    if (process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY) {
      await langfuse.flushAsync();
    }
  } catch (error) {
    console.error('❌ Langfuse刷新失败:', error);
  }
}

// ============================================
// 玩家管理 API
// ============================================

/**
 * 创建玩家
 * POST /api/players
 * Body: { playerId: number, personality?: string }
 */
app.post('/api/players', (req, res) => {
  try {
    const { playerId, personality } = req.body;

    if (!playerId || typeof playerId !== 'number') {
      return res.status(400).json({ error: 'Invalid playerId' });
    }

    const player = playerManager.createPlayer(playerId, personality);

    res.json({
      message: 'Player created successfully',
      playerId,
      personality: personality || defaultConfig.game.personality,
    });
  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

/**
 * 删除玩家
 * DELETE /api/players/:playerId
 */
app.delete('/api/players/:playerId', (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const deleted = playerManager.removePlayer(playerId);

    if (deleted) {
      res.json({ message: 'Player deleted successfully', playerId });
    } else {
      res.status(404).json({ error: 'Player not found', playerId });
    }
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

/**
 * 获取所有玩家列表
 * GET /api/players
 */
app.get('/api/players', (_req, res) => {
  try {
    const players = playerManager.getAllPlayersStatus();
    res.json({
      total: playerManager.getPlayerCount(),
      players,
    });
  } catch (error) {
    console.error('List players error:', error);
    res.status(500).json({ error: 'Failed to list players' });
  }
});

/**
 * 健康检查
 * GET /api/health
 */
app.get('/api/health', (_req, res) => {
  try {
    const health = playerManager.healthCheck();
    res.json({
      status: 'ok',
      ...health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
});

// ============================================
// 游戏日志 API
// ============================================

/**
 * 保存游戏日志
 * POST /api/game-logs
 */
app.post('/api/game-logs', (req, res) => {
  try {
    const gameLog: GameLog = req.body;

    if (!gameLog || !gameLog.gameId) {
      return res.status(400).json({ error: 'Invalid game log data' });
    }

    gameLogService.saveLog(gameLog);

    res.json({
      message: 'Game log saved successfully',
      gameId: gameLog.gameId,
    });
  } catch (error) {
    console.error('Save game log error:', error);
    res.status(500).json({ error: 'Failed to save game log' });
  }
});

/**
 * 获取所有游戏日志摘要
 * GET /api/game-logs
 */
app.get('/api/game-logs', (_req, res) => {
  try {
    const summaries = gameLogService.getAllLogSummaries();
    res.json({
      total: summaries.length,
      logs: summaries,
    });
  } catch (error) {
    console.error('Get game logs error:', error);
    res.status(500).json({ error: 'Failed to get game logs' });
  }
});

/**
 * 获取特定游戏日志
 * GET /api/game-logs/:gameId
 */
app.get('/api/game-logs/:gameId', (req, res) => {
  try {
    const gameId = req.params.gameId;
    const gameLog = gameLogService.loadLog(gameId);

    if (!gameLog) {
      return res.status(404).json({ error: 'Game log not found', gameId });
    }

    res.json(gameLog);
  } catch (error) {
    console.error('Get game log error:', error);
    res.status(500).json({ error: 'Failed to get game log' });
  }
});

/**
 * 删除游戏日志
 * DELETE /api/game-logs/:gameId
 */
app.delete('/api/game-logs/:gameId', (req, res) => {
  try {
    const gameId = req.params.gameId;
    const deleted = gameLogService.deleteLog(gameId);

    if (deleted) {
      res.json({ message: 'Game log deleted successfully', gameId });
    } else {
      res.status(404).json({ error: 'Game log not found', gameId });
    }
  } catch (error) {
    console.error('Delete game log error:', error);
    res.status(500).json({ error: 'Failed to delete game log' });
  }
});

// ============================================
// 全局配置 API
// ============================================

/**
 * 为所有玩家设置 API Key
 * POST /api/config/api-key
 */
app.post('/api/config/api-key', (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'Invalid API key' });
    }

    playerManager.setApiKeyForAll(apiKey);

    res.json({
      message: 'API key set for all players',
      affectedPlayers: playerManager.getPlayerCount(),
    });
  } catch (error) {
    console.error('Set API key error:', error);
    res.status(500).json({ error: 'Failed to set API key' });
  }
});

/**
 * 为所有玩家设置自定义规则
 * POST /api/config/rules
 */
app.post('/api/config/rules', (req, res) => {
  try {
    const { rules } = req.body;

    if (!rules || typeof rules !== 'string') {
      return res.status(400).json({ error: 'Invalid rules' });
    }

    playerManager.setCustomRulesForAll(rules);

    res.json({
      message: 'Custom rules set for all players',
      affectedPlayers: playerManager.getPlayerCount(),
    });
  } catch (error) {
    console.error('Set custom rules error:', error);
    res.status(500).json({ error: 'Failed to set custom rules' });
  }
});

// ============================================
// 单个玩家操作 API
// ============================================

/**
 * 开始游戏
 * POST /api/players/:playerId/start-game
 */
app.post('/api/players/:playerId/start-game', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const player = playerManager.getPlayer(playerId);
    const params: StartGameParams = req.body;

    await player.startGame(params);

    res.json({
      message: 'Game started successfully',
      playerId,
      langfuseEnabled: true,
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * 玩家发言
 * POST /api/players/:playerId/speak
 */
app.post('/api/players/:playerId/speak', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const player = playerManager.getPlayer(playerId);
    const context: PlayerContext = req.body;

    const speechResponse = await player.speak(context);
    await flushLangfuseData();

    const response = SpeechResponseSchema.parse(speechResponse);
    res.json(response);
  } catch (error) {
    console.error('Speak error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid response data', details: error });
    } else {
      res.status(500).json({ error: String(error) });
    }
  }
});

/**
 * 玩家投票
 * POST /api/players/:playerId/vote
 */
app.post('/api/players/:playerId/vote', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const player = playerManager.getPlayer(playerId);
    const context: PlayerContext = req.body;

    const voteResponse = await player.vote(context);
    await flushLangfuseData();

    const response = VotingResponseSchema.parse(voteResponse);
    res.json(response);
  } catch (error) {
    console.error('Vote error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid response data', details: error });
    } else {
      res.status(500).json({ error: String(error) });
    }
  }
});

/**
 * 使用技能
 * POST /api/players/:playerId/use-ability
 */
app.post('/api/players/:playerId/use-ability', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const player = playerManager.getPlayer(playerId);
    const context: PlayerContext | WitchContext | SeerContext = req.body;

    const result = await player.useAbility(context);
    await flushLangfuseData();

    res.json(result);
  } catch (error) {
    console.error('Use ability error:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * 遗言
 * POST /api/players/:playerId/last-words
 */
app.post('/api/players/:playerId/last-words', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const player = playerManager.getPlayer(playerId);

    const lastWords = await player.lastWords();
    await flushLangfuseData();

    const response = LastWordsResponseSchema.parse({ content: lastWords });
    res.json(response);
  } catch (error) {
    console.error('Last words error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid response data', details: error });
    } else {
      res.status(500).json({ error: String(error) });
    }
  }
});

/**
 * 玩家状态
 * GET /api/players/:playerId/status
 */
app.get('/api/players/:playerId/status', (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const player = playerManager.getPlayer(playerId);
    const status = player.getStatus();

    res.json(status);
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: String(error) });
  }
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`🚀 Multi-Player Service running on ${HOST}:${PORT}`);
  console.log(`📋 API Endpoints:`);
  console.log(`   POST   /api/players                    - 创建玩家`);
  console.log(`   GET    /api/players                    - 列出所有玩家`);
  console.log(`   DELETE /api/players/:playerId          - 删除玩家`);
  console.log(`   GET    /api/players/:playerId/status   - 玩家状态`);
  console.log(`   POST   /api/players/:playerId/speak    - 玩家发言`);
  console.log(`   POST   /api/players/:playerId/vote     - 玩家投票`);
  console.log(`   POST   /api/config/api-key             - 设置API Key`);
  console.log(`   POST   /api/config/rules               - 设置游戏规则`);
  console.log(`   POST   /api/game-logs                  - 保存游戏日志`);
  console.log(`   GET    /api/game-logs                  - 获取所有游戏日志`);
  console.log(`   GET    /api/game-logs/:gameId          - 获取特定游戏日志`);
  console.log(`   DELETE /api/game-logs/:gameId          - 删除游戏日志`);
  console.log(`   GET    /api/health                     - 健康检查`);
  console.log(`📁 Game logs directory: ${gameLogService.getLogDirectory()}`);
  console.log();
});

// 优雅关闭处理
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📊 收到 ${signal} 信号，正在关闭服务器...`);

  try {
    await shutdownLangfuse();
  } catch (error) {
    console.error('❌ Langfuse 关闭时出错:', error);
  }

  console.log('👋 服务器已关闭');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', async (error) => {
  console.error('💥 未捕获的异常:', error);
  await gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason, 'at:', promise);
  await gracefulShutdown('unhandledRejection');
});
