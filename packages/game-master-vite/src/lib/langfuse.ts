/**
 * Langfuse 前端集成
 * 用于 Game Master 的 Langfuse Web SDK
 */

import { LangfuseWeb } from 'langfuse';

// Langfuse Web 客户端实例
let langfuseClient: LangfuseWeb | null = null;

/**
 * 获取或创建 Langfuse Web 客户端
 */
function getLangfuseClient(): LangfuseWeb | null {
  if (!langfuseClient && import.meta.env.VITE_LANGFUSE_PUBLIC_KEY) {
    langfuseClient = new LangfuseWeb({
      publicKey: import.meta.env.VITE_LANGFUSE_PUBLIC_KEY,
      baseUrl: import.meta.env.VITE_LANGFUSE_BASEURL || 'https://cloud.langfuse.com',
    });
    console.log('✅ Langfuse Web 客户端已初始化');
  }
  return langfuseClient;
}

/**
 * 初始化 Langfuse Web
 */
export function initializeLangfuse() {
  const client = getLangfuseClient();
  if (client) {
    console.log('📊 Langfuse Web 已启用');
    console.log(`  - Public Key: ${import.meta.env.VITE_LANGFUSE_PUBLIC_KEY?.substring(0, 8)}...`);
    console.log(`  - Base URL: ${import.meta.env.VITE_LANGFUSE_BASEURL || 'https://cloud.langfuse.com'}`);
  } else {
    console.log('⚠️  Langfuse Web 未启用（缺少 VITE_LANGFUSE_PUBLIC_KEY）');
  }
  return client;
}

/**
 * 创建游戏 trace（前端只记录 gameId，实际 trace 由后端创建）
 */
export function createGameTrace(gameId: string): string {
  const client = getLangfuseClient();
  if (client) {
    console.log(`📊 游戏已开始，ID: ${gameId}`);
    console.log(`📊 Langfuse Web 客户端准备记录用户反馈`);
  } else {
    console.log(`📊 [模拟] Game ID: ${gameId}`);
  }
  return gameId;
}

/**
 * 记录用户反馈评分
 */
export function scoreUserFeedback(traceId: string, score: number, comment?: string) {
  const client = getLangfuseClient();
  if (!client) {
    console.log(`📊 [模拟] 用户反馈: ${traceId}, 评分: ${score}, 评论: ${comment || '无'}`);
    return;
  }

  try {
    client.score({
      traceId,
      name: 'user-feedback',
      value: score,
      comment,
    });
    console.log(`✅ 记录用户反馈: ${traceId}, 评分: ${score}`);
  } catch (error) {
    console.error('❌ 记录用户反馈失败:', error);
  }
}

/**
 * 记录游戏结果
 */
export function scoreGameResult(traceId: string, winner: 'werewolf' | 'villager', rounds: number) {
  const client = getLangfuseClient();
  if (!client) {
    console.log(`📊 [模拟] 游戏结果: ${traceId}, 胜者: ${winner}, 回合数: ${rounds}`);
    return;
  }

  try {
    // 记录胜者
    client.score({
      traceId,
      name: 'game-winner',
      value: winner === 'werewolf' ? 1 : 0,
      comment: `${winner} 阵营获胜`,
    });

    // 记录回合数
    client.score({
      traceId,
      name: 'game-rounds',
      value: rounds,
      comment: `游戏进行了 ${rounds} 回合`,
    });

    console.log(`✅ 记录游戏结果: ${traceId}, 胜者: ${winner}, 回合数: ${rounds}`);
  } catch (error) {
    console.error('❌ 记录游戏结果失败:', error);
  }
}

/**
 * 关闭 Langfuse Web（浏览器环境下通常不需要）
 */
export async function shutdownLangfuse() {
  // 浏览器环境下通常不需要显式关闭
  console.log('📊 Langfuse Web 客户端将在页面卸载时自动清理');
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

// 导出 langfuse 对象，提供统一接口（浏览器环境下为空操作）
export const langfuse = {
  async flushAsync() {
    console.log('📊 Langfuse Web 在浏览器环境下自动管理数据发送');
  }
};