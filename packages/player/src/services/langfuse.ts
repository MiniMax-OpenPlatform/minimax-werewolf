/**
 * Langfuse 后端服务
 * 用于 AI Player 的 Langfuse 集成
 * 
 * 层级结构:
 * Session (整个游戏) 
 * ├── Trace (round-1-day: 第1轮白天)
 * │   └── Generation (AI调用: 玩家发言)
 * ├── Trace (round-1-voting: 第1轮投票)
 * │   └── Generation (AI调用: 玩家投票)
 * ├── Trace (round-1-night: 第1轮夜晚)
 * │   └── Generation (AI调用: 玩家能力使用)
 * └── Event (关键事件: 投票结果, 游戏结束等)
 */

import { 
  Langfuse, 
  type LangfuseTraceClient
} from 'langfuse';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseExporter } from 'langfuse-vercel';
import type { PlayerContext, GamePhase } from '@ai-werewolf/types';

// Langfuse 客户端实例
let langfuseClient: Langfuse | null = null;

// OpenTelemetry SDK 实例
let otelSdk: NodeSDK | null = null;

// 会话管理
const sessions = new Map<string, any>(); // gameId -> Session

// Trace管理 - 每个阶段一个独立的trace (round-1-day, round-1-voting, round-1-night)
const traces = new Map<string, LangfuseTraceClient>(); // traceId -> Trace

// 当前活跃的阶段trace
const activePhaseTrace = new Map<string, string>(); // gameId-phase -> current traceId

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
 * 初始化 Langfuse 和 OpenTelemetry
 */
