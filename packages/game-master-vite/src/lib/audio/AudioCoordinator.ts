/**
 * 音频协调器
 * 统一管理TTS和背景音乐，处理音频冲突和优先级
 */

import { GamePhase } from '@ai-werewolf/types';
import { TTSQueue, type TTSQueueItem } from './TTSQueue';
import { BackgroundMusicPlayer } from './BackgroundMusicPlayer';

export interface AudioCoordinatorConfig {
  bgmVolume?: number;
  autoStart?: boolean;
}

export class AudioCoordinator {
  private ttsQueue: TTSQueue;
  private bgmPlayer: BackgroundMusicPlayer;
  private isEnabled: boolean = false;
  private currentPhase: GamePhase | null = null;

  constructor(config?: AudioCoordinatorConfig) {
    this.ttsQueue = new TTSQueue();
    this.bgmPlayer = new BackgroundMusicPlayer();

    if (config?.bgmVolume !== undefined) {
      this.bgmPlayer.setVolume(config.bgmVolume);
    }

    if (config?.autoStart) {
      this.enable();
    }

    // 监听TTS队列状态，自动进行音频ducking
    this.ttsQueue.subscribe((currentItem) => {
      this.handleTTSStateChange(currentItem);
    });
  }

  /**
   * 处理TTS状态变化
   */
  private async handleTTSStateChange(currentItem: TTSQueueItem | null): Promise<void> {
    if (currentItem?.status === 'playing') {
      // TTS开始播放，降低背景音乐音量
      await this.bgmPlayer.duck();
    } else if (currentItem?.status === 'completed' || !currentItem) {
      // TTS播放完成，恢复背景音乐音量
      await this.bgmPlayer.unduck();
    }
  }

  /**
   * 启用音频系统
   */
  enable(): void {
    console.log('[AudioCoordinator] enable() called');
    this.isEnabled = true;
    this.ttsQueue.resume(); // 确保TTS队列未暂停
    if (this.currentPhase) {
      this.bgmPlayer.resume();
    }
  }

  /**
   * 禁用音频系统
   */
  disable(): void {
    this.isEnabled = false;
    this.ttsQueue.pause();
    this.bgmPlayer.pause();
  }

  /**
   * 添加TTS到队列
   */
  enqueueTTS(params: {
    type: 'system' | 'player';
    text: string;
    voiceId: string;
    playerId?: number;
    priority?: number;
  }): string {
    if (!this.isEnabled) {
      console.warn('Audio coordinator is disabled');
      return '';
    }

    return this.ttsQueue.enqueue({
      type: params.type,
      text: params.text,
      voiceId: params.voiceId,
      playerId: params.playerId,
      priority: params.priority ?? 0,
    });
  }

  /**
   * 游戏阶段切换
   */
  async onPhaseChange(phase: GamePhase): Promise<void> {
    this.currentPhase = phase;

    if (!this.isEnabled) {
      return;
    }

    // 切换背景音乐
    await this.bgmPlayer.switchPhase(phase);
  }

  /**
   * 暂停所有音频
   */
  pause(): void {
    this.ttsQueue.pause();
    this.bgmPlayer.pause();
  }

  /**
   * 继续播放
   */
  resume(): void {
    this.ttsQueue.resume();
    this.bgmPlayer.resume();
  }

  /**
   * 跳过当前TTS
   */
  skipCurrentTTS(): void {
    this.ttsQueue.skip();
  }

  /**
   * 清空TTS队列
   */
  clearTTSQueue(): void {
    this.ttsQueue.clear();
  }

  /**
   * 设置背景音乐音量
   */
  setBGMVolume(volume: number): void {
    this.bgmPlayer.setVolume(volume);
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      isEnabled: this.isEnabled,
      currentPhase: this.currentPhase,
      tts: this.ttsQueue.getState(),
      bgm: this.bgmPlayer.getState(),
    };
  }

  /**
   * 订阅TTS状态变化
   */
  subscribeTTS(listener: (item: TTSQueueItem | null) => void): () => void {
    return this.ttsQueue.subscribe(listener);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.ttsQueue.clear();
    this.bgmPlayer.dispose();
  }
}
