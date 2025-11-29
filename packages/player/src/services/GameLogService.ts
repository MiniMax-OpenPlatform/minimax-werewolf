import * as fs from 'fs';
import * as path from 'path';
import type { GameLog, GameLogSummary } from '@ai-werewolf/types';

/**
 * 游戏日志服务
 * 负责保存和读取游戏日志
 */
export class GameLogService {
  private logDir: string;

  constructor(logDir?: string) {
    // 默认使用 /app/game-logs（Docker容器内）或 ./game-logs（本地开发）
    this.logDir = logDir || path.join(process.cwd(), 'game-logs');
    this.ensureLogDirectory();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      console.log(`📁 Created game logs directory: ${this.logDir}`);
    }
  }

  /**
   * 保存游戏日志
   */
  saveLog(gameLog: GameLog): void {
    this.ensureLogDirectory();

    const filename = `${gameLog.gameId}.json`;
    const filepath = path.join(this.logDir, filename);

    try {
      fs.writeFileSync(filepath, JSON.stringify(gameLog, null, 2), 'utf-8');
      console.log(`✅ Game log saved: ${filepath}`);
    } catch (error) {
      console.error(`❌ Failed to save game log:`, error);
      throw error;
    }
  }

  /**
   * 加载特定游戏日志
   */
  loadLog(gameId: string): GameLog | null {
    const filepath = path.join(this.logDir, `${gameId}.json`);

    try {
      if (!fs.existsSync(filepath)) {
        return null;
      }
      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content) as GameLog;
    } catch (error) {
      console.error(`❌ Failed to load game log (${gameId}):`, error);
      return null;
    }
  }

  /**
   * 获取所有游戏日志摘要
   */
  getAllLogSummaries(): GameLogSummary[] {
    this.ensureLogDirectory();

    try {
      const files = fs.readdirSync(this.logDir).filter(f => f.endsWith('.json'));
      const summaries: GameLogSummary[] = [];

      for (const file of files) {
        try {
          const filepath = path.join(this.logDir, file);
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
          console.error(`❌ Failed to parse game log (${file}):`, error);
        }
      }

      // 按开始时间倒序排列
      return summaries.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      console.error(`❌ Failed to read game logs directory:`, error);
      return [];
    }
  }

  /**
   * 删除游戏日志
   */
  deleteLog(gameId: string): boolean {
    const filepath = path.join(this.logDir, `${gameId}.json`);

    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`✅ Game log deleted: ${gameId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Failed to delete game log (${gameId}):`, error);
      return false;
    }
  }

  /**
   * 获取日志目录路径
   */
  getLogDirectory(): string {
    return this.logDir;
  }
}
