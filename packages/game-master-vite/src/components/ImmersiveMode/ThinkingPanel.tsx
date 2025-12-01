import { observer } from 'mobx-react-lite';
import { motion } from 'framer-motion';
import type { GameLog } from '@ai-werewolf/types';

interface ThinkingEntry {
  id: string;
  timestamp: string;
  playerId: number;
  type: 'night_action' | 'vote' | 'speech';
  thinking: string;
  round?: number;
  icon: string;
  label: string;
}

interface Speech {
  playerId: number;
  content: string;
  type?: 'system' | 'player' | 'night_action';
  timestamp?: string;
  thinking?: string;
}

interface ThinkingPanelProps {
  speeches: Record<number, Speech[]>;
  gameLog: GameLog | null;
  displayedSpeechIds: Set<string>;
}

export const ThinkingPanel = observer(function ThinkingPanel({ speeches, gameLog, displayedSpeechIds }: ThinkingPanelProps) {
  if (!gameLog) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>游戏未开始</p>
      </div>
    );
  }

  const entries: ThinkingEntry[] = [];

  // 遍历所有回合的speeches，找到对应的thinking
  Object.keys(speeches).forEach(roundKey => {
    const roundNum = Number(roundKey);
    const roundSpeeches = speeches[roundNum] || [];

    roundSpeeches.forEach((speech: Speech, index: number) => {
      const speechId = `${roundNum}-${index}`;

      // 只显示已播放完成TTS的speech的thinking
      if (!displayedSpeechIds.has(speechId)) {
        return;
      }

      // 如果这个speech有thinking，添加到entries
      if (speech.thinking) {
        let label = '';
        let icon = '';

        // 根据speech类型判断
        if (speech.type === 'night_action') {
          // 夜间行动
          if (speech.content.includes('狼人')) {
            label = '狼人行动';
            icon = '🐺';
          } else if (speech.content.includes('预言家')) {
            label = '预言家查验';
            icon = '🔮';
          } else if (speech.content.includes('女巫')) {
            label = '女巫行动';
            icon = '🧙';
          } else {
            label = '夜间行动';
            icon = '🌙';
          }
        } else if (speech.content.includes('我投')) {
          // 投票
          label = '投票思考';
          icon = '🗳️';
        } else if (speech.playerId > 0) {
          // 普通发言
          label = '发言思考';
          icon = '💭';
        } else {
          // 系统消息（通常没有thinking，但以防万一）
          return;
        }

        entries.push({
          id: speechId,
          timestamp: speech.timestamp || new Date().toISOString(),
          playerId: speech.playerId,
          type: speech.type === 'night_action' ? 'night_action' : speech.content.includes('我投') ? 'vote' : 'speech',
          thinking: speech.thinking,
          round: roundNum,
          icon,
          label
        });
      }
    });
  });

  // 按时间戳排序
  const thinkingEntries = entries.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    if (a.round !== undefined && b.round !== undefined) {
      return a.round - b.round;
    }
    return 0;
  });

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden pl-2 custom-scrollbar">
      <div className="space-y-3">
        {thinkingEntries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 backdrop-blur"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{entry.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-purple-300">
                  {entry.playerId} 号 - {entry.label}
                </p>
                {entry.round !== undefined && (
                  <p className="text-xs text-gray-500">第 {entry.round} 轮</p>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
              {entry.thinking}
            </p>
          </motion.div>
        ))}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
});
