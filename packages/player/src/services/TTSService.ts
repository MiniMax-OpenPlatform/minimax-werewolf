/**
 * TTS服务 - 使用MiniMax API将文本转换为语音
 */
export class TTSService {
  private apiKey: string;
  private baseURL: string = 'https://api.minimax.chat/v1';
  private model: string = 'speech-02-hd';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MINIMAX_API_KEY || '';
  }

  /**
   * 设置API Key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * 将文本转换为语音
   * @param text 要转换的文本
   * @param voiceId 音色ID
   * @returns 音频数据（Buffer）
   */
  async textToSpeech(text: string, voiceId: string): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('MiniMax API key is not configured');
    }

    if (!text || text.trim() === '') {
      throw new Error('Text cannot be empty');
    }

    const proxyUrl = process.env.https_proxy || process.env.http_proxy;
    console.log(`[TTS] Converting text to speech with voice: ${voiceId}`);
    console.log(`[TTS] Text length: ${text.length} characters`);

    const payload = {
      model: this.model,
      text: text,
      voice_setting: {
        voice_id: voiceId
      }
    };

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    // 配置fetch选项
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    };

    // 如果配置了代理，使用 ProxyAgent
    if (proxyUrl) {
      console.log(`[TTS] Using proxy:`, proxyUrl);
      // @ts-expect-error - undici is available at runtime via Bun
      const { ProxyAgent } = await import('undici');
      (fetchOptions as any).dispatcher = new ProxyAgent(proxyUrl);
    }

    try {
      const response = await fetch(`${this.baseURL}/t2a_v2`, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json() as { data?: { audio?: string } };

      // 获取trace_id用于调试
      const traceId = response.headers.get('Trace-Id') || 'unknown';
      console.log(`[TTS] Trace-ID:`, traceId);

      // 检查返回数据
      if (!data.data || !data.data.audio) {
        throw new Error('Invalid TTS API response: missing audio data');
      }

      // 将hex字符串转换为Buffer
      const audioBuffer = Buffer.from(data.data.audio, 'hex');
      console.log(`[TTS] Generated audio size: ${audioBuffer.length} bytes`);

      return audioBuffer;
    } catch (error) {
      console.error(`[TTS] Error:`, error);
      throw error;
    }
  }

  /**
   * 批量转换文本为语音
   * @param items 包含text和voiceId的数组
   * @returns 音频数据数组
   */
  async batchTextToSpeech(items: Array<{ text: string; voiceId: string }>): Promise<Buffer[]> {
    const results: Buffer[] = [];

    for (const item of items) {
      try {
        const audio = await this.textToSpeech(item.text, item.voiceId);
        results.push(audio);
      } catch (error) {
        console.error(`[TTS] Failed to convert text: ${item.text.substring(0, 50)}...`, error);
        // 继续处理下一个，不中断整个批处理
        results.push(Buffer.from([])); // 空buffer表示失败
      }
    }

    return results;
  }
}

/**
 * 可用的音色列表
 */
export const AVAILABLE_VOICES = [
  { id: 'female-yujie', name: '御姐音' },
  { id: 'ai_dageyuan_712', name: '大哥元' },
  { id: 'changan-1_01', name: '长安' },
  { id: 'English_Diligent_Man', name: '英文男声' },
  { id: 'qingdaoxiaoge0325', name: '青岛小哥' },
  { id: 'wuzhao_test_3', name: '无招测试' }
];

/**
 * 随机选择一个音色
 */
export function getRandomVoiceId(): string {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_VOICES.length);
  return AVAILABLE_VOICES[randomIndex].id;
}

/**
 * 为N个玩家随机分配不重复的音色（如果玩家数量超过音色数量，则会重复）
 */
export function assignVoicesToPlayers(playerCount: number): string[] {
  const voiceIds: string[] = [];

  for (let i = 0; i < playerCount; i++) {
    // 循环使用可用音色
    const voiceIndex = i % AVAILABLE_VOICES.length;
    voiceIds.push(AVAILABLE_VOICES[voiceIndex].id);
  }

  // 打乱顺序，让分配更随机
  return voiceIds.sort(() => Math.random() - 0.5);
}
