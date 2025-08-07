import 'dotenv/config';

// 初始化 Langfuse OpenTelemetry (必须在其他导入之前)
import { initializeLangfuse, shutdownLangfuse, langfuse } from './services/langfuse';
initializeLangfuse();

import express from 'express';
import cors from 'cors';
import { PlayerServer } from './PlayerServer';
import { ConfigLoader } from './config/PlayerConfig';
import {
  VotingResponseSchema,
  SpeechResponseSchema,
  LastWordsResponseSchema
} from './validation';
import type { 
  StartGameParams, 
  PlayerContext, 
  WitchContext, 
  SeerContext 
} from '@ai-werewolf/types';

// 解析命令行参数
const args = process.argv.slice(2);
const configArg = args.find(arg => arg.startsWith('--config='));
const configPath = configArg ? configArg.split('=')[1] : undefined;

// 加载配置
const configLoader = new ConfigLoader(configPath);
const config = configLoader.getConfig();

// 验证配置
if (!configLoader.validateConfig()) {
  console.error('❌ 配置验证失败，程序退出');
  process.exit(1);
}

// 打印配置信息
configLoader.printConfig();

// 调试：打印Langfuse环境变量
console.log('\n🔍 Langfuse环境变量调试:');
console.log(`  LANGFUSE_SECRET_KEY: ${process.env.LANGFUSE_SECRET_KEY ? '已设置 (长度: ' + process.env.LANGFUSE_SECRET_KEY.length + ')' : '未设置'}`);
console.log(`  LANGFUSE_PUBLIC_KEY: ${process.env.LANGFUSE_PUBLIC_KEY ? '已设置 (长度: ' + process.env.LANGFUSE_PUBLIC_KEY.length + ')' : '未设置'}`);
console.log(`  LANGFUSE_BASEURL: ${process.env.LANGFUSE_BASEURL || '未设置 (将使用默认值)'}`);
console.log();

const app = express();
app.use(cors());
app.use(express.json());

const playerServer = new PlayerServer(config);
const port = config.server.port;
const host = config.server.host;

// 辅助函数：在AI请求后刷新Langfuse数据
async function flushLangfuseData() {
  try {
    if (process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY) {
      await langfuse.flushAsync();
      if (config.logging.enabled) {
        console.log('📊 Langfuse数据已刷新');
      }
    }
  } catch (error) {
    console.error('❌ Langfuse刷新失败:', error);
  }
}

app.post('/api/player/start-game', async (req, res) => {
  try {
    console.log('\n=== START GAME REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // 直接使用 StartGameParams 类型，不验证输入
    const params: StartGameParams = req.body;
    // 直接使用params，不需要解构
    
    await playerServer.startGame(params);
    
    const response = {
      message: 'Game started successfully',
      langfuseEnabled: true // 总是启用，使用gameId作为trace
    };
    
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('=== END START GAME REQUEST ===\n');
    
    res.json(response);
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

app.post('/api/player/speak', async (req, res) => {
  try {
    console.log('\n=== SPEAK REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // 直接使用 PlayerContext 类型，不验证输入
    const context: PlayerContext = req.body;
    
    const speech = await playerServer.speak(context);
    
    // 刷新Langfuse数据
    await flushLangfuseData();
    
    const response = SpeechResponseSchema.parse({ speech });
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('=== END SPEAK REQUEST ===\n');
    
    res.json(response);
  } catch (error) {
    console.error('Speak error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid response data', details: error });
    } else {
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  }
});

app.post('/api/player/vote', async (req, res) => {
  try {
    console.log('\n=== VOTE REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // 直接使用 PlayerContext 类型，不验证输入
    const context: PlayerContext = req.body;
    
    const voteResponse = await playerServer.vote(context);
    
    // 刷新Langfuse数据
    await flushLangfuseData();
    
    const response = VotingResponseSchema.parse(voteResponse);
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('=== END VOTE REQUEST ===\n');
    
    res.json(response);
  } catch (error) {
    console.error('Vote error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid response data', details: error });
    } else {
      res.status(500).json({ error: 'Failed to generate vote' });
    }
  }
});

app.post('/api/player/use-ability', async (req, res) => {
  try {
    console.log('\n=== USE ABILITY REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // 直接使用类型，不验证输入 (可能是 PlayerContext, WitchContext, 或 SeerContext)
    const context: PlayerContext | WitchContext | SeerContext = req.body;
    
    const result = await playerServer.useAbility(context);
    
    // 刷新Langfuse数据
    await flushLangfuseData();
    
    // 直接返回结果，不包装在 { result } 中
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('=== END USE ABILITY REQUEST ===\n');
    
    res.json(result);
  } catch (error) {
    console.error('Use ability error:', error);
    res.status(500).json({ error: 'Failed to use ability' });
  }
});

app.post('/api/player/last-words', async (req, res) => {
  try {
    console.log('\n=== LAST WORDS REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const lastWords = await playerServer.lastWords();
    
    // 刷新Langfuse数据
    await flushLangfuseData();
    
    const response = LastWordsResponseSchema.parse({ content: lastWords });
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('=== END LAST WORDS REQUEST ===\n');
    
    res.json(response);
  } catch (error) {
    console.error('Last words error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid response data', details: error });
    } else {
      res.status(500).json({ error: 'Failed to generate last words' });
    }
  }
});

app.post('/api/player/status', (_req, res) => {
  try {
    const status = playerServer.getStatus();
    const validatedStatus = status; // 不需要validation，直接返回status对象
    res.json(validatedStatus);
  } catch (error) {
    console.error('Status error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(500).json({ error: 'Invalid status data', details: error });
    } else {
      res.status(500).json({ error: 'Failed to get status' });
    }
  }
});

app.listen(port, host, () => {
  console.log(`🚀 Player server running on ${host}:${port}`);
  if (configPath) {
    console.log(`📋 使用配置文件: ${configPath}`);
  }
});

// 优雅关闭处理，确保 Langfuse 数据被正确刷新
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📊 收到 ${signal} 信号，正在关闭服务器并刷新 Langfuse 数据...`);
  
  try {
    // 刷新 Langfuse 追踪数据
    await shutdownLangfuse();
  } catch (error) {
    console.error('❌ Langfuse 关闭时出错:', error);
  }
  
  console.log('👋 服务器已关闭');
  process.exit(0);
};

// 监听进程信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 处理未捕获的异常
process.on('uncaughtException', async (error) => {
  console.error('💥 未捕获的异常:', error);
  await gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason, 'at:', promise);
  await gracefulShutdown('unhandledRejection');
});