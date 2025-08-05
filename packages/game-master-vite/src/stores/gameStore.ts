import { GameMaster } from '@/lib/GameMaster';
import { v4 as uuidv4 } from 'uuid';

// 创建全局的 GameMaster 实例
export const gameMaster = new GameMaster(uuidv4());