import { observer } from 'mobx-react-lite';
import { motion } from 'framer-motion';
import { Role } from '@ai-werewolf/types';

interface PlayerCirclePlayer {
  id: number;
  isAlive: boolean;
  role: Role;
}

interface PlayerCircleProps {
  players: PlayerCirclePlayer[];
  speakingPlayerId: number | null;
  centerSize?: number;
}

// 角色到图片的映射
const ROLE_IMAGES: Record<Role, string> = {
  [Role.VILLAGER]: `${import.meta.env.BASE_URL}images/roles/cunmin.png`,
  [Role.WEREWOLF]: `${import.meta.env.BASE_URL}images/roles/langren.png`,
  [Role.SEER]: `${import.meta.env.BASE_URL}images/roles/yuyanjia.png`,
  [Role.WITCH]: `${import.meta.env.BASE_URL}images/roles/nvwu.png`,
};

export const PlayerCircle = observer(function PlayerCircle({
  players,
  speakingPlayerId,
  centerSize = 300,
}: PlayerCircleProps) {
  const playerCount = players.length;
  const radius = centerSize / 2;

  // 计算每个玩家的位置（圆形布局）
  const getPlayerPosition = (index: number) => {
    // 从右侧开始（3点位置），顺时针排列，避免玩家直接在正上方
    const angle = (index / playerCount) * 2 * Math.PI;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  return (
    <div className="relative" style={{ width: centerSize * 2, height: centerSize * 2 }}>
      {/* 玩家卡片 */}
      {players.map((player, index) => {
        const position = getPlayerPosition(index);
        const isSpeaking = player.id === speakingPlayerId;
        const isDead = !player.isAlive;

        return (
          <motion.div
            key={player.id}
            className="absolute"
            style={{
              left: `calc(50% + ${position.x}px)`,
              top: `calc(50% + ${position.y}px)`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: isSpeaking ? 1.1 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              {/* 发言光效 */}
              {isSpeaking && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-yellow-400/30"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{ filter: 'blur(10px)' }}
                />
              )}

              {/* 玩家头像 */}
              <div
                className={`relative w-32 h-32 rounded-full overflow-hidden border-4 transition-all ${
                  isDead
                    ? 'border-gray-600 opacity-40 grayscale'
                    : isSpeaking
                    ? 'border-yellow-300 shadow-lg shadow-yellow-500/50'
                    : 'border-blue-400 shadow-lg'
                }`}
              >
                {isDead ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-4xl">
                    💀
                  </div>
                ) : (
                  <img
                    src={ROLE_IMAGES[player.role]}
                    alt={player.role}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* 玩家状态标识 */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <div className="text-xs font-medium text-white/80">
                  玩家{player.id}
                </div>
                {isSpeaking && (
                  <div className="text-xs text-yellow-400">🗣️ 发言中</div>
                )}
                {isDead && (
                  <div className="text-xs text-red-400">已出局</div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});
