/**
 * TTS语音队列管理器
 * 负责管理TTS音频的生成、排队和播放
 */

import { getPlayerServiceUrl } from '../playerConfig';

export interface TTSQueueItem {
  id: string;
  type: 'system' | 'player';
  playerId?: number;
  text: string;
  voiceId: string;
  priority: number;
  audioPromise?: Promise<Blob>;
  audioBlob?: Blob;
  audioUrl?: string;
  status: 'pending' | 'generating' | 'ready' | 'playing' | 'completed' | 'error';
}

export class TTSQueue {
  private queue: TTSQueueItem[] = [];
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentItem: TTSQueueItem | null = null;
  private listeners: Set<(item: TTSQueueItem | null) => void> = new Set();

  /**
   * 添加TTS项到队列
   */
  enqueue(item: Omit<TTSQueueItem, 'id' | 'status'>): string {
    const id = `tts-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const queueItem: TTSQueueItem = {
      ...item,
      id,
      status: 'pending',
    };

    this.queue.push(queueItem);
    console.log('[TTSQueue] Enqueued:', id, 'text:', item.text.substring(0, 30), 'queue length:', this.queue.length);

    // 立即开始生成TTS
    this.generateTTS(queueItem);

    // 如果当前空闲，开始播放
    if (!this.isPlaying && !this.isPaused) {
      console.log('[TTSQueue] Starting playback');
      this.playNext();
    } else {
      console.log('[TTSQueue] Playback already in progress, isPlaying:', this.isPlaying, 'isPaused:', this.isPaused);
    }

    return id;
  }

  /**
   * 生成TTS音频
   */
  private async generateTTS(item: TTSQueueItem): Promise<void> {
    item.status = 'generating';
    this.notifyListeners();

    try {
      const playerServiceUrl = getPlayerServiceUrl();
      console.log('[TTSQueue] Generating TTS:', item.id, 'URL:', `${playerServiceUrl}/api/tts/generate`);

      const response = await fetch(`${playerServiceUrl}/api/tts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: item.text,
          voiceId: item.voiceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS generation failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      item.audioBlob = audioBlob;
      item.audioUrl = URL.createObjectURL(audioBlob);
      item.status = 'ready';

      console.log('[TTSQueue] TTS ready:', item.id, 'blob size:', audioBlob.size);
      this.notifyListeners();
    } catch (error) {
      console.error('[TTSQueue] TTS generation error:', item.id, error);
      item.status = 'error';
      this.notifyListeners();
    }
  }

  /**
   * 播放下一条音频
   */
  async playNext(): Promise<void> {
    console.log('[TTSQueue] playNext called, queue length:', this.queue.length, 'isPaused:', this.isPaused);

    if (this.queue.length === 0 || this.isPaused) {
      this.isPlaying = false;
      this.currentItem = null;
      this.notifyListeners();
      console.log('[TTSQueue] Playback stopped, queue empty or paused');
      return;
    }

    const item = this.queue[0];
    this.isPlaying = true;
    this.currentItem = item;
    console.log('[TTSQueue] Playing next item:', item.id, 'status:', item.status);

    // 等待音频生成完成（最多30秒超时）
    const maxWaitTime = 30000;
    const startTime = Date.now();

    while (item.status === 'pending' || item.status === 'generating') {
      this.notifyListeners();

      if (Date.now() - startTime > maxWaitTime) {
        console.error('TTS generation timeout');
        item.status = 'error';
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 如果生成失败，跳过这条
    if (item.status === 'error' || !item.audioUrl) {
      console.error('Skipping failed TTS item:', item.id);
      this.queue.shift();
      this.playNext();
      return;
    }

    // 播放音频
    try {
      item.status = 'playing';
      this.notifyListeners();

      await this.playAudio(item.audioUrl);

      // 播放完成
      item.status = 'completed';
      console.log('[TTSQueue] Item completed:', item.id);

      // 清理资源
      if (item.audioUrl) {
        URL.revokeObjectURL(item.audioUrl);
      }

      // 移除已播放项
      this.queue.shift();
      console.log('[TTSQueue] Item removed from queue, remaining:', this.queue.length);

      // 继续播放下一条
      if (!this.isPaused) {
        console.log('[TTSQueue] Calling playNext for next item');
        this.playNext();
      } else {
        console.log('[TTSQueue] NOT calling playNext because isPaused=true');
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      this.queue.shift();
      this.playNext();
    }
  }

  /**
   * 播放音频
   */
  private playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      console.log('[TTSQueue] playAudio starting, URL:', audioUrl.substring(0, 50));

      audio.onended = () => {
        console.log('[TTSQueue] Audio ended, resolving promise');
        resolve();
      };

      audio.onerror = (error) => {
        console.error('[TTSQueue] Audio error:', error);
        reject(error);
      };

      audio.play()
        .then(() => {
          console.log('[TTSQueue] Audio play() started successfully');
        })
        .catch(error => {
          console.error('[TTSQueue] Audio play() failed:', error);
          reject(error);
        });
    });
  }

  /**
   * 暂停播放
   */
  pause(): void {
    console.log('[TTSQueue] pause() called');
    console.trace('[TTSQueue] pause stack trace');
    this.isPaused = true;
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  /**
   * 继续播放
   */
  resume(): void {
    console.log('[TTSQueue] resume() called, was paused:', this.isPaused, 'has current audio:', !!this.currentAudio);
    this.isPaused = false;
    if (this.currentAudio) {
      this.currentAudio.play();
    } else {
      this.playNext();
    }
  }

  /**
   * 跳过当前播放
   */
  skip(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.queue.length > 0) {
      this.queue.shift();
    }
    this.playNext();
  }

  /**
   * 清空队列
   */
  clear(): void {
    // 清理所有音频URL
    this.queue.forEach(item => {
      if (item.audioUrl) {
        URL.revokeObjectURL(item.audioUrl);
      }
    });

    this.queue = [];

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    this.isPlaying = false;
    this.currentItem = null;
    this.notifyListeners();
  }

  /**
   * 获取队列状态
   */
  getState() {
    return {
      queue: this.queue,
      currentItem: this.currentItem,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      queueLength: this.queue.length,
    };
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: (item: TTSQueueItem | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentItem));
  }
}
