import { PlayerServer } from './PlayerServer';
import { PlayerConfig } from './config/PlayerConfig';

/**
 * PlayerManager 负责管理多个 PlayerServer 实例
 * 支持动态创建、删除和获取玩家
 */
export class PlayerManager {
  private players: Map<number, PlayerServer> = new Map();
  private configs: Map<number, PlayerConfig> = new Map();
  private defaultConfig: PlayerConfig;
  private globalApiKey?: string;
  private globalCustomRules?: string;

  constructor(defaultConfig: PlayerConfig) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * 创建一个新玩家
   * @param playerId 玩家ID
   * @param personality 可选的个性化配置
   */
  createPlayer(playerId: number, personality?: string): PlayerServer {
    if (this.players.has(playerId)) {
      console.log(`⚠️  Player ${playerId} already exists, returning existing instance`);
      return this.players.get(playerId)!;
    }

    // 创建玩家配置（如果提供了 personality，覆盖默认配置）
    const config: PlayerConfig = {
      ...this.defaultConfig,
      game: {
        ...this.defaultConfig.game,
        personality: personality || this.defaultConfig.game.personality,
      }
    };

    // 创建 PlayerServer 实例
    const player = new PlayerServer(config);
    this.players.set(playerId, player);
    this.configs.set(playerId, config);

    // 如果有全局 API key，自动应用到新玩家
    if (this.globalApiKey) {
      player.setApiKey(this.globalApiKey);
    }

    // 如果有全局自定义规则，自动应用到新玩家
    if (this.globalCustomRules) {
      player.setCustomRules(this.globalCustomRules);
    }

    console.log(`✅ Created player ${playerId} with personality: ${config.game.personality}`);
    return player;
  }

  /**
   * 删除一个玩家
   */
  removePlayer(playerId: number): boolean {
    const deleted = this.players.delete(playerId);
    this.configs.delete(playerId);

    if (deleted) {
      console.log(`🗑️  Removed player ${playerId}`);
    } else {
      console.log(`⚠️  Player ${playerId} not found`);
    }

    return deleted;
  }

  /**
   * 获取一个玩家实例
   */
  getPlayer(playerId: number): PlayerServer {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found. Please create the player first.`);
    }
    return player;
  }

  /**
   * 检查玩家是否存在
   */
  hasPlayer(playerId: number): boolean {
    return this.players.has(playerId);
  }

  /**
   * 获取所有玩家ID
   */
  getPlayerIds(): number[] {
    return Array.from(this.players.keys()).sort((a, b) => a - b);
  }

  /**
   * 获取玩家数量
   */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * 获取所有玩家的状态
   */
  getAllPlayersStatus(): Array<{ playerId: number; status: any }> {
    return Array.from(this.players.entries()).map(([playerId, player]) => ({
      playerId,
      status: player.getStatus(),
    }));
  }

  /**
   * 清除所有玩家
   */
  clear(): void {
    this.players.clear();
    this.configs.clear();
    console.log('🧹 Cleared all players');
  }

  /**
   * 健康检查
   */
  healthCheck(): {
    total: number;
    active: number;
    playerIds: number[];
  } {
    const activeCount = Array.from(this.players.values()).filter(
      player => player.getStatus().gameId !== undefined
    ).length;

    return {
      total: this.players.size,
      active: activeCount,
      playerIds: this.getPlayerIds(),
    };
  }

  /**
   * 为所有玩家设置 API Key
   */
  setApiKeyForAll(apiKey: string): void {
    // 保存全局 API key，用于新创建的玩家
    this.globalApiKey = apiKey;

    // 为现有玩家设置 API key
    this.players.forEach(player => {
      player.setApiKey(apiKey);
    });
    console.log(`🔑 Set API key for all ${this.players.size} players (and saved for future players)`);
  }

  /**
   * 为所有玩家设置自定义规则
   */
  setCustomRulesForAll(rules: string): void {
    // 保存全局自定义规则，用于新创建的玩家
    this.globalCustomRules = rules;

    // 为现有玩家设置自定义规则
    this.players.forEach(player => {
      player.setCustomRules(rules);
    });
    console.log(`📜 Set custom rules for all ${this.players.size} players (and saved for future players)`);
  }
}
