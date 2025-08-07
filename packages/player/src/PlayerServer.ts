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
  SpeechResponseSchema
} from '@ai-werewolf/types';
import { WerewolfPrompts } from './prompts';
import { generateObject } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
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

  constructor(config: PlayerConfig) {
    this.config = config;
  }

  async startGame(params: StartGameParams): Promise<void> {
    this.gameId = params.gameId;
    this.role = params.role as Role;
    this.teammates = params.teammates;
    this.playerId = params.playerId;
    
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

  async speak(context: PlayerContext): Promise<string> {
    if (!this.role || !this.config.ai.apiKey) {
      return "我需要仔细思考一下当前的情况。";
    }

    const speechResponse = await this.generateSpeech(context);
    return speechResponse.speech;
  }

  async vote(context: PlayerContext): Promise<VotingResponseType> {
    if (!this.role || !this.config.ai.apiKey) {
      return { target: 1, reason: "默认投票给玩家1" };
    }

    return await this.generateVote(context);
  }

  async useAbility(context: PlayerContext | WitchContext | SeerContext): Promise<any> {
    if (!this.role || !this.config.ai.apiKey) {
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
    
    console.log(`📝 ${functionId} prompt:`, prompt);
    console.log(`📋 ${functionId} schema:`, JSON.stringify(schema.shape, null, 2));
    
    // 获取遥测配置
    const telemetryConfig = this.getTelemetryConfig(functionId, context);
    
    try {
      const result = await generateObject({
        model: this.getModel(),
        schema: schema,
        prompt: prompt,
        maxOutputTokens: maxOutputTokens || this.config.ai.maxTokens,
        temperature: temperature ?? this.config.ai.temperature,
        // 使用 experimental_telemetry（只有在有配置时才传递）
        ...(telemetryConfig && { experimental_telemetry: telemetryConfig }),
      });

      console.log(`🎯 ${functionId} result:`, JSON.stringify(result.object, null, 2));
      
      return result.object as T;
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

    return speechPrompt + '\n\n注意：发言内容控制在30-80字，语言自然，像真人玩家。';
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

    return personalityPrompt + votingPrompt;
  }

  private buildAbilityPrompt(context: PlayerContext | WitchContext | SeerContext): string {
    const nightPrompt = WerewolfPrompts.getNightAction(this, context);
    
    return nightPrompt;
  }

  // 辅助方法
  private getModel() {
    const openrouter = createOpenAICompatible({
      name: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.config.ai.apiKey || process.env.OPENROUTER_API_KEY,
      headers: {
        'HTTP-Referer': 'https://mojo.monad.xyz',
        'X-Title': 'AI Werewolf Game',
      },
    });
    
    return openrouter.chatModel(this.config.ai.model);
  }

  private getTelemetryConfig(
    functionId: string,
    context?: PlayerContext
  ) {
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
  }

  private buildPersonalityPrompt(): string {
    if (!this.config.game.strategy) {
      return '';
    }

    const personalityType = this.config.game.strategy === 'balanced' ? 'cunning' : this.config.game.strategy as PersonalityType;
    
    return WerewolfPrompts.getPersonality(personalityType) + '\n\n';
  }
}