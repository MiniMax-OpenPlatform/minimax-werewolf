/// <reference types="vite/client" />
import { useState, useEffect } from 'react';
import { GameConsole } from '@/components/GameConsole';
import { GameHistory } from '@/components/GameHistory';
import { StatsPage } from '@/pages/StatsPage';
import { Button } from '@/components/ui/button';
import './globals.css';

function App() {
  const [currentPage, setCurrentPage] = useState<'main' | 'stats'>('main');
  const [activeView, setActiveView] = useState<'game' | 'history'>('game');

  // 根据 URL hash 判断当前页面
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#stats') {
        setCurrentPage('stats');
      } else {
        setCurrentPage('main');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 如果是统计页面，直接显示统计页面
  if (currentPage === 'stats') {
    return <StatsPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="py-6 relative">
          {/* GitHub Link */}
          <div className="absolute right-6 top-6">
            <a
              href="https://github.com/MiniMax-OpenPlatform/minimax-werewolf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground bg-background/50 hover:bg-background/80 border border-border rounded-lg transition-all hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>GitHub</span>
            </a>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              MiniMax狼人杀demo
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex justify-center gap-2 mt-4">
            <Button
              onClick={() => setActiveView('game')}
              variant={activeView === 'game' ? 'default' : 'outline'}
            >
              游戏控制台
            </Button>
            <Button
              onClick={() => setActiveView('history')}
              variant={activeView === 'history' ? 'default' : 'outline'}
            >
              历史记录
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-[90rem]">
        {activeView === 'game' && <GameConsole />}
        {activeView === 'history' && <GameHistory />}
      </main>
    </div>
  );
}

export default App;