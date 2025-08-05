'use client';

import { observer } from 'mobx-react-lite';
import { GamePhase } from '@ai-werewolf/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { gameMaster } from '@/stores/gameStore';

export const GameStatus = observer(function GameStatus() {
  const gameState = gameMaster.getGameState();
  const operationLogs = gameMaster.recentOperationLogs;

  const getPhaseText = (phase: GamePhase): string => {
    const phaseMap = {
      [GamePhase.PREPARING]: '准备中',
      [GamePhase.NIGHT]: '夜晚',
      [GamePhase.DAY]: '白天', 
      [GamePhase.VOTING]: '投票',
      [GamePhase.ENDED]: '结束'
    };
    return phaseMap[phase] || phase;
  };

  const getPhaseVariant = (phase: GamePhase) => {
    switch (phase) {
      case GamePhase.PREPARING:
        return 'outline';
      case GamePhase.NIGHT:
        return 'secondary';
      case GamePhase.DAY:
        return 'default';
      case GamePhase.VOTING:
        return 'destructive';
      default:
        return 'secondary';
    }
  };


  const getLogTypeStyle = (type: string) => {
    switch (type) {
      case 'phase_change':
        return 'border-l-4 border-l-primary';
      case 'player_request':
        return 'border-l-4 border-l-orange-500';
      case 'player_response':
        return 'border-l-4 border-l-green-500';
      case 'system_action':
        return 'border-l-4 border-l-blue-500';
      case 'result':
        return 'border-l-4 border-l-purple-500';
      default:
        return 'border-l-4 border-l-muted';
    }
  };

  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!gameMaster.gameId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 游戏状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            尚未创建游戏
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="border-b pb-2">📊 游戏状态</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 当前阶段和游戏天数 */}
        <div className="flex justify-around">
          <div>
            <div className="text-sm text-muted-foreground mb-2">当前阶段</div>
            <Badge 
              variant={gameState ? getPhaseVariant(gameState.currentPhase) : 'secondary'}
              className="text-sm px-4 py-2"
            >
              {gameState ? getPhaseText(gameState.currentPhase) : '未开始'}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-2">游戏天数</div>
            <div className="text-xl font-bold text-foreground">
              第 {gameState?.round || 0} 天
            </div>
          </div>
        </div>


        {/* 操作记录 */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">📋 操作记录</div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {operationLogs.length === 0 ? (
              <div className="text-muted-foreground text-center py-4 text-xs">
                暂无操作记录
              </div>
            ) : (
              operationLogs
                .sort((a, b) => b.sequence - a.sequence)  // 使用序列号排序，最新的在上面
                .map((log) => (
                  <Card
                    key={log.id}
                    className={`p-3 text-xs ${getLogTypeStyle(log.type)} bg-muted/30`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-xs flex-1 break-words leading-relaxed">
                        {log.message}
                      </div>
                      <div className="text-xs opacity-70 ml-2 flex-shrink-0">
                        {formatTime(log.timestamp)}
                      </div>
                    </div>
                    {log.details && (
                      <div className="text-xs opacity-80">
                        {log.details.result && (
                          <div>结果: {log.details.result}</div>
                        )}
                        {log.details.target && (
                          <div>目标: {log.details.target}</div>
                        )}
                      </div>
                    )}
                  </Card>
                ))
            )}
          </div>
        </div>

        {/* 游戏信息 */}
        <div>
          <div className="text-sm text-muted-foreground mb-2">游戏信息</div>
          <div className="text-sm space-y-1">
            <div>游戏ID: <Badge variant="outline" className="font-mono text-xs">{gameMaster.gameId}</Badge></div>
            {gameState && (
              <>
                <div>游戏状态: <Badge variant="secondary">
                  {gameState.round === 0 ? '准备中' : '进行中'}
                </Badge></div>
                <div>胜利条件: <Badge variant="outline">
                  进行中
                </Badge></div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});