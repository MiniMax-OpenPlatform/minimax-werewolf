/**
 * Langfuse Web SDK 实现
 * 用于前端（浏览器）的 Langfuse 集成，主要用于收集用户反馈和评分
 */

import { LangfuseWeb } from 'langfuse';

// Langfuse Web 客户端实例
let langfuseWebClient: LangfuseWeb | null = null;

/**
 * 获取 Langfuse Web 客户端实例
 */
function getLangfuseWebClient(): LangfuseWeb | null {
  // 只在浏览器环境中初始化，且需要 public key
  const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;
  const publicKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY : undefined;
  
  if (isBrowser && publicKey) {
    if (!langfuseWebClient) {
      langfuseWebClient = new LangfuseWeb({
        publicKey: publicKey,
        baseUrl: (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LANGFUSE_BASEURL : undefined) || 'https://cloud.langfuse.com',
      });
      console.log('✅ Langfuse Web 客户端已初始化');
    }
  }
  return langfuseWebClient;
}

/**
 * 初始化 Langfuse Web
 */
export function initializeLangfuse() {
  const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;
  if (!isBrowser) {
    console.log('📊 Langfuse Web 只能在浏览器环境中使用');
    return null;
  }

  const client = getLangfuseWebClient();
  if (client) {
    console.log('📊 Langfuse Web 已启用，可收集用户反馈');
    console.log(`  - Public Key: ${process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY?.substring(0, 8)}...`);
    console.log(`  - Base URL: ${process.env.NEXT_PUBLIC_LANGFUSE_BASEURL || 'https://cloud.langfuse.com'}`);
  } else {
    console.log('⚠️  Langfuse Web 未启用（缺少 NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY）');
  }
  return client;
}

/**
 * 创建游戏 trace（前端主要用于记录，不创建实际 trace）
 */
export function createGameTrace(gameId: string): string {
  console.log(`📊 [Web] Game trace registered: ${gameId}`);
  return gameId;
}

/**
 * 记录用户反馈评分
 * @param traceId 追踪 ID
 * @param score 评分（1-10）
 * @param comment 用户评论（可选）
 * @param name 评分类型名称
 */
export function scoreUserFeedback(
  traceId: string,
  score: number,
  comment?: string,
  name: string = 'user-satisfaction'
) {
  const client = getLangfuseWebClient();
  if (!client) {
    console.log(`📊 [Web模拟] 用户反馈 - ${name}: ${score}, 评论: ${comment || '无'}`);
    return;
  }

  try {
    client.score({
      traceId,
      name,
      value: score,
      comment,
    });
    console.log(`✅ 用户反馈已记录 - ${name}: ${score}`);
  } catch (error) {
    console.error('❌ 记录用户反馈失败:', error);
  }
}

/**
 * 记录游戏结果评分
 * @param traceId 追踪 ID
 * @param result 游戏结果（win/lose）
 * @param playerSatisfaction 玩家满意度（1-10）
 */
export function scoreGameResult(
  traceId: string,
  result: 'win' | 'lose',
  playerSatisfaction?: number
) {
  const client = getLangfuseWebClient();
  if (!client) {
    console.log(`📊 [Web模拟] 游戏结果 - 结果: ${result}, 满意度: ${playerSatisfaction}`);
    return;
  }

  try {
    // 记录游戏结果
    client.score({
      traceId,
      name: 'game-result',
      value: result === 'win' ? 1 : 0,
      comment: `游戏结果: ${result}`,
    });

    // 记录玩家满意度（如果提供）
    if (playerSatisfaction !== undefined) {
      client.score({
        traceId,
        name: 'player-satisfaction',
        value: playerSatisfaction,
        comment: '玩家对游戏体验的满意度',
      });
    }

    console.log(`✅ 游戏结果已记录 - 结果: ${result}`);
  } catch (error) {
    console.error('❌ 记录游戏结果失败:', error);
  }
}

/**
 * 关闭 Langfuse Web（清理资源）
 */
export async function shutdownLangfuse() {
  // Langfuse Web SDK 通常不需要显式关闭
  console.log('📊 Langfuse Web 资源已释放');
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
      console.error(`❌ Langfuse Web error in ${context || 'function'}:`, error);
      // 前端环境下，记录错误但不阻断执行
      return undefined;
    }
  }) as T;
}

/**
 * 获取AI请求的遥测配置（前端版本，主要用于日志记录）
 */
export function getAITelemetryConfig(
  gameId: string,
  playerName: string,
  traceId: string,
  functionId: string
): { isEnabled: boolean; metadata: any } {
  return withLangfuseErrorHandling(() => {
    // 前端不直接配置 AI 遥测，主要用于日志记录
    return {
      isEnabled: false, // 前端不启用 AI 遥测
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
    // Langfuse Web SDK 通常自动处理数据发送
    console.log('📊 Langfuse Web 数据自动同步');
  }
};