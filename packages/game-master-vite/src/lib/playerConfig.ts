// Browser-compatible player configuration

/**
 * 获取 Player Service 的基础 URL
 * 新架构：所有玩家通过单一服务访问
 */
export function getPlayerServiceUrl(): string {
  // 优先使用环境变量配置
  const customUrl = import.meta.env.VITE_PLAYER_SERVICE_URL;

  if (customUrl) {
    return customUrl;
  }

  // 默认配置：
  // 开发环境使用 localhost:3001
  // 生产环境（Docker）使用相对路径通过nginx代理
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  // 生产环境：使用 /werewolf 前缀，通过nginx代理到后端
  return '/werewolf';
}

/**
 * 旧版本兼容：获取玩家URL列表
 * @deprecated 使用 getPlayerServiceUrl() 替代
 */
export function getPlayerUrls(): string[] {
  console.warn('getPlayerUrls() is deprecated. Use getPlayerServiceUrl() instead.');

  const baseUrl = getPlayerServiceUrl();

  // 返回兼容格式，但实际上都指向同一个服务
  // 通过 playerId 参数区分不同玩家
  return [
    baseUrl,
    baseUrl,
    baseUrl,
    baseUrl,
    baseUrl,
    baseUrl,
  ];
}
