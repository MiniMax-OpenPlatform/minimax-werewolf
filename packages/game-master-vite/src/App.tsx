/// <reference types="vite/client" />
import { GameConsole } from '@/components/GameConsole';
import './globals.css';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="py-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🎮</span>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                AI狼人杀游戏控制台
              </h1>
              <p className="text-base text-muted-foreground font-medium mt-1">
                智能游戏管理系统
              </p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-8 max-w-[90rem]">
        <GameConsole />
      </main>
    </div>
  );
}

export default App;