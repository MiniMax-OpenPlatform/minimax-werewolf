import {
  Role,
  GamePhase,
  type StartGameParams,
  type PlayerContext,
  type WitchContext,
  type SeerContext,
  type PlayerId,
  PersonalityType,
  VotingResponseType,
  SpeechResponseType,
  VotingResponseSchema,
  NightActionResponseType,
  WerewolfNightActionSchema,
  SeerNightActionSchema,
  WitchNightActionSchema,
  SpeechResponseSchema,
  GAME_RULES_TEXT
} from '@ai-werewolf/types';
import { WerewolfPrompts } from './prompts';
import {
  getAITelemetryConfig,
  createGameSession,
  createPhaseTrace,
  endPhaseTrace,
  logEvent,
  type AITelemetryContext
} from './services/langfuse';
import { PlayerConfig } from './config/PlayerConfig';

// 角色到夜间行动 Schema 的映射
const ROLE_SCHEMA_MAP = {
  [Role.WEREWOLF]: WerewolfNightActionSchema,
  [Role.SEER]: SeerNightActionSchema,
  [Role.WITCH]: WitchNightActionSchema,
} as const;

export class PlayerServer {
  private gameId?: string;
  private playerId?: number;
  private role?: Role;
  private teammates?: PlayerId[];
  private config: PlayerConfig;
  private thinkingHistory: string[] = []; // 存储玩家的内心独白历史
  private runtimeApiKey?: string; // 运行时设置的 API key
  private customRules?: string; // 运行时设置的自定义游戏规则

  constructor(config: PlayerConfig) {
    this.config = config;
  }

  setApiKey(apiKey: string): void {
    this.runtimeApiKey = apiKey;
    console.log('🔑 Runtime API key has been set');
  }

  setCustomRules(rules: string): void {
    this.customRules = rules;
    console.log('📜 Custom game rules have been set');
  }

  async startGame(params: StartGameParams): Promise<void> {
    this.gameId = params.gameId;
    this.role = params.role as Role;
    this.teammates = params.teammates;
    this.playerId = params.playerId;
    this.thinkingHistory = [];  // Clear thinking history between games to prevent role contamination

    // 创建 Langfuse session
    createGameSession(this.gameId, {
      playerId: this.playerId,
      role: this.role,
      teammates: this.teammates
    });
    
    if (this.config.logging.enabled) {
      console.log(`🎮 Player started game ${this.gameId} as ${this.role}`);
      console.log(`👤 Player ID: ${this.playerId}`);
      if (this.teammates && this.teammates.length > 0) {
        console.log(`🤝 Teammates: ${this.teammates.join(', ')}`);
      }
      console.log(`📊 Game ID (session): ${this.gameId}`);
    }
  }

  async speak(context: PlayerContext): Promise<SpeechResponseType> {
    // Debug logging
    console.log(`[speak] Player ${this.playerId} - role: ${this.role}, hasApiKey: ${!!(this.runtimeApiKey || this.config.ai.apiKey)}`);

    if (!this.role) {
      console.warn(`[speak] Player ${this.playerId} - No role assigned, returning fallback`);
      return { speech: "我需要仔细思考一下当前的情况。" };
    }

    const effectiveApiKey = this.runtimeApiKey || this.config.ai.apiKey;
    if (!effectiveApiKey) {
      console.warn(`[speak] Player ${this.playerId} - No API key set, returning fallback`);
      return { speech: "我需要仔细思考一下当前的情况。" };
    }

    const speechResponse = await this.generateSpeech(context);
    return speechResponse; // 返回完整对象，包含 speech 和 thinking
  }

