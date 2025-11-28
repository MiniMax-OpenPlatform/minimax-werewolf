/// <reference types="vite/client" />
import { useState } from 'react';
import { GameConsole } from '@/components/GameConsole';
import { GameHistory } from '@/components/GameHistory';
import { Button } from '@/components/ui/button';
import './globals.css';

function App() {
  const [activeView, setActiveView] = useState<'game' | 'history'>('game');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Agent狼人杀竞技场
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex justify-center gap-2 mt-4">
            <Button
              onClick={() => setActiveView('game')}
              variant={activeView === 'game' ? 'default' : 'outline'}
            >
              🎮 游戏控制台
            </Button>
            <Button
              onClick={() => setActiveView('history')}
              variant={activeView === 'history' ? 'default' : 'outline'}
            >
              📜 历史记录
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-[90rem]">
        {activeView === 'game' ? <GameConsole /> : <GameHistory />}
      </main>
    </div>
  );
}

export default App;