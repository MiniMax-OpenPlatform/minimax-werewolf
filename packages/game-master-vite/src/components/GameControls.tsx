'use client';

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { GamePhase, DEFAULT_GAME_RULES, generateGameRulesText, type GameRules } from '@ai-werewolf/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { gameMaster } from '@/stores/gameStore';
import { getPlayerUrls } from '@/lib/playerConfig';
import { GameRulesModal } from './GameRulesModal';

const DEFAULT_PERSONALITIES = [
  '理性分析型玩家，善于逻辑推理，不轻易相信他人但也不会过度怀疑',
  '激进冒险型玩家，喜欢主动出击，发言大胆直接，容易带节奏',
  '谨慎保守型玩家，倾向于观察和跟随，不轻易表态',
  '幽默风趣型玩家，说话诙谐，善于活跃气氛，但关键时刻也很认真',
  '沉默寡言型玩家，很少主动发言，但分析问题一针见血',
  '情绪化玩家，容易被其他人的发言影响，判断有时不够理性'
];

export const GameControls = observer(function GameControls() {
  const [isLoading, setIsLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPersonalityConfig, setShowPersonalityConfig] = useState(false);
  const [showApiKeyConfig, setShowApiKeyConfig] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [playerPersonalities, setPlayerPersonalities] = useState<string[]>(
    DEFAULT_PERSONALITIES.slice(0, 6)
  );

  const handleCreateGame = async () => {
    setIsLoading(true);
    try {
      // 检查 API key
      if (!apiKey || apiKey.trim() === '') {
        alert('请先输入 MiniMax API Key！');
        setShowApiKeyConfig(true);
        return;
      }

      // 获取玩家URL列表
      const playerUrls = getPlayerUrls();

      // 读取自定义游戏规则
      let customRulesText: string | null = null;
      try {
        const savedRules = localStorage.getItem('gameRules');
        if (savedRules) {
          const rulesObj: GameRules = JSON.parse(savedRules);
          customRulesText = generateGameRulesText(rulesObj);
          console.log('📜 Using custom game rules from localStorage');
        } else {
          console.log('📜 Using default game rules');
        }
      } catch (error) {
        console.error('❌ Failed to load custom rules:', error);
        console.log('📜 Falling back to default game rules');
      }

      // 为每个玩家服务器设置 API key 和自定义规则
      console.log('🔑 Setting API key and custom rules for all player servers...');
      for (let i = 0; i < playerUrls.length; i++) {
        try {
          // 设置 API key
          const apiKeyResponse = await fetch(`${playerUrls[i]}/api/player/set-api-key`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey: apiKey.trim() })
          });

          if (!apiKeyResponse.ok) {
            throw new Error(`Failed to set API key for player ${i + 1}`);
          }
          console.log(`✅ API key set for player ${i + 1}`);

          // 设置自定义规则（如果有）
          if (customRulesText) {
            const rulesResponse = await fetch(`${playerUrls[i]}/api/player/set-rules`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ rules: customRulesText })
            });

            if (!rulesResponse.ok) {
              throw new Error(`Failed to set custom rules for player ${i + 1}`);
            }
            console.log(`✅ Custom rules set for player ${i + 1}`);
          }
        } catch (error) {
          console.error(`❌ Failed to configure player ${i + 1}:`, error);
          alert(`无法为玩家${i + 1}配置设置，请检查服务器是否运行正常`);
          return;
        }
      }

      // 创建游戏
      await gameMaster.createGame(playerUrls.length);

      // 添加AI玩家，ID从1开始，并传递personality
      for (let i = 0; i < playerUrls.length; i++) {
        await gameMaster.addPlayer(i + 1, playerUrls[i], playerPersonalities[i]);
      }

      // 分配角色
      await gameMaster.assignRoles();

      console.log(`✅ Game created successfully with ID: ${gameMaster.gameId}`);
      console.log(`👥 Added ${playerUrls.length} players with personalities`);
    } catch (err) {
      console.error('Failed to create game:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePersonality = (index: number, value: string) => {
    const newPersonalities = [...playerPersonalities];
    newPersonalities[index] = value;
    setPlayerPersonalities(newPersonalities);
  };

  const handleStartGame = async () => {
    setIsLoading(true);
    try {
      await gameMaster.startGame();
    } catch (err) {
      console.error('Failed to start game:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPhase = async () => {
    setIsLoading(true);
    try {
      await gameMaster.nextPhase();
    } catch (err) {
      console.error('Failed to advance phase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndGame = () => {
    // Reset game state if needed
    console.log('End game requested');
  };

  const gameState = gameMaster.getGameState();
  const canStart = gameMaster.gameId && gameState && gameState.players.length > 0 && gameState.round === 0;
  const canAdvance = gameMaster.gameId && gameState && gameState.round > 0 && gameState.currentPhase !== GamePhase.ENDED;
  const canEnd = gameMaster.gameId !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎮 游戏控制
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            onClick={() => setShowApiKeyConfig(!showApiKeyConfig)}
            disabled={gameMaster.gameId !== null && gameMaster.players.length > 0}
            variant="default"
            size="sm"
          >
            {showApiKeyConfig ? '隐藏' : '配置'}API Key
          </Button>

          <Button
            onClick={() => setShowPersonalityConfig(!showPersonalityConfig)}
            disabled={gameMaster.gameId !== null && gameMaster.players.length > 0}
            variant="default"
            size="sm"
          >
            {showPersonalityConfig ? '隐藏' : '配置'}玩家性格
          </Button>

          <Button
            onClick={handleCreateGame}
            disabled={isLoading || (gameMaster.gameId !== null && gameMaster.players.length > 0)}
            variant="default"
            size="sm"
          >
            {isLoading && !gameMaster.gameId ? '创建中...' : '创建新游戏'}
          </Button>

          <Button
            onClick={handleStartGame}
            disabled={isLoading || !canStart}
            variant="default"
            size="sm"
          >
            {isLoading && canStart ? '开始中...' : '开始游戏'}
          </Button>

          <Button
            onClick={handleNextPhase}
            disabled={isLoading || !canAdvance}
            variant="default"
            size="sm"
          >
            {isLoading && canAdvance ? '切换中...' : '下一阶段'}
          </Button>

          <Button
            onClick={handleEndGame}
            disabled={isLoading || !canEnd}
            variant="default"
            size="sm"
          >
            结束游戏
          </Button>

          <Button
            onClick={() => setShowRules(true)}
            variant="default"
            size="sm"
          >
            游戏规则
          </Button>

          {gameMaster.gameId && (
            <div className="ml-auto flex items-center space-x-2">
              <span className="text-muted-foreground">游戏ID:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {gameMaster.gameId}
              </Badge>
            </div>
          )}
        </div>

        {gameState && (
          <div className="border rounded-lg p-3">
            <div className="text-sm flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">第{gameState.round}天</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">阶段:</span>
                <Badge variant="secondary" className="text-xs">
                  {getPhaseText(gameState.currentPhase)}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {showApiKeyConfig && (
          <div className="border rounded-lg p-4 space-y-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">MiniMax API Key 配置</h3>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                请输入您的 MiniMax API Key（使用 MiniMax-M2 模型）
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <p className="text-xs text-muted-foreground">
                💡 提示：您可以从 <a href="https://platform.minimaxi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">MiniMax 开放平台</a> 获取 API Key
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ API Key 仅在本次游戏会话中使用，不会被存储
              </p>
            </div>
          </div>
        )}

        {showPersonalityConfig && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">玩家性格配置</h3>
              <Button
                onClick={() => setPlayerPersonalities(DEFAULT_PERSONALITIES.slice(0, 6))}
                variant="outline"
                size="sm"
              >
                重置默认
              </Button>
            </div>
            <div className="space-y-2">
              {playerPersonalities.map((personality, index) => (
                <div key={index} className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    玩家 {index + 1}
                  </label>
                  <textarea
                    value={personality}
                    onChange={(e) => updatePersonality(index, e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
                    rows={2}
                    placeholder="输入玩家性格描述..."
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <GameRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </Card>
  );
});

function getPhaseText(phase: GamePhase): string {
  const phaseMap = {
    [GamePhase.PREPARING]: '准备中',
    [GamePhase.NIGHT]: '夜晚',
    [GamePhase.DAY]: '白天',
    [GamePhase.VOTING]: '投票',
    [GamePhase.ENDED]: '结束'
  };
  return phaseMap[phase] || phase;
}