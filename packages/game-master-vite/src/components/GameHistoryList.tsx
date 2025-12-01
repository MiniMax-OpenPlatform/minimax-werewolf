import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GameLogSummary } from '@ai-werewolf/types';
import { getPlayerServiceUrl } from '@/lib/playerConfig';

interface GameHistoryListProps {
  onViewDetail: (gameId: string) => void;
}

export function GameHistoryList({ onViewDetail }: GameHistoryListProps) {
  const [games, setGames] = useState<GameLogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${getPlayerServiceUrl()}/api/game-logs`);
      if (!response.ok) {
        throw new Error('Failed to load game history');
      }
      const data = await response.json();
      // 后端返回 { total: number, logs: GameLogSummary[] }
      setGames(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleDelete = async (gameId: string) => {
    if (!confirm('确定要删除这个游戏记录吗？')) {
      return;
    }

    try {
      const response = await fetch(`${getPlayerServiceUrl()}/api/game-logs/${gameId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete game');
      }
      await loadGames(); // 重新加载列表
    } catch (err) {
      alert('删除失败: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '未知';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}分${secs}秒`;
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>加载中...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-500">
          <p>加载失败: {error}</p>
          <Button onClick={loadGames} className="mt-4">
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>历史游戏记录</CardTitle>
        <Button onClick={loadGames} variant="outline" size="sm">
          🔄 刷新
        </Button>
      </CardHeader>
      <CardContent>
        {games.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            暂无游戏记录
          </p>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div
                key={game.gameId}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        游戏 #{game.gameId.slice(0, 8)}
                      </h3>
                      {game.isCompleted ? (
                        <Badge variant={game.winner === 'werewolf' ? 'destructive' : 'default'}>
                          {game.winner === 'werewolf' ? '🐺 狼人胜' : '👥 好人胜'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">未完成</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>开始时间: {formatDateTime(game.startTime)}</p>
                      {game.endTime && (
                        <p>结束时间: {formatDateTime(game.endTime)}</p>
                      )}
                      <p>
                        游戏时长: {formatDuration(game.duration)} |
                        玩家数: {game.playerCount} |
                        轮次: {game.totalRounds}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onViewDetail(game.gameId)}
                      size="sm"
                      variant="outline"
                    >
                      查看详情
                    </Button>
                    <Button
                      onClick={() => handleDelete(game.gameId)}
                      size="sm"
                      variant="destructive"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
