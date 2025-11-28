import fs from 'fs';
import path from 'path';
import type {
  GameLog,
  GameLogSummary,
  GameLogPlayerInfo,
  SpeechLog,
  VoteLog,
  NightActionLog
} from '@ai-werewolf/types';

/**
 * 游戏日志管理器
 * 负责记录游戏过程并保存到文件系统
 */
export class GameLogger {
  private log: GameLog;
  private logDir: string;

  constructor(gameId: string, config: GameLog['config']) {
    this.logDir = path.join(process.cwd(), 'game-logs');

    // 确保日志目录存在
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // 初始化日志对象
    this.log = {
      gameId,
      startTime: new Date().toISOString(),
      config,
      players: [],
      totalRounds: 0,
      speeches: [],
      votes: [],
      nightActions: [],
      events: []
    };

    // 记录游戏开始事件
    this.addEvent('game_start', '游戏开始');
  }

  /**
   * 设置玩家信息
   */
  setPlayers(players: GameLogPlayerInfo[]): void {
    this.log.players = players;
  }

  /**
   * 添加发言记录
   */
  addSpeech(speech: Omit<SpeechLog, 'timestamp'>): void {
    this.log.speeches.push({
      ...speech,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 添加投票记录
   */
  addVote(vote: Omit<VoteLog, 'timestamp'>): void {
    this.log.votes.push({
      ...vote,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 添加夜间行动记录
   */
  addNightAction(action: Omit<NightActionLog, 'timestamp'>): void {
    this.log.nightActions.push({
      ...action,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 添加事件记录
   */
  addEvent(type: string, description: string, data?: any): void {
    this.log.events.push({
      type,
      description,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 更新轮次
   */
  setRound(round: number): void {
    this.log.totalRounds = round;
  }

  /**
   * 更新玩家状态（死亡）
   */
  updatePlayerStatus(playerId: number, isAlive: boolean, deathRound?: number, deathReason?: string): void {
    const player = this.log.players.find(p => p.id === playerId);
    if (player) {
      player.isAlive = isAlive;
      if (!isAlive) {
        player.deathRound = deathRound;
        player.deathReason = deathReason;
      }
    }
  }

  /**
   * 结束游戏并记录结果
   */
  endGame(winner: 'werewolf' | 'villager' | 'draw', reason: string): void {
    this.log.endTime = new Date().toISOString();

    // 计算游戏时长（秒）
    const startTime = new Date(this.log.startTime).getTime();
    const endTime = new Date(this.log.endTime).getTime();
    this.log.duration = Math.floor((endTime - startTime) / 1000);

    // 记录游戏结果
    this.log.result = {
      winner,
      reason,
      survivingPlayers: this.log.players.filter(p => p.isAlive).map(p => p.id)
    };

    // 添加游戏结束事件
    this.addEvent('game_end', `游戏结束 - ${winner === 'werewolf' ? '狼人' : winner === 'villager' ? '好人' : '平局'}胜利`, { reason });

    // 保存日志
    this.save();
  }

  /**
   * 保存日志到文件
   */
  save(): void {
    const filename = `${this.log.gameId}.json`;
    const filepath = path.join(this.logDir, filename);

    try {
      fs.writeFileSync(filepath, JSON.stringify(this.log, null, 2), 'utf-8');
      console.log(`✅ 游戏日志已保存: ${filepath}`);
    } catch (error) {
      console.error(`❌ 保存游戏日志失败:`, error);
    }
  }

  /**
   * 获取当前日志
   */
  getLog(): GameLog {
    return { ...this.log };
  }

  /**
   * 静态方法：加载游戏日志
   */
  static loadLog(gameId: string): GameLog | null {
    const logDir = path.join(process.cwd(), 'game-logs');
    const filepath = path.join(logDir, `${gameId}.json`);

    try {
      if (!fs.existsSync(filepath)) {
        return null;
      }
      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content) as GameLog;
    } catch (error) {
      console.error(`❌ 加载游戏日志失败 (${gameId}):`, error);
      return null;
    }
  }

  /**
   * 静态方法：获取所有游戏日志摘要
   */
  static getAllLogSummaries(): GameLogSummary[] {
    const logDir = path.join(process.cwd(), 'game-logs');

    try {
      if (!fs.existsSync(logDir)) {
        return [];
      }

      const files = fs.readdirSync(logDir).filter(f => f.endsWith('.json'));
      const summaries: GameLogSummary[] = [];

      for (const file of files) {
        try {
          const filepath = path.join(logDir, file);
          const content = fs.readFileSync(filepath, 'utf-8');
          const log: GameLog = JSON.parse(content);

          summaries.push({
            gameId: log.gameId,
            startTime: log.startTime,
            endTime: log.endTime,
            duration: log.duration,
            playerCount: log.config.playerCount,
            totalRounds: log.totalRounds,
            winner: log.result?.winner,
            isCompleted: !!log.endTime
          });
        } catch (error) {
          console.error(`❌ 解析游戏日志失败 (${file}):`, error);
        }
      }

      // 按开始时间倒序排列
      return summaries.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      console.error(`❌ 读取游戏日志目录失败:`, error);
      return [];
    }
  }

  /**
   * 静态方法：删除游戏日志
   */
  static deleteLog(gameId: string): boolean {
    const logDir = path.join(process.cwd(), 'game-logs');
    const filepath = path.join(logDir, `${gameId}.json`);

    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`✅ 游戏日志已删除: ${gameId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ 删除游戏日志失败 (${gameId}):`, error);
      return false;
    }
  }

  /**
   * 静态方法：保存游戏日志（用于接收从浏览器发送的完整日志）
   */
  static saveLog(gameLog: GameLog): void {
    const logDir = path.join(process.cwd(), 'game-logs');

    // 确保日志目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const filename = `${gameLog.gameId}.json`;
    const filepath = path.join(logDir, filename);

    try {
      fs.writeFileSync(filepath, JSON.stringify(gameLog, null, 2), 'utf-8');
      console.log(`✅ 游戏日志已保存: ${filepath}`);
    } catch (error) {
      console.error(`❌ 保存游戏日志失败:`, error);
      throw error;
    }
  }
}
