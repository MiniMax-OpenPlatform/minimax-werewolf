import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AudioCoordinator } from '@/lib/audio';

interface AudioControlsProps {
  audioCoordinator: AudioCoordinator;
}

export const AudioControls = observer(function AudioControls({
  audioCoordinator,
}: AudioControlsProps) {
  const state = audioCoordinator.getState();
  const [bgmVolume, setBgmVolume] = useState(50); // 增加默认音量到50%

  const handleBGMVolumeChange = (value: number) => {
    setBgmVolume(value);
    audioCoordinator.setBGMVolume(value / 100);
  };

  const handleSkip = () => {
    audioCoordinator.skipCurrentTTS();
  };

  const handlePause = () => {
    audioCoordinator.pause();
  };

  const handleResume = () => {
    audioCoordinator.resume();
  };

  const currentTTS = state.tts.currentItem;
  const queueLength = state.tts.queueLength;

  return (
    <div className="space-y-4">
      {/* 当前播放信息 */}
      {currentTTS && (
        <div className="bg-gray-900/90 backdrop-blur rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-blue-400">
              {currentTTS.type === 'system' ? '🎙️' : '🗣️'}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">
                {currentTTS.type === 'system' ? '系统' : `玩家${currentTTS.playerId}`}
              </div>
              <div className="text-gray-400 text-sm truncate">
                {currentTTS.text.substring(0, 60)}
                {currentTTS.text.length > 60 ? '...' : ''}
              </div>
            </div>
          </div>

          {/* 播放控制按钮 */}
          <div className="flex items-center gap-2">
            {state.tts.isPaused ? (
              <Button
                onClick={handleResume}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                ▶️ 继续
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                ⏸️ 暂停
              </Button>
            )}
            <Button
              onClick={handleSkip}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              ⏭️ 跳过
            </Button>
          </div>

          {/* 队列信息 */}
          {queueLength > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              队列中还有 {queueLength} 条待播放
            </div>
          )}
        </div>
      )}

      {/* 音量控制 */}
      <div className="bg-gray-900/90 backdrop-blur rounded-xl p-4 border border-white/10">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">🎵 背景音乐</span>
            <span className="text-gray-400 text-sm">{bgmVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={bgmVolume}
            onChange={(e) => handleBGMVolumeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${bgmVolume}%, #374151 ${bgmVolume}%, #374151 100%)`,
            }}
          />
        </div>
      </div>

      {/* 状态指示器 - 只在有BGM阶段时显示 */}
      {state.bgm.currentPhase && (
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${state.bgm.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-gray-400">
            {state.bgm.isPlaying ? '背景音乐播放中' : '背景音乐已暂停'}
          </span>
        </div>
      )}
    </div>
  );
});
