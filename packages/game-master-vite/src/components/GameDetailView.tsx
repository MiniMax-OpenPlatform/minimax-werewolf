import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GameLog } from '@ai-werewolf/types';
import { getPlayerServiceUrl } from '@/lib/playerConfig';

interface GameDetailViewProps {
  gameId: string;
  onBack: () => void;
}

export function GameDetailView({ gameId, onBack }: GameDetailViewProps) {
  const [game, setGame] = useState<GameLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'speeches' | 'votes' | 'nights'>('overview');

  useEffect(() => {
    const loadGame = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${getPlayerServiceUrl()}/api/game-logs/${gameId}`);
        if (!response.ok) {
          throw new Error('Failed to load game detail');
        }
        const data = await response.json();
        setGame(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [gameId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>加载中...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !game) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-500">
          <p>加载失败: {error || 'Game not found'}</p>
          <Button onClick={onBack} className="mt-4">
            返回列表
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>游戏详情 - #{game.gameId.slice(0, 12)}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDateTime(game.startTime)}
              {game.endTime && ` - ${formatDateTime(game.endTime)}`}
            </p>
          </div>
          <Button onClick={onBack} variant="outline">
            ← 返回列表
          </Button>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          onClick={() => setActiveTab('overview')}
          variant={activeTab === 'overview' ? 'default' : 'outline'}
        >
          📊 概览
        </Button>
        <Button
          onClick={() => setActiveTab('speeches')}
          variant={activeTab === 'speeches' ? 'default' : 'outline'}
        >
          💬 发言记录 ({game.speeches.length})
        </Button>
        <Button
          onClick={() => setActiveTab('votes')}
          variant={activeTab === 'votes' ? 'default' : 'outline'}
        >
          🗳️ 投票记录 ({game.votes.length})
        </Button>
        <Button
          onClick={() => setActiveTab('nights')}
          variant={activeTab === 'nights' ? 'default' : 'outline'}
        >
          🌙 夜间行动 ({game.nightActions.length})
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Game Result */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">游戏结果</CardTitle>
            </CardHeader>
            <CardContent>
              {game.result ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">胜利方:</span>
                    <Badge variant={game.result.winner === 'werewolf' ? 'destructive' : 'default'}>
                      {game.result.winner === 'werewolf' ? '🐺 狼人' : '👥 好人'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{game.result.reason}</p>
                  <p className="text-sm">
                    存活玩家: {game.result.survivingPlayers.join(', ')}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">游戏未完成</p>
              )}
            </CardContent>
          </Card>

          {/* Game Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">游戏配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>总玩家数: {game.config.playerCount}</p>
              <p>🐺 狼人: {game.config.roles.werewolf}人</p>
              <p>🔮 预言家: {game.config.roles.seer}人</p>
              <p>🧪 女巫: {game.config.roles.witch}人</p>
              <p>👤 村民: {game.config.roles.villager}人</p>
              <p>游戏轮次: {game.totalRounds}轮</p>
            </CardContent>
          </Card>

          {/* Players */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">玩家列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {game.players.map((player) => (
                  <div
                    key={player.id}
                    className={`border rounded p-2 text-center ${
                      !player.isAlive ? 'opacity-50 bg-muted' : ''
                    }`}
                  >
                    <div className="font-semibold">玩家 {player.id}</div>
                    <div className="text-xs text-muted-foreground">{player.role}</div>
                    {!player.isAlive && (
                      <div className="text-xs text-red-500 mt-1">
                        ☠️ 第{player.deathRound}轮
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'speeches' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">发言记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {game.speeches.map((speech, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">玩家 {speech.playerId}</span>
                    <Badge variant="outline">第{speech.round}轮</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(speech.timestamp).toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm">{speech.content}</p>
                  {speech.thinking && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        💭 查看内心独白
                      </summary>
                      <p className="text-xs text-muted-foreground mt-1 ml-4">
                        {speech.thinking}
                      </p>
                    </details>
                  )}
                  {speech.traceId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      🔖 Trace ID: {speech.traceId}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'votes' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">投票记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {game.votes.map((vote, index) => (
                <div key={index} className="border-l-4 border-orange-500 pl-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      玩家 {vote.voterId} → 玩家 {vote.targetId}
                    </span>
                    <Badge variant="outline">第{vote.round}轮</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(vote.timestamp).toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm">理由: {vote.reason}</p>
                  {vote.thinking && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        💭 查看内心独白
                      </summary>
                      <p className="text-xs text-muted-foreground mt-1 ml-4">
                        {vote.thinking}
                      </p>
                    </details>
                  )}
                  {vote.traceId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      🔖 Trace ID: {vote.traceId}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'nights' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">夜间行动记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {game.nightActions.map((action, index) => (
                <div
                  key={index}
                  className={`border-l-4 pl-3 py-2 ${
                    action.role === 'WEREWOLF' ? 'border-red-500' :
                    action.role === 'SEER' ? 'border-purple-500' :
                    'border-green-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {action.role === 'WEREWOLF' ? '🐺' :
                       action.role === 'SEER' ? '🔮' : '🧪'}{' '}
                      玩家 {action.playerId}
                    </span>
                    <Badge variant="outline">第{action.round}轮</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.timestamp).toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    {action.target && <p>目标: 玩家 {action.target}</p>}
                    {action.healTarget !== undefined && action.healTarget > 0 && (
                      <p>解药: 玩家 {action.healTarget}</p>
                    )}
                    {action.poisonTarget !== undefined && action.poisonTarget > 0 && (
                      <p>毒药: 玩家 {action.poisonTarget}</p>
                    )}
                    {action.reason && <p>理由: {action.reason}</p>}
                    {action.healReason && <p>解药理由: {action.healReason}</p>}
                    {action.poisonReason && <p>毒药理由: {action.poisonReason}</p>}
                  </div>
                  {action.thinking && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        💭 查看内心独白
                      </summary>
                      <p className="text-xs text-muted-foreground mt-1 ml-4">
                        {action.thinking}
                      </p>
                    </details>
                  )}
                  {action.traceId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      🔖 Trace ID: {action.traceId}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
