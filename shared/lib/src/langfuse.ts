/**
 * Langfuse 统一导出
 * 根据运行环境自动选择合适的实现：
 * - Node.js 环境：使用完整的 Langfuse SDK  
 * - 浏览器环境：使用 Langfuse Web SDK
 */

// 检测运行环境
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// 导入两种实现
import * as langfuseNode from './langfuse-node';
import * as langfuseWeb from './langfuse-web';

// 根据环境选择实现
const langfuseImpl = isNode ? langfuseNode : langfuseWeb;

// 重新导出所选实现的函数
export const initializeLangfuse = langfuseImpl.initializeLangfuse;
export const createGameTrace = langfuseImpl.createGameTrace;
export const shutdownLangfuse = langfuseImpl.shutdownLangfuse;
export const withLangfuseErrorHandling = langfuseImpl.withLangfuseErrorHandling;
export const getAITelemetryConfig = langfuseImpl.getAITelemetryConfig;
export const langfuse = langfuseImpl.langfuse;

// Web 环境特有函数（条件导出）
export const scoreUserFeedback = !isNode ? (langfuseImpl as typeof langfuseWeb).scoreUserFeedback : undefined;
export const scoreGameResult = !isNode ? (langfuseImpl as typeof langfuseWeb).scoreGameResult : undefined;