import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPlayerServiceUrl } from '@/lib/playerConfig';

interface UserInfo {
  userId: string;
  firstSeen: string;
  lastSeen: string;
  sessionCount: number;
}

interface UserStats {
  onlineUsers: number;
  totalUsers: number;
  onlineUserList: UserInfo[];
  allUsers: UserInfo[];
}

export function UserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const playerServiceUrl = getPlayerServiceUrl();
      const response = await fetch(`${playerServiceUrl}/api/user-stats`);

      if (!response.ok) {
        throw new Error('获取统计数据失败');
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('Error fetching user stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初始加载
    fetchStats();

    // 每5秒刷新一次
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTimeAgo = (isoString: string) => {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}秒前`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}分钟前`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}小时前`;
    return `${Math.floor(diffSeconds / 86400)}天前`;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-destructive">错误: {error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🟢 当前在线</CardTitle>
            <CardDescription>实时在线用户数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600 dark:text-green-400">
              {stats.onlineUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">📊 历史总数</CardTitle>
            <CardDescription>历史访问用户总数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 在线用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>🟢 在线用户列表</CardTitle>
          <CardDescription>
            当前在线的用户（5分钟内有活动）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.onlineUserList.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无在线用户
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">用户ID</th>
                    <th className="text-left py-3 px-4 font-medium">首次访问</th>
                    <th className="text-left py-3 px-4 font-medium">最后活跃</th>
                    <th className="text-left py-3 px-4 font-medium">会话数</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.onlineUserList.map((user) => (
                    <tr key={user.userId} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-sm">{user.userId}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(user.firstSeen)}</td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(user.lastSeen)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({getTimeAgo(user.lastSeen)})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{user.sessionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 所有历史用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>📜 所有历史用户</CardTitle>
          <CardDescription>
            所有访问过的用户记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.allUsers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无历史用户
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">用户ID</th>
                    <th className="text-left py-3 px-4 font-medium">首次访问</th>
                    <th className="text-left py-3 px-4 font-medium">最后活跃</th>
                    <th className="text-left py-3 px-4 font-medium">会话数</th>
                    <th className="text-left py-3 px-4 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.allUsers
                    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
                    .map((user) => {
                      const isOnline = stats.onlineUserList.some(u => u.userId === user.userId);
                      return (
                        <tr key={user.userId} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-4 font-mono text-sm">{user.userId}</td>
                          <td className="py-3 px-4 text-sm">{formatDate(user.firstSeen)}</td>
                          <td className="py-3 px-4 text-sm">
                            {formatDate(user.lastSeen)}
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({getTimeAgo(user.lastSeen)})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">{user.sessionCount}</td>
                          <td className="py-3 px-4 text-sm">
                            {isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                在线
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs">
                                离线
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自动刷新提示 */}
      <div className="text-center text-sm text-muted-foreground">
        数据每 5 秒自动刷新
      </div>
    </div>
  );
}
