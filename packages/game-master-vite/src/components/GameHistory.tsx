import { useState } from 'react';
import { GameHistoryList } from './GameHistoryList';
import { GameDetailView } from './GameDetailView';

export function GameHistory() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  if (selectedGameId) {
    return (
      <GameDetailView
        gameId={selectedGameId}
        onBack={() => setSelectedGameId(null)}
      />
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">游戏历史记录</h1>
      <GameHistoryList onViewDetail={(gameId) => setSelectedGameId(gameId)} />
    </div>
  );
}