  async vote(context: PlayerContext): Promise<VotingResponseType> {
    // Debug logging
    console.log(`[vote] Player ${this.playerId} - role: ${this.role}, hasApiKey: ${!!(this.runtimeApiKey || this.config.ai.apiKey)}`);

    if (!this.role) {
      console.warn(`[vote] Player ${this.playerId} - No role assigned, returning fallback`);
      return { target: 1, reason: "默认投票给玩家1" };
    }

    const effectiveApiKey = this.runtimeApiKey || this.config.ai.apiKey;
    if (!effectiveApiKey) {
      console.warn(`[vote] Player ${this.playerId} - No API key set, returning fallback`);
      return { target: 1, reason: "默认投票给玩家1" };
    }

    return await this.generateVote(context);
  }

  async useAbility(context: PlayerContext | WitchContext | SeerContext): Promise<any> {
    // 检查有效的 API key（运行时设置优先）
    const effectiveApiKey = this.runtimeApiKey || this.config.ai.apiKey;
    if (!this.role || !effectiveApiKey) {
      throw new Error("我没有特殊能力可以使用。");
    }

    return await this.generateAbilityUse(context);
  }

  async lastWords(): Promise<string> {
    // 暂时返回默认遗言，后续可实现AI生成
    return "很遗憾要离开游戏了，希望好人阵营能够获胜！";
  }

  getStatus() {
    return {
      gameId: this.gameId,
      playerId: this.playerId,
      role: this.role,
      teammates: this.teammates,
      isAlive: true,
      config: {
        personality: this.config.game.personality
      }
    };
  }

  // Getter methods for prompt factories
  getRole(): Role | undefined {
    return this.role;
  }

  getPlayerId(): number | undefined {
    return this.playerId;
  }

  getTeammates(): PlayerId[] | undefined {
    return this.teammates;
  }

  getPersonalityPrompt(): string {
    return this.buildPersonalityPrompt();
  }

  getGameId(): string | undefined {
    return this.gameId;
  }

  // 从AI响应文本中提取JSON和思考过程 (处理MiniMax的<think>标签和markdown包装)
  private extractJSON(text: string): { json: string; thinking?: string } {
    // 提取<think>...</think>标签内的思考内容
    let thinking: string | undefined;
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      console.log(`[AI Thinking]:\n${thinking}`);
    }

    // 移除<think>...</think>标签及其内容，获取JSON部分
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');

    // 移除markdown代码块标记
    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // 移除前后空白
    cleaned = cleaned.trim();

