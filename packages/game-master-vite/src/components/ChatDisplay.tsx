'use client';

import { observer } from 'mobx-react-lite';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import clsx from 'clsx';
import { Role } from '@ai-werewolf/types';
import { gameMaster } from '@/stores/gameStore';

const SpeechItem = observer(function SpeechItem({ speech, role, index }: { speech: any; role: Role | null; index: number }) {
  const getRoleText = (role: Role | null) => {
    const roleMap = {
      [Role.WEREWOLF]: '狼人',
      [Role.VILLAGER]: '村民',
      [Role.SEER]: '预言家',
      [Role.WITCH]: '女巫'
    };
    return role ? roleMap[role] : '';
  };

  return (
    <div
      key={`${speech.playerId}-${index}`}
      className={clsx(
        'rounded-lg p-3 transition-all duration-200',
        'hover:shadow-sm',
        'border border-border bg-card'
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center space-x-2">
          <span className={clsx(
            'font-medium text-sm',
            {
              'text-primary': speech.type === 'system',
              'text-foreground': speech.type === 'player' || !speech.type
            }
          )}>
            {speech.type === 'system' ? '系统' : `玩家${speech.playerId}`}
          </span>

          {speech.type === 'system' && (
            <Badge variant="secondary" className="text-xs h-5">
              系统通知
            </Badge>
          )}

          {(!speech.type || speech.type === 'player') && role && (
            <Badge
              variant={role === Role.WEREWOLF ? 'destructive' : 'outline'}
              className="text-xs h-5"
            >
              {getRoleText(role)}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0 ml-2">
          {format(new Date(), 'HH:mm:ss')}
        </span>
      </div>
      <div className="text-sm text-foreground leading-relaxed mt-1">
        {speech.content}
      </div>

      {/* 内心独白区域 - 始终显示 */}
      {speech.thinking && speech.type !== 'system' && (
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex items-center space-x-1 mb-1">
            <span className="text-xs font-medium text-amber-600">💭 内心独白</span>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-900 dark:text-amber-100 italic leading-relaxed">
            {speech.thinking}
          </div>
        </div>
      )}

      {/* Trace ID区域 - 显示在发言下方 */}
      {speech.traceId && speech.type !== 'system' && (
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">🔖 Trace-ID:</span>
          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">
            {speech.traceId}
          </code>
        </div>
      )}
    </div>
  );
});

export const ChatDisplay = observer(function ChatDisplay() {
  const gameState = gameMaster.getGameState();
  const speechesData = gameMaster.getSpeeches();

  // 将 AllSpeeches 对象转换为数组格式，保持时间顺序（最新的在前）
  const speeches = Object.keys(speechesData)
    .sort((a, b) => Number(b) - Number(a)) // 按回合数倒序排序，最新的回合在前
    .flatMap(round => {
      const roundSpeeches = speechesData[Number(round)] || [];
      return roundSpeeches.slice().reverse(); // 每个回合内的消息也倒序，最新的在前
    })
    .filter(speech => speech != null);

  const getPlayerRole = (playerId: number): Role | null => {
    if (!gameState) return null;
    const player = gameState.players.find(p => p.id === playerId);
    return player?.role || null;
  };

  if (!gameState && speeches.length === 0) {
    return (
      <Card className="max-h-[800px] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className='text-sm'>玩家对话记录</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground text-sm">
            等待游戏开始...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-h-[800px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className='text-sm'>玩家对话记录</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {speeches.length === 0 ? (
          <div className="text-muted-foreground text-center py-8 text-sm">
            暂无发言记录
          </div>
        ) : (
          speeches.map((speech, index) => {
            const role = getPlayerRole(speech.playerId);
            return (
              <SpeechItem
                key={`${speech.playerId}-${index}`}
                speech={speech}
                role={role}
                index={index}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
});
