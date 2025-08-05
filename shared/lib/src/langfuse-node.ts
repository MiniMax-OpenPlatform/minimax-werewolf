/**
 * Langfuse Node.js 实现
 * 用于后端服务的完整 Langfuse 集成
 */

import { Langfuse, type LangfuseTraceClient } from 'langfuse';

// Langfuse 客户端实例
let langfuseClient: Langfuse | null = null;

// 存储当前 trace - 使用正确的类型
const traces = new Map<string, LangfuseTraceClient>();

/**
 * 获取 Langfuse 客户端实例
 */
function getLangfuseClient(): Langfuse | null {
  if (!langfuseClient && process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY) {
    langfuseClient = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com',
      flushAt: 1, // 立即发送事件，便于调试
      flushInterval: 1000, // 每秒刷新一次
    });
    console.log('✅ Langfuse 客户端已初始化');
  }
  return langfuseClient;
}

/**
 * 初始化 Langfuse
 */
export function initializeLangfuse() {
  const client = getLangfuseClient();
  if (client) {
    console.log('📊 Langfuse 已启用，将追踪 AI 请求');
    console.log(`  - Public Key: ${process.env.LANGFUSE_PUBLIC_KEY?.substring(0, 8)}...`);
    console.log(`  - Base URL: ${process.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com'}`);
  } else {
    console.log('⚠️  Langfuse 未启用（缺少必需的环境变量）');
  }
  return client;
}

/**
 * 创建游戏 trace
 */
export function createGameTrace(gameId: string): string {
  const client = getLangfuseClient();
  if (!client) {
    console.log(`📊 [模拟] Game trace: ${gameId}`);
    return gameId;
  }

  try {
    const trace = client.trace({
      id: gameId,
      name: `game-${gameId}`,
      metadata: {
        gameId,
        timestamp: new Date().toISOString(),
      },
    });
    
    traces.set(gameId, trace);
    console.log(`✅ 创建 Langfuse trace: ${gameId}`);
    return gameId;
  } catch (error) {
    console.error('❌ 创建 Langfuse trace 失败:', error);
    return gameId;
  }
}

/**
 * 关闭 Langfuse
 */
export async function shutdownLangfuse() {
  const client = getLangfuseClient();
  if (!client) {
    console.log('📊 Langfuse 未启用，无需关闭');
    return;
  }

  try {
    console.log('📊 正在刷新 Langfuse 数据...');
    await client.flushAsync();
    await client.shutdownAsync();
    console.log('✅ Langfuse 已优雅关闭');
  } catch (error) {
    console.error('❌ Langfuse 关闭时出错:', error);
  }
}

/**
 * Langfuse 错误处理包装器
 */
export function withLangfuseErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context?: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      console.error(`❌ Langfuse error in ${context || 'function'}:`, error);
      // 不要抛出错误，继续执行
      return undefined;
    }
  }) as T;
}

/**
 * 获取AI请求的遥测配置
 */
export function getAITelemetryConfig(
  gameId: string,
  playerName: string,
  traceId: string,
  functionId: string
): { langfusePrompt?: any; metadata: any; isEnabled?: boolean } | { isEnabled: false; metadata: any } {
  return withLangfuseErrorHandling(() => {
    const client = getLangfuseClient();
    if (!client) {
      return {
        isEnabled: false,
        metadata: {
          gameId,
          playerName,
          traceId,
          functionId,
          timestamp: new Date().toISOString()
        }
      };
    }

    // 获取或创建 trace
    let trace = traces.get(traceId);
    if (!trace) {
      trace = client.trace({
        id: traceId,
        name: `game-${gameId}`,
        metadata: {
          gameId,
          playerName,
        },
      });
      traces.set(traceId, trace);
    }

    // 创建 generation span
    const generation = trace.generation({
      name: functionId,
      input: {
        playerName,
        functionId,
      },
      metadata: {
        gameId,
        playerName,
        traceId,
        functionId,
        timestamp: new Date().toISOString()
      }
    });

    // 返回 Langfuse 配置对象，用于 Vercel AI SDK
    return {
      langfusePrompt: generation,
      metadata: {
        gameId,
        playerName,
        traceId,
        functionId,
        timestamp: new Date().toISOString()
      }
    };
  }, 'getAITelemetryConfig')();
}

// 导出 langfuse 对象，提供统一接口
export const langfuse = {
  async flushAsync() {
    const client = getLangfuseClient();
    if (client) {
      console.log('📊 刷新 Langfuse 数据...');
      await client.flushAsync();
    } else {
      console.log('📊 Langfuse 未启用，跳过刷新');
    }
  }
};