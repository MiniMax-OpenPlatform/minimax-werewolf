import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { GameControls } from './GameControls';
import { ChatDisplay } from './ChatDisplay';
import { GameOperationLog } from './GameOperationLog';
import { PlayerList } from './PlayerList';

export const GameConsole = observer(function GameConsole() {
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  return (
    <div className="space-y-6">
      {/* 游戏控制面板和玩家列表 - 横向布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GameControls />
        <PlayerList />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-destructive hover:text-destructive/80 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* 主要游戏界面 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 玩家对话记录 - 占1/2宽度 */}
        <div>
          <ChatDisplay />
        </div>
        
        {/* 游戏操作记录 - 占1/2宽度 */}
        <div>
          <GameOperationLog />
        </div>
      </div>
    </div>
  );
});