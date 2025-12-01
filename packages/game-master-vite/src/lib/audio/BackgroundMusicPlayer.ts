/**
 * 背景音乐播放器
 * 根据游戏阶段自动切换背景音乐，支持音量淡入淡出
 */

import { GamePhase } from '@ai-werewolf/types';

export interface BackgroundMusicConfig {
  night: string;
  day: string;
  voting: string;
}

export class BackgroundMusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentPhase: GamePhase | null = null;
  private baseVolume: number = 1.0; // 默认音量100%（测试用）
  private duckedVolume: number = 0.6; // 降低后的音量60%（测试用）
  private isDucked: boolean = false;
  private fadeInterval: number | null = null;
  private duckInterval: number | null = null; // 专门用于duck/unduck的interval

  private musicConfig: BackgroundMusicConfig = {
    night: `${import.meta.env.BASE_URL}audio/bgm/night.mp3`,
    day: `${import.meta.env.BASE_URL}audio/bgm/day.mp3`,
    voting: `${import.meta.env.BASE_URL}audio/bgm/voting.mp3`,
  };

  constructor(config?: Partial<BackgroundMusicConfig>) {
    if (config) {
      this.musicConfig = { ...this.musicConfig, ...config };
    }
  }

  /**
   * 根据游戏阶段切换音乐
   */
  async switchPhase(phase: GamePhase): Promise<void> {
    console.log('[BGM] Switching to phase:', phase);

    // 如果阶段相同，不需要切换
    if (this.currentPhase === phase && this.audio && !this.audio.paused) {
      console.log('[BGM] Phase unchanged, music already playing');
      return;
    }

    this.currentPhase = phase;

    const musicUrl = this.getMusicForPhase(phase);
    if (!musicUrl) {
      console.log('[BGM] No music for phase, stopping');
      this.stop();
      return;
    }

    console.log('[BGM] Loading music:', musicUrl);

    // 如果有正在播放的音乐，先淡出
    if (this.audio && !this.audio.paused) {
      await this.fadeOut();
      this.audio.pause();
    }

    // 加载新音乐并等待加载完成
    await this.loadMusic(musicUrl);

    // 淡入
    await this.fadeIn();

    console.log('[BGM] Music started playing');
  }

  /**
   * 根据阶段获取音乐URL
   */
  private getMusicForPhase(phase: GamePhase): string | null {
    switch (phase) {
      case GamePhase.NIGHT:
        return this.musicConfig.night;
      case GamePhase.DAY:
        return this.musicConfig.day;
      case GamePhase.VOTING:
        return this.musicConfig.voting;
      default:
        return null;
    }
  }

  /**
   * 加载音乐
   */
  private async loadMusic(url: string): Promise<void> {
    // 清理旧的audio元素
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }

    // 创建新的audio元素
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.volume = 0; // 从0开始，准备淡入
    this.audio.preload = 'auto';

    console.log('[BGM] Created audio element for:', url);

    // 等待音频加载完成
    return new Promise((resolve, reject) => {
      if (!this.audio) {
        reject(new Error('Audio element not created'));
        return;
      }

      const audio = this.audio;

      const onLoadedMetadata = () => {
        console.log('[BGM] Audio metadata loaded, duration:', audio.duration, 's');

        // 确保音频未静音
        audio.muted = false;

        console.log('[BGM] Starting playback, volume:', audio.volume, 'muted:', audio.muted);

        audio.play()
          .then(() => {
            console.log('[BGM] Audio playing successfully');

            // 添加监控定时器，检查实际播放状态
            setTimeout(() => {
              console.log('[BGM] Playback status check:', {
                paused: audio.paused,
                muted: audio.muted,
                volume: audio.volume,
                currentTime: audio.currentTime,
                duration: audio.duration,
                readyState: audio.readyState,
                networkState: audio.networkState
              });
            }, 1000);

            resolve();
          })
          .catch(error => {
            console.error('[BGM] Play failed:', error);
            // 仍然resolve，因为加载成功了，只是播放失败
            resolve();
          });

        cleanup();
      };

      const onError = (e: ErrorEvent | Event) => {
        console.error('[BGM] Audio load error:', e);
        cleanup();
        reject(new Error('Failed to load audio'));
      };

      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
      audio.addEventListener('error', onError, { once: true });

      // 开始加载
      console.log('[BGM] Starting to load audio...');
      audio.load();
    });
  }

  /**
   * 音量淡入
   */
  async fadeIn(duration: number = 2000): Promise<void> {
    if (!this.audio) {
      console.log('[BGM] fadeIn skipped - no audio element');
      return;
    }

    console.log('[BGM] fadeIn starting, current volume:', this.audio.volume, 'target:', this.isDucked ? this.duckedVolume : this.baseVolume);

    return new Promise((resolve) => {
      const targetVolume = this.isDucked ? this.duckedVolume : this.baseVolume;
      const startVolume = 0;
      const steps = 50;
      const stepDuration = duration / steps;
      const volumeIncrement = (targetVolume - startVolume) / steps;

      let currentStep = 0;

      this.clearFadeInterval();

      this.fadeInterval = window.setInterval(() => {
        if (!this.audio || currentStep >= steps) {
          this.clearFadeInterval();
          resolve();
          return;
        }

        currentStep++;
        const newVolume = Math.min(startVolume + volumeIncrement * currentStep, targetVolume);
        this.audio.volume = newVolume;

        if (currentStep >= steps) {
          this.clearFadeInterval();
          console.log('[BGM] fadeIn completed, final volume:', this.audio?.volume);
          console.log('[BGM] Audio state:', {
            paused: this.audio?.paused,
            muted: this.audio?.muted,
            currentTime: this.audio?.currentTime,
            duration: this.audio?.duration,
            volume: this.audio?.volume
          });
          resolve();
        }
      }, stepDuration);
    });
  }

  /**
   * 音量淡出
   */
  async fadeOut(duration: number = 1000): Promise<void> {
    if (!this.audio) {
      console.log('[BGM] fadeOut skipped - no audio element');
      return;
    }

    console.log('[BGM] fadeOut starting, current volume:', this.audio.volume);

    return new Promise((resolve) => {
      const startVolume = this.audio!.volume;
      const targetVolume = 0;
      const steps = 30;
      const stepDuration = duration / steps;
      const volumeDecrement = (startVolume - targetVolume) / steps;

      let currentStep = 0;

      this.clearFadeInterval();

      this.fadeInterval = window.setInterval(() => {
        if (!this.audio || currentStep >= steps) {
          this.clearFadeInterval();
          if (this.audio) {
            this.audio.volume = 0;
          }
          resolve();
          return;
        }

        currentStep++;
        const newVolume = Math.max(startVolume - volumeDecrement * currentStep, 0);
        this.audio.volume = newVolume;

        if (currentStep >= steps) {
          this.clearFadeInterval();
          console.log('[BGM] fadeOut completed, final volume:', this.audio?.volume);
          resolve();
        }
      }, stepDuration);
    });
  }

  /**
   * 降低音量（TTS播放时）
   */
  async duck(): Promise<void> {
    if (!this.audio || this.isDucked) return;

    const targetVolume = this.duckedVolume;

    // 如果正在fadeIn中，等待fadeIn完成
    if (this.fadeInterval !== null) {
      console.log('[BGM] Waiting for fadeIn to complete before ducking');
      // 等待2.1秒让fadeIn完成
      await new Promise(resolve => setTimeout(resolve, 2100));
    }

    // 重新检查audio是否还存在（等待期间可能被销毁）
    if (!this.audio) return;

    // 如果当前音量已经很低，跳过duck
    if (this.audio.volume < targetVolume) {
      console.log('[BGM] Current volume', this.audio.volume, 'too low for ducking (target', targetVolume, '), skipping duck');
      return;
    }

    // 等待fadeIn完成后，重新获取当前音量
    const currentVolume = this.audio.volume;
    console.log('[BGM] Ducking volume from', currentVolume, 'to', this.duckedVolume);
    this.isDucked = true;
    const duration = 500;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeDecrement = (currentVolume - targetVolume) / steps;

    return new Promise((resolve) => {
      let currentStep = 0;

      // 清除之前的duck interval（不要清除fadeInterval！）
      if (this.duckInterval !== null) {
        clearInterval(this.duckInterval);
        this.duckInterval = null;
      }

      this.duckInterval = window.setInterval(() => {
        if (!this.audio || currentStep >= steps) {
          if (this.duckInterval !== null) {
            clearInterval(this.duckInterval);
            this.duckInterval = null;
          }
          resolve();
          return;
        }

        currentStep++;
        const newVolume = Math.max(currentVolume - volumeDecrement * currentStep, targetVolume);
        this.audio.volume = newVolume;

        if (currentStep >= steps) {
          if (this.duckInterval !== null) {
            clearInterval(this.duckInterval);
            this.duckInterval = null;
          }
          resolve();
        }
      }, stepDuration);
    });
  }

  /**
   * 恢复音量（TTS播放完成后）
   */
  async unduck(): Promise<void> {
    if (!this.audio || !this.isDucked) return;

    console.log('[BGM] Unducking volume from', this.audio.volume, 'to', this.baseVolume);
    this.isDucked = false;
    const currentVolume = this.audio.volume;
    const targetVolume = this.baseVolume;
    const duration = 500;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeIncrement = (targetVolume - currentVolume) / steps;

    return new Promise((resolve) => {
      let currentStep = 0;

      // 清除之前的duck interval（不要清除fadeInterval！）
      if (this.duckInterval !== null) {
        clearInterval(this.duckInterval);
        this.duckInterval = null;
      }

      this.duckInterval = window.setInterval(() => {
        if (!this.audio || currentStep >= steps) {
          if (this.duckInterval !== null) {
            clearInterval(this.duckInterval);
            this.duckInterval = null;
          }
          resolve();
          return;
        }

        currentStep++;
        const newVolume = Math.min(currentVolume + volumeIncrement * currentStep, targetVolume);
        this.audio.volume = newVolume;

        if (currentStep >= steps) {
          if (this.duckInterval !== null) {
            clearInterval(this.duckInterval);
            this.duckInterval = null;
          }
          resolve();
        }
      }, stepDuration);
    });
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    this.baseVolume = Math.max(0, Math.min(1, volume));
    this.duckedVolume = this.baseVolume * 0.6; // 降低后的音量60%

    if (this.audio) {
      // 根据当前是否处于ducked状态，设置对应的音量
      this.audio.volume = this.isDucked ? this.duckedVolume : this.baseVolume;
      console.log('[BGM] Volume updated:', {
        baseVolume: this.baseVolume,
        duckedVolume: this.duckedVolume,
        isDucked: this.isDucked,
        actualVolume: this.audio.volume
      });
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    this.clearFadeInterval();

    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    this.currentPhase = null;
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * 继续播放
   */
  resume(): void {
    if (this.audio) {
      this.audio.play().catch(error => {
        console.error('Background music resume failed:', error);
      });
    }
  }

  /**
   * 清理淡入淡出定时器
   */
  private clearFadeInterval(): void {
    if (this.fadeInterval !== null) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      isPlaying: !!(this.audio && !this.audio.paused && this.currentPhase !== null),
      currentPhase: this.currentPhase,
      volume: this.baseVolume,
      isDucked: this.isDucked,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop();
  }
}
