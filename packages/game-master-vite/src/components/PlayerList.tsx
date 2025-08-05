'use client';

import { observer } from 'mobx-react-lite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import clsx from 'clsx';
import { Role } from '@ai-werewolf/types';
import { gameMaster } from '@/stores/gameStore';

export const PlayerList = observer(function PlayerList() {
  const getRoleText = (role: Role): string => {
    const roleMap = {
      [Role.WEREWOLF]: '狼人',
      [Role.VILLAGER]: '村民',
      [Role.SEER]: '预言家',
      [Role.WITCH]: '女巫',
    };
    return roleMap[role] || role;
  };

  const getRoleVariant = (role: Role) => {
    switch (role) {
      case Role.WEREWOLF:
        return 'destructive';
      case Role.VILLAGER:
        return 'default';
      case Role.SEER:
        return 'secondary';
      case Role.WITCH:
        return 'outline';
      default:
        return 'outline';
    }
  };

  const gameState = gameMaster.getGameState();
  
  if (!gameMaster.gameId || !gameState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👥 玩家列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-8 flex flex-col items-center gap-3">
            <span className="text-2xl text-muted-foreground">😴</span>
            <span className="text-muted-foreground">暂无玩家信息</span>
            <span className="text-sm text-muted-foreground">请先创建游戏</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          👥 玩家列表
          <Badge variant="outline" className="ml-2">
            {gameState.players.length}人
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {gameState.players.map((player, index) => {
            
            return (
              <div
                key={player.id ?? `player-${index}`}
                className={clsx(
                  'rounded-lg border p-2',
                  'flex flex-col items-center gap-1 min-h-[80px]',
                  player.isAlive 
                    ? 'bg-card' 
                    : 'bg-muted opacity-60'
                )}
              >
                <div className={clsx(
                  'text-xl',
                  player.isAlive ? '' : 'opacity-40'
                )}>
                  {player.role === Role.WEREWOLF ? '🐺' : 
                   player.role === Role.SEER ? '🔮' :
                   player.role === Role.WITCH ? '🧪' : '👤'}
                </div>
                
                <div className={clsx(
                  'text-xs text-center',
                  player.isAlive ? 'text-foreground' : 'text-muted-foreground line-through'
                )}>
                  玩家{player.id}
                  {!player.isAlive && (
                    <span className="text-destructive ml-1">☠️</span>
                  )}
                </div>
                
                <Badge 
                  variant={getRoleVariant(player.role)}
                  className="text-xs"
                >
                  {getRoleText(player.role)}
                </Badge>
              </div>
            )}
          )}
        </div>

        <div className="border rounded-lg p-3 space-y-2">
          <div className="text-sm text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground">游戏ID:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {gameMaster.gameId?.slice(0, 8)}...
              </Badge>
            </div>
            {gameState && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-muted-foreground">状态:</span>
                <Badge variant="secondary" className="text-xs">
                  {gameState.round === 0 ? '准备中' : '进行中'}
                </Badge>
              </div>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>存活: {gameState.players.filter(p => p.isAlive).length}</span>
              <span>死亡: {gameState.players.filter(p => !p.isAlive).length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});