export function initializeLangfuse() {
  const client = getLangfuseClient();
  
  // 初始化 OpenTelemetry SDK with LangfuseExporter
  if (client && process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY) {
    try {
      otelSdk = new NodeSDK({
        serviceName: 'ai-werewolf-player',
        traceExporter: new LangfuseExporter({
          secretKey: process.env.LANGFUSE_SECRET_KEY,
          publicKey: process.env.LANGFUSE_PUBLIC_KEY,
          baseUrl: process.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com',
        }),
      });
      
      otelSdk.start();
      console.log('✅ OpenTelemetry SDK with LangfuseExporter 已初始化');
    } catch (error) {
      console.error('❌ OpenTelemetry SDK 初始化失败:', error);
    }
  }
  
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
 * 创建游戏会话 (Session)
 * 一个游戏对应一个session，包含多个trace(阶段)
 */
export function createGameSession(gameId: string, metadata?: any): string {
  const client = getLangfuseClient();
  if (!client) {
    console.log(`📊 [模拟] Game session: ${gameId}`);
    return gameId;
  }

  try {
    // 在Langfuse中，session是通过sessionId关联的
    // 我们需要在创建trace时指定sessionId
    sessions.set(gameId, {
      sessionId: gameId,
      startTime: new Date(),
      metadata: {
        ...metadata,
        gameId,
        timestamp: new Date().toISOString(),
      }
    });
    
    console.log(`✅ 创建 Langfuse session: ${gameId}`);
    return gameId;
  } catch (error) {
    console.error('❌ 创建 Langfuse session 失败:', error);
    return gameId;
  }
}

/**
 * 结束游戏会话
 */
export function endGameSession(gameId: string, result?: any): void {
  const session = sessions.get(gameId);
  if (!session) return;

  try {
    // 记录游戏结束事件
    logEvent(gameId, 'game-end', {
      result,
      duration: Date.now() - session.startTime.getTime(),
      timestamp: new Date().toISOString()
    });

    // 清理会话数据
    sessions.delete(gameId);
    activePhaseTrace.delete(gameId);
    
    console.log(`✅ 结束 Langfuse session: ${gameId}`);
  } catch (error) {
    console.error('❌ 结束 Langfuse session 失败:', error);
  }
}

/**
 * 创建阶段 Trace (round-1-day, round-1-voting, round-1-night等)
 * 每个阶段创建一个独立的trace
 */
export function createPhaseTrace(
  gameId: string, 
  round: number,
  phase: 'day' | 'voting' | 'night'
): string {
  const client = getLangfuseClient();
  const traceId = `${gameId}-round-${round}-${phase}`;
  
  if (!client) {
    console.log(`📊 [模拟] Phase trace: ${traceId}`);
    return traceId;
  }

  const session = sessions.get(gameId);
  if (!session) {
    console.warn(`⚠️ Session not found for game: ${gameId}`);
    createGameSession(gameId); // 自动创建session
  }
  
  try {
    const trace = client.trace({
      id: traceId,
      name: `round-${round}-${phase}`,
      sessionId: gameId, // 关联到游戏session
      metadata: {
        gameId,
        round,
        phase,
        timestamp: new Date().toISOString(),
      },
    });
    
    traces.set(traceId, trace);
    activePhaseTrace.set(`${gameId}-${phase}`, traceId); // 按 phase 存储活跃 trace
    
    console.log(`✅ 创建 Phase trace: ${traceId}`);
    return traceId;
  } catch (error) {
    console.error('❌ 创建 Phase trace 失败:', error);
    return traceId;
  }
}

/**
 * 结束阶段 Trace
 */
export function endPhaseTrace(traceId: string): void {
  const trace = traces.get(traceId);
  if (!trace) return;

  try {
    // Langfuse trace会自动计算duration
    traces.delete(traceId);
    console.log(`✅ 结束 Phase trace: ${traceId}`);
  } catch (error) {
    console.error('❌ 结束 Phase trace 失败:', error);
  }
}

/**
 * 记录关键事件 (投票结果、游戏事件等)
 */
export function logEvent(
  parentId: string, // traceId
  eventName: string,
  data: any
): void {
  const client = getLangfuseClient();
  if (!client) {
    console.log(`📊 [模拟] Event: ${eventName}`, data);
    return;
  }

  try {
    // 尝试找到父级 trace
    let parent = traces.get(parentId);
    
    // 如果没找到，尝试从 activePhaseTrace 中查找
    if (!parent) {
      for (const [key, traceId] of activePhaseTrace.entries()) {
        if (key.startsWith(parentId)) {
          parent = traces.get(traceId);
          break;
        }
      }
    }

    if (parent) {
      parent.event({
        name: eventName,
        input: data,
      });
      console.log(`✅ 记录 Event: ${eventName}`);
    } else {
      console.warn(`⚠️ Parent not found for event: ${eventName}`);
    }
  } catch (error) {
    console.error('❌ 记录 Event 失败:', error);
  }
}

/**
 * 从 PlayerContext 获取阶段信息
 */
function getPhaseFromContext(context: PlayerContext): 'day' | 'voting' | 'night' | null {
  switch (context.currentPhase) {
    case 'day' as GamePhase:
      return 'day';
    case 'voting' as GamePhase:
      return 'voting';
    case 'night' as GamePhase:
      return 'night';
    default:
      return null;
  }
}

/**
 * 获取或创建当前阶段的 Trace
 */
export function ensurePhaseTrace(
  gameId: string,
  context?: PlayerContext
): string | null {
  if (!context) {
    console.warn(`⚠️ No context provided for phase trace`);
    return null;
  }
  
  const phase = getPhaseFromContext(context);
  if (!phase) {
    console.warn(`⚠️ Unknown phase: ${context.currentPhase}`);
    return null;
  }
  
  const key = `${gameId}-${phase}`;
  let traceId = activePhaseTrace.get(key);
  
  // 如果不存在，创建新的
  if (!traceId) {
    traceId = createPhaseTrace(gameId, context.round, phase);
  }
  
  return traceId;
}

/**
 * 获取AI请求的遥测配置
 * 返回 experimental_telemetry 配置，让 Vercel AI SDK 自动创建 generation
 */
export interface AITelemetryContext {
  gameId: string;
  playerId: number;
  functionId: string;
  context?: PlayerContext;  // 包含 round 和 currentPhase
}

export function getAITelemetryConfig(
  telemetryContext: AITelemetryContext
): { isEnabled: boolean; functionId?: string; metadata?: any } | false {
  return withLangfuseErrorHandling(() => {
    const client = getLangfuseClient();
    
    if (!client) {
      return false;
    }
    
    const { gameId, playerId, functionId, context } = telemetryContext;
    
    // 获取或创建当前阶段的 Trace
    const traceId = ensurePhaseTrace(gameId, context);
    if (!traceId) {
      return false;
    }
    
    // 返回 experimental_telemetry 配置
    return {
      isEnabled: true,
      functionId: `player-${playerId}-${functionId}`,
      metadata: {
        langfuseTraceId: traceId,  // 链接到阶段 trace
        langfuseUpdateParent: false, // 不更新父 trace
        gameId,
        playerId,
        phase: context?.currentPhase,
        round: context?.round,
        timestamp: new Date().toISOString()
      }
    };
  }, 'getAITelemetryConfig')();
}


/**
 * 关闭 Langfuse 和 OpenTelemetry
 */
export async function shutdownLangfuse() {
  // 关闭 OpenTelemetry SDK
  if (otelSdk) {
    try {
      await otelSdk.shutdown();
      console.log('✅ OpenTelemetry SDK 已关闭');
    } catch (error) {
      console.error('❌ OpenTelemetry SDK 关闭时出错:', error);
    }
  }
  
  const client = getLangfuseClient();
  if (!client) {
    console.log('📊 Langfuse 未启用，无需关闭');
    return;
  }

  try {
    // 清理所有traces
    traces.clear();
    
    // 清理所有sessions
    sessions.clear();
    
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
      return undefined;
    }
  }) as T;
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