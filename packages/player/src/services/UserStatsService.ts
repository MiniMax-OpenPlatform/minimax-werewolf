import * as fs from 'fs';
import * as path from 'path';

/**
 * 用户信息接口
 */
export interface UserInfo {
  userId: string;           // API Key 前20位
  firstSeen: string;        // 首次访问时间（ISO格式）
  lastSeen: string;         // 最后访问时间（ISO格式）
  sessionCount: number;     // 会话计数
}

/**
 * 用户统计数据接口
 */
export interface UserStats {
  onlineUsers: number;      // 当前在线用户数
  totalUsers: number;       // 历史总用户数
  onlineUserList: UserInfo[]; // 在线用户列表
  allUsers: UserInfo[];     // 所有历史用户
}

/**
 * 用户统计服务
 * 负责跟踪在线用户和历史用户统计
 */
export class UserStatsService {
  private statsDir: string;
  private statsFile: string;
  private onlineUsers: Map<string, UserInfo>; // 在线用户（内存中）
  private allUsers: Map<string, UserInfo>;    // 所有历史用户
  private readonly ONLINE_TIMEOUT = 5 * 60 * 1000; // 5分钟无活动视为离线

  constructor(statsDir?: string) {
    // 默认使用 /app/stats（Docker容器内）或 ./stats（本地开发）
    this.statsDir = statsDir || path.join(process.cwd(), 'stats');
    this.statsFile = path.join(this.statsDir, 'users.json');
    this.onlineUsers = new Map();
    this.allUsers = new Map();

    this.ensureStatsDirectory();
    this.loadUsersFromDisk();

    // 定期清理过期的在线用户
    setInterval(() => this.cleanupExpiredOnlineUsers(), 60 * 1000); // 每分钟检查一次
  }

  /**
   * 确保统计目录存在
   */
  private ensureStatsDirectory(): void {
    if (!fs.existsSync(this.statsDir)) {
      fs.mkdirSync(this.statsDir, { recursive: true });
      console.log(`📁 Created user stats directory: ${this.statsDir}`);
    }
  }

  /**
   * 从磁盘加载用户数据
   */
  private loadUsersFromDisk(): void {
    try {
      if (fs.existsSync(this.statsFile)) {
        const data = fs.readFileSync(this.statsFile, 'utf-8');
        const users: UserInfo[] = JSON.parse(data);

        users.forEach(user => {
          this.allUsers.set(user.userId, user);
        });

        console.log(`📊 Loaded ${this.allUsers.size} historical users from disk`);
      }
    } catch (error) {
      console.error('❌ Failed to load user stats from disk:', error);
    }
  }

  /**
   * 保存用户数据到磁盘
   */
  private saveUsersToDisk(): void {
    try {
      this.ensureStatsDirectory();

      const users = Array.from(this.allUsers.values());
      fs.writeFileSync(this.statsFile, JSON.stringify(users, null, 2), 'utf-8');

      console.log(`💾 Saved ${users.length} users to disk`);
    } catch (error) {
      console.error('❌ Failed to save user stats to disk:', error);
    }
  }

  /**
   * 清理过期的在线用户
   */
  private cleanupExpiredOnlineUsers(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, user] of this.onlineUsers.entries()) {
      const lastSeenTime = new Date(user.lastSeen).getTime();
      if (now - lastSeenTime > this.ONLINE_TIMEOUT) {
        this.onlineUsers.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired online users`);
    }
  }

  /**
   * 记录用户心跳（用户活动）
   * @param apiKey 完整的 API Key
   * @returns 用户ID（API Key前20位）
   */
  recordUserHeartbeat(apiKey: string): string {
    // 获取 API Key 前20位作为用户标识
    const userId = apiKey.substring(0, 20);
    const now = new Date().toISOString();

    // 更新或创建历史用户记录
    let userInfo = this.allUsers.get(userId);
    if (userInfo) {
      userInfo.lastSeen = now;
      userInfo.sessionCount++;
    } else {
      userInfo = {
        userId,
        firstSeen: now,
        lastSeen: now,
        sessionCount: 1,
      };
      this.allUsers.set(userId, userInfo);

      // 新用户，保存到磁盘
      this.saveUsersToDisk();
    }

    // 更新在线用户记录
    this.onlineUsers.set(userId, { ...userInfo });

    return userId;
  }

  /**
   * 获取用户统计数据
   */
  getUserStats(): UserStats {
    // 清理过期的在线用户
    this.cleanupExpiredOnlineUsers();

    return {
      onlineUsers: this.onlineUsers.size,
      totalUsers: this.allUsers.size,
      onlineUserList: Array.from(this.onlineUsers.values()),
      allUsers: Array.from(this.allUsers.values()),
    };
  }

  /**
   * 获取当前在线用户数
   */
  getOnlineUserCount(): number {
    this.cleanupExpiredOnlineUsers();
    return this.onlineUsers.size;
  }

  /**
   * 获取历史总用户数
   */
  getTotalUserCount(): number {
    return this.allUsers.size;
  }

  /**
   * 手动保存数据到磁盘
   */
  flush(): void {
    this.saveUsersToDisk();
  }
}
