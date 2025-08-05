import { 
  Role, 
  GamePhase,
  type StartGameParams, 
  type PlayerContext, 
  type WitchContext, 
  type SeerContext,
  type PlayerId,
  type Speech,
  PersonalityType,
  type GameContext,
  VotingResponseType,
  SpeechResponseType,
  VotingResponseSchema,
  LastWordsResponseType,
  NightActionResponseType,
  WerewolfNightActionSchema,
  SeerNightActionSchema,
  WitchNightActionSchema,
  SpeechResponseSchema,
  LastWordsResponseSchema
} from '@ai-werewolf/types';
import { WerewolfPrompts } from './prompts';
import { generateObject } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { withLangfuseErrorHandling, getAITelemetryConfig } from '@ai-werewolf/lib';
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
    
    if (this.config.logging.enabled) {
      console.log(`🎮 ${this.config.game.name} started game ${this.gameId} as ${this.role}`);
      console.log(`👤 Player ID: ${this.playerId}`);
      if (this.teammates && this.teammates.length > 0) {
        console.log(`🤝 Teammates: ${this.teammates.join(', ')}`);
      }
      console.log(`📊 Game ID (trace): ${this.gameId}`);
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

  // TODO: 遗言功能暂时注释，待后续实现
  async lastWords(): Promise<string> {
    // if (!this.role || !this.config.ai.apiKey) {
    //   return "很遗憾要离开游戏了，希望好人阵营能够获胜！";
    // }

    // const lastWordsResponse = await this.generateLastWords();
    // return lastWordsResponse.content;
    
    // 暂时返回默认遗言
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
        name: this.config.game.name,
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

  // AI生成方法
  private async generateSpeech(context: PlayerContext): Promise<SpeechResponseType> {
    const prompt = this.buildSpeechPrompt(context);
    
    console.log('📝 Speech generation prompt:', prompt);
    console.log('📋 SpeechResponseSchema:', JSON.stringify(SpeechResponseSchema.shape, null, 2));
    
    try {
      const result = await generateObject({
        model: this.getModel(),
        schema: SpeechResponseSchema,
        prompt: prompt,
        maxOutputTokens: this.config.ai.maxTokens,
        temperature: this.config.ai.temperature,
        experimental_telemetry: this.getTelemetryConfig('speech-generation', { role: this.role, phase: context.currentPhase }),
      });

      console.log('🎯 Speech generation result:', JSON.stringify(result.object, null, 2));
      return result.object as SpeechResponseType;
    } catch (error) {
      console.error('AI speech generation failed:', error);
      throw new Error(`Failed to generate speech: ${error}`);
    }
  }

  private async generateVote(context: PlayerContext): Promise<VotingResponseType> {
    const prompt = this.buildVotePrompt(context);
    
    console.log('📝 Vote generation prompt:', prompt);
    console.log('📋 VotingResponseSchema:', JSON.stringify(VotingResponseSchema.shape, null, 2));
    
    try {
      const result = await generateObject({
        model: this.getModel(),
        schema: VotingResponseSchema,
        prompt: prompt,
        maxOutputTokens: this.config.ai.maxTokens,
        temperature: this.config.ai.temperature,
        experimental_telemetry: this.getTelemetryConfig('vote-generation', { role: this.role }),
      });

      console.log('🎯 Vote generation result:', JSON.stringify(result.object, null, 2));
      return result.object as VotingResponseType;
    } catch (error) {
      console.error('AI vote generation failed:', error);
      throw new Error(`Failed to generate vote: ${error}`);
    }
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
    
    console.log('📝 Ability generation prompt:', prompt);
    console.log('📋 Night action schema:', JSON.stringify(schema.shape, null, 2));
    
    try {
      const result = await generateObject({
        model: this.getModel(),
        schema: schema,
        prompt: prompt,
        maxOutputTokens: this.config.ai.maxTokens,
        temperature: this.config.ai.temperature,
        experimental_telemetry: this.getTelemetryConfig('ability-generation', { role: this.role, phase: context.currentPhase }),
      });

      console.log('🎯 Ability generation result:', JSON.stringify(result.object, null, 2));
      return result.object as NightActionResponseType;
    } catch (error) {
      console.error('AI ability generation failed:', error);
      throw new Error(`Failed to generate ability use: ${error}`);
    }
  }

  // TODO: 遗言功能暂时注释，待后续实现
  // private async generateLastWords(): Promise<LastWordsResponseType> {
  //   const prompt = this.buildLastWordsPrompt();
  //   
  //   console.log('📝 Last words generation prompt:', prompt);
  //   console.log('📋 LastWordsResponseSchema:', JSON.stringify(LastWordsResponseSchema.shape, null, 2));
  //   
  //   try {
  //     const { object } = await generateObject({
  //       model: this.getModel(),
  //       schema: LastWordsResponseSchema,
  //       prompt: prompt,
  //       mode: 'json',
  //       maxTokens: this.config.ai.maxTokens,
  //       temperature: 0.9, // 遗言可以更有情感
  //       experimental_telemetry: this.getTelemetryConfig('last-words-generation', { role: this.role }),
  //     });

  //     console.log('🎯 Last words generation result:', JSON.stringify(object, null, 2));
  //     return object;
  //   } catch (error) {
  //     console.error('AI last words generation failed:', error);
  //     throw new Error(`Failed to generate last words: ${error}`);
  //   }
  // }

  // Prompt构建方法
  private buildSpeechPrompt(context: PlayerContext): string {
    const speechPrompt = WerewolfPrompts.getSpeech(
      this,
      context
    );

    return speechPrompt + '\n\n注意：发言内容控制在30-80字，语言自然，像真人玩家。';
  }

  private buildVotePrompt(context: PlayerContext): string {
    const votingParams = {
      playerId: this.playerId!,
      role: this.mapRoleToString(this.role!),
      speechSummary: this.buildSpeechHistory(context),
      currentVotes: context.allVotes,
    };

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
    const personalityPrompt = this.buildPersonalityPrompt();
    
    const nightParams = {
      playerId: this.playerId!,
      role: this.role!,
      alivePlayers: context.alivePlayers,
      currentRound: context.round,
      historyEvents: ['夜间行动阶段'],
      customContent: personalityPrompt,
      teammates: this.teammates
    };
    
    let additionalParams: Record<string, unknown> = {};
    if (this.role === Role.WITCH && 'killedTonight' in context) {
      additionalParams = {
        killedTonight: context.killedTonight,
        potionUsed: context.potionUsed
      };
    }
    
    const nightPrompt = WerewolfPrompts.getNightAction(this, context);
    
    return nightPrompt;
  }

  // TODO: 遗言功能暂时注释，待后续实现
  // private buildLastWordsPrompt(): string {
  //   const personalityPrompt = this.buildPersonalityPrompt();

  //   const lastWordsParams = {
  //     playerId: this.playerId!,
  //     playerName: this.config.game.name,
  //     role: this.mapRoleToString(this.role!),
  //     killedBy: 'vote' as const,
  //     alivePlayers: [],
  //     importantInfo: this.teammates ? `队友：${this.teammates.join('、')}` : undefined,
  //     customContent: personalityPrompt
  //   };

  //   // 创建一个简单的 context 给 getLastWords 使用
  //   const lastWordsContext: PlayerContext = {
  //     round: 0,
  //     currentPhase: GamePhase.VOTING,
  //     alivePlayers: [],
  //     allSpeeches: {},
  //     allVotes: {}
  //   };
  //   
  //   const lastWordsPrompt = WerewolfPrompts.getLastWords(this, lastWordsContext);

  //   return lastWordsPrompt + '\n\n注意：遗言内容控制在30-80字，语言有情感，像真实玩家。';
  // }

  // 辅助方法
  private getModel() {
    const openrouter = createOpenAICompatible({
      name: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.config.ai.apiKey || process.env.OPENROUTER_API_KEY,
    });
    
    return openrouter.chatModel(this.config.ai.model);
  }

  private getTelemetryConfig(functionId: string, _metadata: any = {}) {
    return withLangfuseErrorHandling(() => {
      if (!this.gameId) {
        return { isEnabled: false };
      }
      
      return getAITelemetryConfig(
        this.gameId,
        this.config.game.name || 'unknown-player',
        this.gameId,
        functionId,
      );
    })() || { isEnabled: false };
  }

  private mapRoleToString(role: Role): string {
    switch (role) {
      case Role.WEREWOLF:
        return '狼人';
      case Role.VILLAGER:
        return '村民';
      case Role.SEER:
        return '预言家';
      case Role.WITCH:
        return '女巫';
      default:
        return '未知角色';
    }
  }

  private buildSpeechHistory(context: PlayerContext): Speech[] {
    if (!context.allSpeeches) {
      return [];
    }
    
    const speeches: Speech[] = [];
    
    for (const [, playerSpeeches] of Object.entries(context.allSpeeches)) {
      for (const [, speech] of Object.entries(playerSpeeches)) {
        if (speech && speech.type === 'player') {
          speeches.push(speech);
        }
      }
    }
    
    return speeches;
  }

  private buildPersonalityPrompt(): string {
    if (!this.config.game.strategy) {
      return '';
    }

    const personalityType = this.config.game.strategy === 'balanced' ? 'cunning' : this.config.game.strategy as PersonalityType;
    
    return WerewolfPrompts.getPersonality(personalityType) + '\n\n';
  }
}