    // 如果以'-'开头(markdown列表格式)，尝试提取JSON对象
    if (cleaned.includes('{')) {
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      }
    }

    return { json: cleaned, thinking };
  }

  // 通用AI生成方法
  private async generateWithLangfuse<T>(
    params: {
      functionId: string;
      schema: any;  // Zod schema
      prompt: string;
      maxOutputTokens?: number;
      temperature?: number;
      context?: PlayerContext;  // 使用 PlayerContext 替代 telemetryMetadata
    }
  ): Promise<T> {
    const { functionId, context, schema, prompt, maxOutputTokens, temperature } = params;

    console.log(`[${functionId}] prompt:`, prompt);
    console.log(`[${functionId}] schema:`, JSON.stringify(schema.shape, null, 2));

    // 获取遥测配置
    const telemetryConfig = this.getTelemetryConfig(functionId, context);

    try {
      // 使用自定义规则或默认规则
      const gameRules = this.customRules || GAME_RULES_TEXT;

      // 直接使用fetch调用MiniMax API
      const apiKey = this.runtimeApiKey || this.config.ai.apiKey || process.env.MINIMAX_API_KEY;
      const baseURL = this.config.ai.baseURL || process.env.AI_BASE_URL || 'https://api.minimaxi.com/v1';

      console.log(`[${functionId}] baseURL:`, baseURL);
      console.log(`[${functionId}] model:`, this.config.ai.model);
      console.log(`[${functionId}] apiKey length:`, apiKey?.length, 'first 20 chars:', apiKey?.substring(0, 20));

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mojo.monad.xyz',
        'X-Title': 'AI Werewolf Game',
      };

      console.log(`[${functionId}] headers:`, JSON.stringify(headers, null, 2));

      // 配置代理
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: this.config.ai.model,
          messages: [
            { role: 'system', content: gameRules },
            { role: 'user', content: prompt + '\n\n请直接返回JSON格式的结果，不要包含其他说明文字。' }
          ],
          temperature: temperature ?? this.config.ai.temperature,
          max_tokens: maxOutputTokens,
        }),
      };

      // 如果配置了代理，使用 ProxyAgent
      const proxyUrl = process.env.https_proxy || process.env.http_proxy;
      if (proxyUrl) {
        console.log(`[${functionId}] Using proxy:`, proxyUrl);
        const { ProxyAgent } = await import('undici');
        (fetchOptions as any).dispatcher = new ProxyAgent(proxyUrl);
      }

      const response = await fetch(`${baseURL}/chat/completions`, fetchOptions);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      // 从响应 headers 中获取 Trace-Id
      const traceId = response.headers.get('Trace-Id')
        || response.headers.get('trace-id')
        || response.headers.get('X-Trace-Id')
        || response.headers.get('x-trace-id')
        || response.headers.get('X-Request-Id')
        || response.headers.get('x-request-id')
        || `${functionId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log(`[${functionId}] Trace-ID:`, traceId);

      const data = await response.json();
      const resultText = data.choices?.[0]?.message?.content || '';

      console.log(`[${functionId}] raw response:`, resultText);

      // 从响应中提取JSON和思考过程
      const { json: jsonText, thinking } = this.extractJSON(resultText);
      console.log(`[${functionId}] extracted JSON:`, jsonText);

      // 解析JSON
      const parsed = JSON.parse(jsonText);

      // 使用Zod schema验证
      const validated = schema.parse(parsed);

      // 将thinking和traceId添加到验证后的结果中
      if (thinking) {
        (validated as any).thinking = thinking;
        // 保存到历史记录
        this.thinkingHistory.push(thinking);
        console.log(`[Thinking saved] History count: ${this.thinkingHistory.length}`);
      }

      // 添加traceId
      (validated as any).traceId = traceId;

      console.log(`[${functionId}] result:`, JSON.stringify(validated, null, 2));

      return validated as T;
    } catch (error) {
      console.error(`AI ${functionId} failed:`, error);
      throw new Error(`Failed to generate ${functionId}: ${error}`);
    }
  }

  // AI生成方法
  private async generateSpeech(context: PlayerContext): Promise<SpeechResponseType> {
    const prompt = this.buildSpeechPrompt(context);
    
    return this.generateWithLangfuse<SpeechResponseType>({
      functionId: 'speech-generation',
      schema: SpeechResponseSchema,
      prompt: prompt,
      context: context,
    });
  }

  private async generateVote(context: PlayerContext): Promise<VotingResponseType> {
    const prompt = this.buildVotePrompt(context);
    
    return this.generateWithLangfuse<VotingResponseType>({
      functionId: 'vote-generation',
      schema: VotingResponseSchema,
      prompt: prompt,
      context: context,
    });
  }

  private async generateAbilityUse(context: PlayerContext | WitchContext | SeerContext): Promise<NightActionResponseType> {
    if (this.role === Role.VILLAGER) {
      throw new Error('Village has no night action, should be skipped');
    }
    
    const schema = ROLE_SCHEMA_MAP[this.role!];
    if (!schema) {
      throw new Error(`Unknown role: ${this.role}`);
    }

    const prompt = this.buildAbilityPrompt(context);
    
    return this.generateWithLangfuse<NightActionResponseType>({
      functionId: 'ability-generation',
      schema: schema,
      prompt: prompt,
      context: context,
    });
  }

  // Prompt构建方法
  private buildSpeechPrompt(context: PlayerContext): string {
    const speechPrompt = WerewolfPrompts.getSpeech(
      this,
      context
    );

    // 添加玩家自己的内心独白历史（只保留最近3次避免prompt过长）
    let thinkingContext = '';
    if (this.thinkingHistory.length > 0) {
      thinkingContext = '\n\n## 你之前的内心独白（只有你自己知道）：\n';
      const recentThinking = this.thinkingHistory.slice(-3); // 只保留最近3次
      recentThinking.forEach((thinking, index) => {
        const actualIndex = this.thinkingHistory.length - recentThinking.length + index + 1;
        thinkingContext += `第${actualIndex}次：${thinking}\n`;
      });
    }

    return speechPrompt + thinkingContext + '\n\n请返回JSON格式，包含以下字段：\n- speech: 你的发言内容（30-80字的自然对话，其他玩家都能听到）\n\n请直接返回JSON格式的结果，不要包含其他说明文字。';
  }

  private buildVotePrompt(context: PlayerContext): string {
    const personalityPrompt = this.buildPersonalityPrompt();

    const additionalParams = {
      teammates: this.teammates
    };

    // 为预言家添加查验结果
    if (this.role === Role.SEER && 'investigatedPlayers' in context) {
      const seerContext = context as any;
      const checkResults: {[key: string]: 'good' | 'werewolf'} = {};
      
      for (const investigation of Object.values(seerContext.investigatedPlayers)) {
        const investigationData = investigation as { target: number; isGood: boolean };
        checkResults[investigationData.target.toString()] = investigationData.isGood ? 'good' : 'werewolf';
      }
      
      (additionalParams as any).checkResults = checkResults;
    }

    const votingPrompt = WerewolfPrompts.getVoting(
      this,
      context
    );

    // 添加玩家自己的内心独白历史（只保留最近3次避免prompt过长）
    let thinkingContext = '';
    if (this.thinkingHistory.length > 0) {
      thinkingContext = '\n\n## 你之前的内心独白（只有你自己知道）：\n';
      const recentThinking = this.thinkingHistory.slice(-3); // 只保留最近3次
      recentThinking.forEach((thinking, index) => {
        const actualIndex = this.thinkingHistory.length - recentThinking.length + index + 1;
        thinkingContext += `第${actualIndex}次：${thinking}\n`;
      });
    }

    return personalityPrompt + votingPrompt + thinkingContext + '\n\n注意：请严格按照投票格式返回JSON，包含target和reason字段。';
  }

  private buildAbilityPrompt(context: PlayerContext | WitchContext | SeerContext): string {
    const nightPrompt = WerewolfPrompts.getNightAction(this, context);

    // 添加玩家自己的内心独白历史（只保留最近3次避免prompt过长）
    let thinkingContext = '';
    if (this.thinkingHistory.length > 0) {
      thinkingContext = '\n\n## 你之前的内心独白（只有你自己知道）：\n';
      const recentThinking = this.thinkingHistory.slice(-3); // 只保留最近3次
      recentThinking.forEach((thinking, index) => {
        const actualIndex = this.thinkingHistory.length - recentThinking.length + index + 1;
        thinkingContext += `第${actualIndex}次：${thinking}\n`;
      });
    }

    return nightPrompt + thinkingContext;
  }

  private getTelemetryConfig(
    functionId: string,
    context?: PlayerContext
  ) {
    // 暂时禁用telemetry以避免HTTP header编码问题
    return false;

    /* 原代码保留备用
    if (!this.gameId || !this.playerId) {
      return false;
    }

    const telemetryContext: AITelemetryContext = {
      gameId: this.gameId,
      playerId: this.playerId,
      functionId,
      context,
    };

    return getAITelemetryConfig(telemetryContext);
    */
  }

  private buildPersonalityPrompt(): string {
    if (!this.config.game.strategy) {
      return '';
    }

    const personalityType = this.config.game.strategy === 'balanced' ? 'cunning' : this.config.game.strategy as PersonalityType;
    
    return WerewolfPrompts.getPersonality(personalityType) + '\n\n';
  }
}