import { observer } from 'mobx-react-lite';
import { motion } from 'framer-motion';
import type { GameLog } from '@ai-werewolf/types';

interface TimelineEvent {
  id: string;
  timestamp?: string;
  type: 'system' | 'night_action' | 'vote' | 'speech' | 'death';
  description: string;
  round?: number;
  icon: string;
  color: string;
}

interface Speech {
  playerId: number;
  content: string;
  type?: 'system' | 'player' | 'night_action';
  timestamp?: string;
}

interface EventTimelineProps {
  speeches: Record<number, Speech[]>;
  gameLog: GameLog | null;
  displayedSpeechIds: Set<string>;
}

export const EventTimeline = observer(function EventTimeline({ speeches, gameLog, displayedSpeechIds }: EventTimelineProps) {
  if (!gameLog) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>游戏未开始</p>
      </div>
    );
  }

  const allEvents: TimelineEvent[] = [];

  // 遍历所有回合的speeches，只显示已播放完成TTS的
  Object.keys(speeches).forEach(roundKey => {
    const roundNum = Number(roundKey);
    const roundSpeeches = speeches[roundNum] || [];

    roundSpeeches.forEach((speech: Speech, index: number) => {
      const speechId = `${roundNum}-${index}`;

      // 只显示已播放完成的speech
      if (!displayedSpeechIds.has(speechId)) {
        return;
      }

      let icon = '';
      let color = '';
      let description = speech.content;
      let eventType: TimelineEvent['type'] = 'speech';

      // 根据speech类型和内容判断事件类型
      if (speech.type === 'night_action') {
        // 夜间行动（狼人杀人、预言家查验、女巫用药等）
        eventType = 'night_action';
        icon = '🌙';
        color = 'bg-purple-900/50 border-purple-500/50';

        // 根据内容设置更具体的图标
        if (speech.content.includes('狼人杀')) {
          icon = '🐺';
        } else if (speech.content.includes('预言家')) {
          icon = '🔮';
        } else if (speech.content.includes('女巫')) {
          icon = '🧙';
        }
      } else if (speech.playerId === -1 || speech.playerId === 0) {
        // 系统消息
        eventType = 'system';
        icon = '📢';
        color = 'bg-blue-900/50 border-blue-500/50';

        // 死亡公告
        if (speech.content.includes('死亡')) {
          eventType = 'death';
          icon = '💀';
          color = 'bg-red-900/50 border-red-500/50';
        }
      } else if (speech.content.includes('我投')) {
        // 投票消息
        eventType = 'vote';
        icon = '🗳️';
        color = 'bg-yellow-900/50 border-yellow-500/50';
      } else {
        // 普通发言
        const shortContent = speech.content.length > 30
          ? speech.content.substring(0, 30) + '...'
          : speech.content;
        description = `${speech.playerId} 号发言: "${shortContent}"`;
        icon = '💬';
        color = 'bg-green-900/50 border-green-500/50';
      }

      allEvents.push({
        id: speechId,
        timestamp: speech.timestamp,
        type: eventType,
        description,
        round: roundNum,
        icon,
        color
      });
    });
  });

  // 按时间戳排序（如果有的话），否则按round排序
  const events = allEvents.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    if (a.round !== undefined && b.round !== undefined) {
      return a.round - b.round;
    }
    return 0;
  });

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
      <div className="space-y-2">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`${event.color} border-l-4 rounded p-2 backdrop-blur`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xl flex-shrink-0">{event.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 break-words">{event.description}</p>
                {event.round !== undefined && (
                  <p className="text-xs text-gray-400 mt-1">第 {event.round} 轮</p>
                )}
              </div>
            </div>
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
