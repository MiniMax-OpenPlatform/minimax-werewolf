import { observer } from 'mobx-react-lite';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { gameMaster } from '@/stores/gameStore';
import { AudioCoordinator } from '@/lib/audio';
import { PlayerCircle } from './PlayerCircle';
import { PhaseIndicator } from './PhaseIndicator';
import { AudioControls } from './AudioControls';
import { GamePhase } from '@ai-werewolf/types';

export const ImmersiveView = observer(function ImmersiveView() {
  const [isActive, setIsActive] = useState(false);
  const audioCoordinatorRef = useRef<AudioCoordinator | null>(null);
  const [speakingPlayerId, setSpeakingPlayerId] = useState<number | null>(null);
  const [nightAction, setNightAction] = useState<string | null>(null);
  const lastProcessedIndexRef = useRef<Record<number, number>>({});

  // 获取游戏状态 - 必须在useEffect之前
  const round = gameMaster.round;

  // 初始化音频协调器
  useEffect(() => {
    if (!audioCoordinatorRef.current) {
      audioCoordinatorRef.current = new AudioCoordinator({
        bgmVolume: 0.5, // 增加背景音乐音量到50%
        autoStart: false,
      });
    }

    return () => {
      audioCoordinatorRef.current?.dispose();
    };
  }, []);

  // 监听TTS播放状态，同步动画
  useEffect(() => {
    if (!isActive || !audioCoordinatorRef.current) return;

    const audioCoordinator = audioCoordinatorRef.current;

    // 订阅TTS状态变化
    const unsubscribe = audioCoordinator.subscribeTTS((currentItem) => {
      if (currentItem?.status === 'playing' && currentItem.type === 'player') {
        // TTS开始播放时，显示对应玩家动画
        console.log('[ImmersiveView] TTS playing, highlight player:', currentItem.playerId);
        setSpeakingPlayerId(currentItem.playerId || null);
      } else if (!currentItem || currentItem.status === 'completed') {
        // TTS播放完成或队列空时，清除动画
        console.log('[ImmersiveView] TTS completed, clear highlight');
        setSpeakingPlayerId(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isActive]);

  // 监听游戏阶段变化
  useEffect(() => {
    if (!isActive || !audioCoordinatorRef.current) return;

    const phase = gameMaster.currentPhase;
    console.log('[ImmersiveView] Phase changed to:', phase);
    audioCoordinatorRef.current.onPhaseChange(phase);
  }, [isActive, gameMaster.currentPhase]);

  // 监听游戏事件并生成TTS - 使用定时器轮询新speech
  useEffect(() => {
    if (!isActive || !audioCoordinatorRef.current) return;

    const audioCoordinator = audioCoordinatorRef.current;

    // 使用定时器每100ms检查新speech
    const intervalId = setInterval(() => {
      const speeches = gameMaster.speechSystem.getAllSpeeches();

      // 遍历所有回合
      Object.keys(speeches).forEach(roundKey => {
        const roundNum = Number(roundKey);
        const roundSpeeches = speeches[roundNum] || [];
        const lastIndex = lastProcessedIndexRef.current[roundNum] || 0;

        // 只处理新的speech（从lastIndex开始）
        for (let i = lastIndex; i < roundSpeeches.length; i++) {
          const speech = roundSpeeches[i];
          const speechId = `${roundNum}-${i}`;

          console.log('[ImmersiveView] Processing new speech:', speechId, speech.content.substring(0, 50));

          // 清理文本：去掉[系统]、[投票]等前缀
          let cleanText = speech.content
            .replace(/^\[系统\]\s*/, '')
            .replace(/^\[投票\]\s*/, '')
            .trim();

          // 获取当前游戏阶段
          const currentPhase = gameMaster.currentPhase;

          // 投票阶段：跳过玩家投票理由，只保留简短的投票声明
          if (currentPhase === GamePhase.VOTING && speech.type === 'player') {
            const voteMatch = speech.content.match(/投票给\s*(\d+)号玩家/);
            if (voteMatch) {
              cleanText = `我投 ${voteMatch[1]} 号`;
            } else {
              // 如果没有匹配到投票格式，跳过这条speech
              console.log('[ImmersiveView] Skipping voting speech without vote target');
              continue;
            }
          }

          // 夜晚阶段：跳过所有玩家行动
          if (currentPhase === GamePhase.NIGHT && speech.type === 'player') {
            console.log('[ImmersiveView] Skipping night phase player action');
            continue;
          }

          // 获取玩家音色
          const gameState = gameMaster.getGameState();
          const player = gameState?.players.find(p => p.id === speech.playerId);
          const voiceId = player?.voiceId || 'female-yujie';

          // 添加到TTS队列
          if (speech.type === 'system') {
            const ttsId = audioCoordinator.enqueueTTS({
              type: 'system',
              text: cleanText,
              voiceId: 'female-yujie',
            });
            console.log('[ImmersiveView] System TTS queued:', ttsId);
          } else if (speech.type === 'player') {
            const ttsId = audioCoordinator.enqueueTTS({
              type: 'player',
              text: cleanText,
              voiceId: voiceId,
              playerId: speech.playerId,
            });
            console.log('[ImmersiveView] Player TTS queued:', ttsId, 'voice:', voiceId);
            // 动画将由TTS状态监听器自动控制
          } else if (speech.type === 'night_action') {
            // 夜间行动只显示文字，不播放TTS
            console.log('[ImmersiveView] Night action (text only, no TTS):', cleanText);
            setNightAction(cleanText);
            // 3秒后清除夜间行动文字
            setTimeout(() => setNightAction(null), 3000);
          }
        }

        // 更新lastIndex
        if (roundSpeeches.length > lastIndex) {
          lastProcessedIndexRef.current[roundNum] = roundSpeeches.length;
        }
      });
    }, 100); // 每100ms检查一次

    return () => clearInterval(intervalId);
  }, [isActive]); // 只依赖isActive

  const handleEnter = () => {
    setIsActive(true);
    audioCoordinatorRef.current?.enable();

    // 进入全屏（可选）
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen request failed:', err);
      });
    }
  };

  const handleExit = () => {
    setIsActive(false);
    audioCoordinatorRef.current?.disable();

    // 退出全屏
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const handleStartGame = async () => {
    console.log('[ImmersiveView] Starting game...');
    await gameMaster.startGame();
  };

  const handleNextPhase = async () => {
    console.log('[ImmersiveView] Advancing to next phase...');
    await gameMaster.nextPhase();
  };

  const gameState = gameMaster.getGameState();
  const players = gameState?.players || [];
  const currentPhase = gameMaster.currentPhase;
  const isProcessingPhase = gameMaster.isProcessingPhase;

  console.log('[ImmersiveView] Button state:', { round, currentPhase, isProcessingPhase });

  // 判断游戏状态（与GameControls保持一致）
  const canStart = gameMaster.gameId && gameState && gameState.players.length > 0 && gameState.round === 0;
  const canAdvance = gameMaster.gameId && gameState && gameState.round > 0 && currentPhase !== GamePhase.ENDED;

  // 入口按钮（未激活状态）
  if (!isActive) {
    return (
      <div className="p-4">
        <Button
          onClick={handleEnter}
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-lg"
        >
          🎬 进入沉浸模式
        </Button>
        <p className="text-sm text-gray-500 mt-2">
          电影级游戏体验：玩家围坐圆桌，语音播报，背景音乐
        </p>
      </div>
    );
  }

  // 沉浸模式主界面
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 z-50 overflow-y-auto"
      >
        {/* 顶部栏 */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/30 to-transparent">
          <Button
            onClick={handleExit}
            variant="outline"
            size="sm"
            className="bg-black/50 backdrop-blur text-white border-white/20"
          >
            🚪 退出沉浸模式
          </Button>

          {/* 音频控制 */}
          <div className="w-80">
            {audioCoordinatorRef.current && (
              <AudioControls audioCoordinator={audioCoordinatorRef.current} />
            )}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="h-full flex flex-col items-center justify-center px-4 pt-24 pb-8">
          {/* 阶段指示器 */}
          <div className="mb-4">
            <PhaseIndicator phase={currentPhase} round={round} />
          </div>

          {/* 玩家圆桌 */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl gap-4">
            <PlayerCircle
              players={players}
              speakingPlayerId={speakingPlayerId}
              centerSize={300}
            />

            {/* 夜晚行动显示 */}
            {nightAction && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-purple-900/80 backdrop-blur border-2 border-purple-500/50 rounded-lg px-6 py-3 shadow-lg"
              >
                <div className="text-purple-200 text-lg font-medium">
                  {nightAction}
                </div>
              </motion.div>
            )}
          </div>

          {/* 游戏控制按钮 - 与常规模式保持一致，总是显示 */}
          <div className="flex flex-col gap-4 mt-4 items-center">
            <div className="flex gap-4">
              <Button
                onClick={handleStartGame}
                disabled={!canStart}
                size="lg"
                className={`font-bold shadow-lg transition-all ${
                  canStart
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                {canStart ? '▶️ 开始游戏' : '▶️ 已开始'}
              </Button>

              <Button
                onClick={handleNextPhase}
                disabled={!canAdvance || isProcessingPhase}
                size="lg"
                className={`font-bold shadow-lg transition-all ${
                  canAdvance && !isProcessingPhase
                    ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                {isProcessingPhase ? '⏳ 处理中...' : '⏭️ 下一阶段'}
              </Button>
            </div>

            {isProcessingPhase && (
              <div className="text-sm text-yellow-400 animate-pulse">
                AI玩家正在行动，请稍候...
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="text-center text-gray-400 text-sm mt-4">
            <p>沉浸模式已启动 · 自动播放语音 · 背景音乐同步游戏阶段</p>
          </div>
        </div>

        {/* 装饰性粒子效果（可选） */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
