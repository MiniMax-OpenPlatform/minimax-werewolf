'use client';

import { observer } from 'mobx-react-lite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { gameMaster } from '@/stores/gameStore';

export const GameOperationLog = observer(function GameOperationLog() {
  const operationLogs = gameMaster.recentOperationLogs;

  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'phase_change':
        return '🎯';
      case 'player_request':
        return '💬';
      case 'player_response':
        return '💬';
      case 'system_action':
        return '🔮';
      case 'result':
        return '⚡';
      default:
        return '📝';
    }
  };

  if (!gameMaster.gameId) {
    return (
      <Card className="max-h-[800px] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-sm">📊 游戏操作记录</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground text-center py-8 text-sm">
            尚未创建游戏
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-h-[800px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-sm">📊 游戏操作记录</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        <div>
          {operationLogs.length === 0 ? (
            <div className="text-muted-foreground text-center py-8 text-sm">
              暂无操作记录
            </div>
          ) : (
            <div className="divide-y divide-border">
              {operationLogs
                .sort((a, b) => b.sequence - a.sequence)
                .map((log) => (
                  <div
                    key={log.id}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex gap-3">
                      <span className="text-lg flex-shrink-0 leading-[1.25rem]">{getLogIcon(log.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground break-words flex-1 leading-[1.25rem]">
                            {log.message}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 leading-[1.25rem]">
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                        {log.details && log.details.result && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <span>{log.details.result}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});