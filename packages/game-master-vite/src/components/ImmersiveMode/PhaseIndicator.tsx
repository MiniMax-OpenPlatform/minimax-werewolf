import { observer } from 'mobx-react-lite';
import { motion } from 'framer-motion';
import { GamePhase } from '@ai-werewolf/types';

interface PhaseIndicatorProps {
  phase: GamePhase;
  round: number;
}

export const PhaseIndicator = observer(function PhaseIndicator({
  phase,
  round,
}: PhaseIndicatorProps) {
  const getPhaseInfo = (phase: GamePhase) => {
    switch (phase) {
      case GamePhase.NIGHT:
        return {
          icon: '🌙',
          title: '夜间阶段',
          subtitle: '天黑请闭眼',
          bgColor: 'from-indigo-900/80 to-purple-900/80',
          textColor: 'text-purple-100',
        };
      case GamePhase.DAY:
        return {
          icon: '☀️',
          title: '白天讨论',
          subtitle: '请大家发言讨论',
          bgColor: 'from-amber-600/80 to-orange-600/80',
          textColor: 'text-amber-50',
        };
      case GamePhase.VOTING:
        return {
          icon: '🗳️',
          title: '投票阶段',
          subtitle: '请投出可疑的玩家',
          bgColor: 'from-red-700/80 to-red-900/80',
          textColor: 'text-red-50',
        };
      case GamePhase.PREPARING:
        return {
          icon: '🎮',
          title: '准备阶段',
          subtitle: '游戏即将开始',
          bgColor: 'from-gray-700/80 to-gray-900/80',
          textColor: 'text-gray-100',
        };
      default:
        return {
          icon: '⏸️',
          title: '游戏进行中',
          subtitle: '',
          bgColor: 'from-gray-700/80 to-gray-900/80',
          textColor: 'text-gray-100',
        };
    }
  };

  const phaseInfo = getPhaseInfo(phase);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <div
        className={`backdrop-blur-lg bg-gradient-to-r ${phaseInfo.bgColor} rounded-2xl px-8 py-6 shadow-2xl border border-white/10`}
      >
        <div className="flex items-center gap-6">
          {/* 阶段图标 */}
          <motion.div
            className="text-5xl"
            animate={{
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {phaseInfo.icon}
          </motion.div>

          {/* 阶段信息 */}
          <div className="flex-1">
            <div className={`text-3xl font-bold ${phaseInfo.textColor}`}>
              {phaseInfo.title}
            </div>
            <div className="text-lg text-white/70 mt-1">
              第 {round} 回合 · {phaseInfo.subtitle}
            </div>
          </div>

          {/* 装饰性脉冲点 */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-white/50"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
