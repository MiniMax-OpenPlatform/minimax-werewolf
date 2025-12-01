import { makeAutoObservable, computed } from 'mobx';
import { OperationLogSystem, RoleAssignment, SpeechSystem } from '@ai-werewolf/lib';
import { createGameTrace, initializeLangfuse } from './langfuse';
import { GamePhase, type NightTempState, Role, type PlayerId, type Round, type SeerAbilityResponse, type WerewolfAbilityResponse, WinCondition, type WitchAbilityResponse, type InvestigatedPlayers, type AllVotes, type Vote } from '@ai-werewolf/types';
import type { GameLog, GameLogPlayerInfo } from '@ai-werewolf/types';
import { type Client } from './Client';
import { type Player, isWerewolfPlayer, isSeerPlayer, isWitchPlayer, createPlayer, type WitchPlayer } from './Player';
import { PlayerAPIClient } from './PlayerAPIClient';
import { getPlayerServiceUrl } from './playerConfig';

export class GameMaster {
  // 单个游戏实例的属性
  public readonly gameId: string;
  public clients: Client[] = [];
  public currentPhase: GamePhase = GamePhase.PREPARING;
  public round: Round = 0;
  public votes: Record<number, number> = {};
  public nightTemp: NightTempState = {};
  public seerResult:InvestigatedPlayers = {}
  public lastWerewolfKill: number | undefined = undefined;  // 记录上次狼人击杀的目标
  public isProcessingPhase: boolean = false;  // 是否正在处理阶段转换

  public speechSystem: SpeechSystem = new SpeechSystem();
  public operationLogSystem: OperationLogSystem = new OperationLogSystem();
  public allVotes: AllVotes = {};
  public gameLog: GameLog | null = null;

  constructor(gameId: string, playerCount?: number) {
    this.gameId = gameId;
    makeAutoObservable(this, {
      gameId: false, // readonly property
      recentOperationLogs: computed,
      operationLogSystem: true, // 确保operationLogSystem是observable
      speechSystem: true, // 确保speechSystem是observable
      gameLog: true, // 确保gameLog是observable
    });
    
    initializeLangfuse();
    createGameTrace(gameId);
    console.log(`🎮 Created GameMaster for game ${gameId} with Langfuse trace ${this.gameId}`);
    
    if (playerCount) {
      this.init(playerCount);
    }
  }

  private init(playerCount: number): void {
    this.operationLogSystem.logSystemAction(`游戏创建成功，等待${playerCount}个玩家加入`);
    console.log(`🎮 GameMaster initialized for game ${this.gameId} with Langfuse trace ${this.gameId}`);
  }

  getInvestigatedPlayers(): InvestigatedPlayers {
    return this.seerResult
  }

  getGameState() {
    return {
      currentPhase: this.currentPhase,
      round: this.round,
      players: this.players.map(p => {
        const client = this.clients.find(c => c.id === p.id);
        return {
          id: p.id,
          isAlive: p.isAlive,
          role: p.role,
          personality: p.personality,
          voiceId: client?.voiceId
        };
      })
    };
  }

  public get alivePlayers() {
    return this.players.filter(c => c.isAlive);
  }

  // 通用函数：获取指定类型的活着的玩家（返回第一个）
  private getAlivePlayerOfType<T extends Player>(
    typeGuard: (p: Player) => p is T
  ): T | null {
    const players = this.players.filter((p): p is T => 
      typeGuard(p) && p.isAlive
    );
    return players.length > 0 ? players[0] : null;
  }

  public get players(): Player[] {
    return this.clients
      .filter(c => c.player)
      .map(c => c.player!);
  }

  private processWerewolfAction(result: WerewolfAbilityResponse): void {
    if(result.action == 'idle') return
    this.nightTemp.werewolfTarget = result.target;
    this.lastWerewolfKill = result.target;  // 记录狼人击杀目标，供后续白天发言使用
    console.log(`🎯 Werewolf target: ${result.target}`);
  }

  private processWitchAction(player: WitchPlayer, result: WitchAbilityResponse): void {
    // 处理女巫的行动
    if (result.action === 'using') {
      // 检查是否对同一个目标使用两种药水
      if (result.healTarget > 0 && result.poisonTarget > 0 && result.healTarget === result.poisonTarget) {
        console.log(`⚠️ 女巫不能对同一个玩家同时使用解药和毒药`);
        this.operationLogSystem.logPlayerResponse(player.id, '能力使用失败', `尝试对玩家${result.healTarget}同时使用解药和毒药`);
        return;
      }

      if (result.healTarget > 0) {
        if (!player.hasHealPotion()) {
          console.log(`女巫没有解药了`);
          this.operationLogSystem.logPlayerResponse(player.id, '能力使用失败', '解药已用完');
        } else {
          this.nightTemp!.witchHealTarget = result.healTarget;
          player.healUsedOn = result.healTarget; // 更新药水使用状态
          console.log(`💊 Witch heal target: ${result.healTarget}`);
          this.operationLogSystem.logPlayerResponse(player.id, '使用解药', `救了玩家${result.healTarget}`);
        }
      }

      if (result.poisonTarget > 0) {
        if (!player.hasPoisonPotion()) {
          console.log(`女巫没有毒药了`);
          this.operationLogSystem.logPlayerResponse(player.id, '能力使用失败', '毒药已用完');
        } else {
          this.nightTemp!.witchPoisonTarget = result.poisonTarget;
          player.poisonUsedOn = result.poisonTarget; // 更新药水使用状态
          console.log(`☠️ Witch poison target: ${result.poisonTarget}`);
          this.operationLogSystem.logPlayerResponse(player.id, '使用毒药', `毒了玩家${result.poisonTarget}`);
        }
      }
    } else {
      console.log(`💤 Witch chose not to use potions`);
      this.operationLogSystem.logPlayerResponse(player.id, '不使用能力', '选择不使用药水');
    }
  }

  private processSeerAction(result: SeerAbilityResponse): void {
    const targetPlayer = this.players.find(p => p.id === result.target);
    
    if (!targetPlayer) {
      console.error(`❌ 预言家查验失败：找不到玩家ID ${result.target}`);
      return;
    }
    
    const isGood = targetPlayer.role !== Role.WEREWOLF;
    
    console.log(`🔮 预言家查验结果：
      - 目标玩家ID: ${result.target}
      - 目标角色: ${targetPlayer.role}
      - 是否为好人: ${isGood}
      - 结果解释: ${isGood ? '好人' : '狼人'}`);
    
    this.seerResult[this.round] = {
      target: result.target,
      isGood: isGood,
    };
  }

  /**
   * 计算夜晚死亡的玩家
   * @returns 
   */
  private calculateNightDeaths(): PlayerId[] {
    const deaths: PlayerId[] = [];
    const nightTemp = this.nightTemp;

    if (!nightTemp) return deaths;

    // 如果狼人杀了人
    if (nightTemp.werewolfTarget) {
      // 检查女巫是否救了这个人
      if (nightTemp.witchHealTarget && nightTemp.witchHealTarget === nightTemp.werewolfTarget) {
        console.log(`🧙 Witch saved player${nightTemp.werewolfTarget} from werewolf attack`);
      } else {
        // 女巫没救，这个人死了
        deaths.push(nightTemp.werewolfTarget);
      }
    }

    // 如果女巫毒了人
    if (nightTemp.witchPoisonTarget) {
      deaths.push(nightTemp.witchPoisonTarget);
    }

    return deaths;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 延迟辅助方法，用于等待TTS播放完成
   * @param ms 延迟毫秒数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  async createGame(playerCount: number): Promise<string> {
    // 游戏ID已经在构造函数中设置
    this.operationLogSystem.logSystemAction(`游戏创建成功，等待${playerCount}个玩家加入`);
    console.log(`🎮 GameMaster initialized for game ${this.gameId} with Langfuse trace ${this.gameId}`);
    return this.gameId;
  }

  async startGame(): Promise<void> {
    // 标记正在处理阶段（防止用户在夜晚行动期间点击下一步）
    console.log('[GameMaster] startGame: Setting isProcessingPhase = true');
    this.isProcessingPhase = true;

    try {
      this.currentPhase = GamePhase.NIGHT;
      this.round++;

      // 记录操作日志
      this.operationLogSystem.logSystemAction('游戏正式开始！');
      this.operationLogSystem.logPhaseChange('夜晚', 1);

      // 添加游戏开始的系统通知
      await this.addSpeech(-1, '[系统] 游戏开始！现在是第1天夜晚。', 'system');

      // 通知所有AI玩家游戏开始和他们的角色
      await this.notifyPlayersGameStart();

      await this.triggerPhaseActions();
    } finally {
      // 阶段处理完成，允许点击下一步
      console.log('[GameMaster] startGame: Setting isProcessingPhase = false');
      this.isProcessingPhase = false;
    }
  }

  private async notifyPlayersGameStart(): Promise<void> {
    console.log(`🔔 Starting to notify ${this.players.length} players...`);

    for (let i = 0; i < this.clients.length; i++) {
      const client = this.clients[i];
      const player = client.player!;
      const url = client.url;

      // 获取队友（如果是狼人）
      const teammates = player.role === Role.WEREWOLF
        ? this.players.filter(p => p.role === Role.WEREWOLF).map(p => p.id)
        : [];

      try {
        await player.startGame(teammates);
        console.log(`✅ Successfully notified ${player.id} (${player.role}) at ${url}`);
      } catch (error) {
        console.error(`❌ Failed to notify player ${player.id} at ${url}`, error);
      }
    }

    console.log(`🔔 Finished notifying all players.`);
  }

  private async triggerPhaseActions(): Promise<void> {
    console.log(`🎭 Triggering actions for phase: ${this.currentPhase}`);

    switch (this.currentPhase) {
      case GamePhase.NIGHT:
        await this.triggerNightActions();
        break;
      case GamePhase.DAY:
        await this.triggerDayActions();
        break;
      case GamePhase.VOTING:
        await this.triggerVotingActions();
        break;
      default:
        console.log(`⏸️ No actions defined for phase: ${this.currentPhase}`);
    }
  }

  private async triggerNightActions(): Promise<void> {
    console.log(`🌙 Night phase - triggering werewolf and special role actions`);

    // 初始化夜间暂存状态
    this.nightTemp = {};

    // 狼人夜间杀人
    const leadWerewolf = this.getAlivePlayerOfType(isWerewolfPlayer);

    if (leadWerewolf) {
      // 添加主持人提示："狼人请杀人"
      await this.addSpeech(-1, '狼人请杀人', 'system');

      // 等待TTS播放完成（沉浸模式体验优化）
      await this.delay(3500);

      console.log(`🐺 Asking ${leadWerewolf.id} to choose kill target`);
      this.operationLogSystem.logPlayerRequest(leadWerewolf.id, '选择杀害目标');

      const result = await leadWerewolf.useAbility(this);

      if (result) {
        // 记录狼人行动结果（包含trace_id）
        this.operationLogSystem.logPlayerResponse(
          leadWerewolf.id,
          '夜间杀害',
          `行动:${result.action}, 击杀玩家${result.target}。${result.reason}`,
          result.traceId
        );

        // 处理狼人杀人目标
        this.processWerewolfAction(result);

        // 添加夜间行动文字显示（不播放TTS），包含thinking
        if (result.action === 'kill' && result.target) {
          await this.addSpeech(-1, `狼人杀 ${result.target} 号`, 'night_action', result.thinking);
        }

        // 记录狼人夜间行动到游戏日志
        if (this.gameLog) {
          this.gameLog.nightActions.push({
            round: this.round,
            playerId: leadWerewolf.id,
            role: 'WEREWOLF',
            action: result.action,
            target: result.target,
            reason: result.reason,
            thinking: result.thinking,
            traceId: result.traceId,
            timestamp: new Date().toISOString()
          });
        }

      } else {
        this.operationLogSystem.logResult(`狼人 ${leadWerewolf.id} 行动失败`);
      }
    }

    // 预言家查验
    const seer = this.getAlivePlayerOfType(isSeerPlayer);
    if (seer) {
      // 添加主持人提示："预言家请指认"
      await this.addSpeech(-1, '预言家请指认', 'system');

      // 等待TTS播放完成（沉浸模式体验优化）
      await this.delay(3500);

      console.log(`🔮 Asking ${seer.id} to choose investigation target`);
      this.operationLogSystem.logPlayerRequest(seer.id, '选择查验目标');

      const result = await seer.useAbility(this);

      if (result) {
        // 记录预言家查验结果（包含trace_id）
        this.operationLogSystem.logPlayerResponse(
          seer.id,
          '夜间查验',
          `查验玩家${result.target}。${result.reason}`,
          result.traceId
        );

        // 处理预言家查验结果
        this.processSeerAction(result);

        // 添加夜间行动文字显示（不播放TTS），包含thinking
        if (result.target) {
          await this.addSpeech(-1, `预言家指认 ${result.target} 号`, 'night_action', result.thinking);
        }

        // 记录预言家夜间行动到游戏日志
        if (this.gameLog) {
          this.gameLog.nightActions.push({
            round: this.round,
            playerId: seer.id,
            role: 'SEER',
            action: result.action,
            target: result.target,
            reason: result.reason,
            thinking: result.thinking,
            traceId: result.traceId,
            timestamp: new Date().toISOString()
          });
        }

        // seerResult已经保存，不添加到公开speech以免暴露身份
      } else{
        this.operationLogSystem.logResult(`预言家 ${seer.id} 查验失败`);
      }
    }

    // 女巫行动
    const witch = this.getAlivePlayerOfType(isWitchPlayer);
    if (witch) {
      // 添加主持人提示："女巫请确认是否使用药水"
      await this.addSpeech(-1, '女巫请确认是否使用药水', 'system');

      // 等待TTS播放完成（沉浸模式体验优化）
      await this.delay(3500);

      console.log(`🧙 Asking ${witch.id} to use abilities`);
      this.operationLogSystem.logPlayerRequest(witch.id, '是否使用药水');

      try {
        // 调用API
        const result = await witch.useAbility(this);

        if (result) {
          // 构建行动描述
          let actionDesc = '';
          if (result.action === 'using') {
            if (result.healTarget > 0) {
              actionDesc += `救了玩家${result.healTarget}。${result.healReason} `;
            }
            if (result.poisonTarget > 0) {
              actionDesc += `毒了玩家${result.poisonTarget}。${result.poisonReason}`;
            }
          } else {
            actionDesc = '选择不使用药水。' + (result.healReason || result.poisonReason || '');
          }

          // 记录女巫行动结果（包含trace_id）
          this.operationLogSystem.logPlayerResponse(witch.id, '药水使用', actionDesc, result.traceId);

          // 处理女巫的行动
          this.processWitchAction(witch,result);

          // 添加夜间行动文字显示（不播放TTS），包含thinking
          if (result.action === 'using') {
            if (result.healTarget > 0 && result.poisonTarget > 0) {
              await this.addSpeech(-1, `女巫使用解药救 ${result.healTarget} 号，使用毒药毒 ${result.poisonTarget} 号`, 'night_action', result.thinking);
            } else if (result.healTarget > 0) {
              await this.addSpeech(-1, `女巫使用解药救 ${result.healTarget} 号`, 'night_action', result.thinking);
            } else if (result.poisonTarget > 0) {
              await this.addSpeech(-1, `女巫使用毒药毒 ${result.poisonTarget} 号`, 'night_action', result.thinking);
            }
          }

          // 记录女巫夜间行动到游戏日志
          if (this.gameLog) {
            this.gameLog.nightActions.push({
              round: this.round,
              playerId: witch.id,
              role: 'WITCH',
              action: result.action,
              healTarget: result.healTarget,
              poisonTarget: result.poisonTarget,
              healReason: result.healReason,
              poisonReason: result.poisonReason,
              thinking: result.thinking,
              traceId: result.traceId,
              timestamp: new Date().toISOString()
            });
          }

          // 女巫行动已记录到operationLog，不添加到公开speech以免暴露身份
        } else {
          this.operationLogSystem.logResult(`女巫 ${witch.id} 行动失败`);
        }
      } catch (error) {
        console.error(`Error getting witch action:`, error);
      }
    }

    // 处理夜间最终死亡结果
    const deaths = this.calculateNightDeaths();

    if (deaths.length > 0) {
      for (const playerId of deaths) {
        const victim = this.players.find(p => p.id === playerId);
        if (victim && victim.isAlive) {
          victim.isAlive = false;
          console.log(`💀 ${victim.id} died during the night`);
          this.operationLogSystem.logResult(`${victim.id} 在夜间死亡`);

          // 更新游戏日志中的玩家状态
          if (this.gameLog) {
            // 判断死亡原因（被狼人击杀或被女巫毒死）
            const deathReason = this.nightTemp.witchPoisonTarget === playerId ? 'poison' : 'werewolf_kill';

            // 更新玩家状态
            const playerInfo = this.gameLog.players.find(p => p.id === playerId);
            if (playerInfo) {
              playerInfo.isAlive = false;
              playerInfo.deathRound = this.round;
              playerInfo.deathReason = deathReason;
            }

            // 记录死亡事件
            this.gameLog.events.push({
              type: 'player_death',
              description: `玩家${playerId}在夜间死亡`,
              data: { playerId, reason: deathReason },
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // 添加死亡公告
      const victimNames = deaths.map(id => this.players.find(p => p.id === id)?.id).filter(Boolean);
      await this.addSpeech(-1, `[系统] 昨晚 ${victimNames.join('、')} 死亡了！`, 'system');
      
      // 检查游戏是否结束
      const winCondition = await this.getWinCondition();
      if (winCondition !== WinCondition.ONGOING) {
        return; // 游戏已结束，停止继续执行
      }
    } else {
      // 如果没有人被杀死，也要公告
      await this.addSpeech(-1, '🌅 昨晚是平安夜，没有人死亡。', 'system');
    }

    // 夜间阶段完成
    this.operationLogSystem.logPhaseComplete('夜间', '🌙 夜间阶段完成，所有夜间行动已结束，可以进入白天阶段');
  }



  private async triggerDayActions(): Promise<void> {
    console.log(`☀️ Day phase - triggering discussion`);
    console.log(`Total players: ${this.players.length}, Alive: ${this.alivePlayers.length}`);

    // 让所有存活玩家发言
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      console.log(`Checking player ${player.id}: isAlive=${player.isAlive}`);

      if (!player.isAlive) {
        console.log(`Skipping dead player ${player.id}`);
        continue;
      }

      console.log(`💬 Asking ${player.id} to speak in day discussion`);
      this.operationLogSystem.logPlayerRequest(player.id, '发言');

      try {
        console.log(`Calling player.speak() for player ${player.id}...`);
        const result = await player.speak(this);
        console.log(`Player ${player.id} speak result:`, result);

        if (result) {
          // 记录发言结果
          this.operationLogSystem.logPlayerResponse(player.id, '发言', `"${result.speech}"`);

          // 添加玩家发言（包括内心独白和traceId）
          await this.addSpeech(player.id, result.speech, 'player', result.thinking, result.traceId);
        } else {
          console.warn(`Player ${player.id} returned null response`);
          this.operationLogSystem.logResult(`${player.id} 发言失败`);
        }
      } catch (error) {
        console.error(`❌ Player ${player.id} speak failed:`, error);
        this.operationLogSystem.logResult(`${player.id} 发言失败: ${error}`);
      }
    }

    console.log(`✅ Day phase discussion completed`);
    // 白天阶段完成
    this.operationLogSystem.logPhaseComplete('白天', '☀️ 白天阶段完成，所有玩家发言已结束，可以进入投票阶段');
  }

  private async triggerVotingActions(): Promise<void> {
    console.log(`🗳️ Voting phase - collecting votes`);

    // 让所有存活玩家投票
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.isAlive) continue;

      console.log(`🗳️ Asking ${player.id} to vote`);
      this.operationLogSystem.logPlayerRequest(player.id, '投票');

      // 添加主持人提示："X号请投票"
      await this.addSpeech(-1, `${player.id} 号请投票`, 'system');

      const result = await player.vote(this);

      if (result) {
        // 记录投票结果，包含投票理由和trace_id
        this.operationLogSystem.logPlayerResponse(
          player.id,
          '投票',
          `投给 ${result.target}。理由：${result.reason}`,
          result.traceId
        );

        // 添加简短的投票声明（只说"我投X号"，不说理由）
        await this.addSpeech(
          player.id,
          `我投 ${result.target} 号`,
          'player',
          result.thinking,
          result.traceId
        );

        // 记录投票到游戏日志
        if (this.gameLog) {
          this.gameLog.votes.push({
            round: this.round,
            voterId: player.id,
            targetId: result.target,
            reason: result.reason,
            thinking: result.thinking,
            traceId: result.traceId,
            timestamp: new Date().toISOString()
          });
        }

        // 查找被投票的玩家ID
        const targetPlayer = this.players.find(p => p.id === result.target);
        if (targetPlayer) {
          await this.castVote(player.id, targetPlayer.id);
        }
      } else {
        this.operationLogSystem.logResult(`${player.id} 投票失败`);
      }
    }

    // 处理投票结果
    this.operationLogSystem.logSystemAction('开始统计投票结果');
    const eliminatedPlayerId = await this.processVotes();
    if (eliminatedPlayerId) {
      const eliminatedPlayer = this.players.find(p => p.id === eliminatedPlayerId);
      if (eliminatedPlayer) {
        console.log(`⚰️ ${eliminatedPlayer.id} was eliminated by vote`);

        // 记录淘汰结果
        this.operationLogSystem.logResult(`${eliminatedPlayer.id} 被投票淘汰！`);

        // 添加淘汰公告
        await this.addSpeech(-1, `[系统] ${eliminatedPlayer.id} 被投票淘汰了！`, 'system');
        
        // 检查游戏是否结束
        const winCondition = await this.getWinCondition();
        if (winCondition !== WinCondition.ONGOING) {
          return; // 游戏已结束，停止继续执行
        }
      }
    } else {
      this.operationLogSystem.logResult('投票平票，无人被淘汰');
      await this.addSpeech(-1, '🤝 投票平票，无人被淘汰！', 'system');
    }

    // 投票阶段完成
    this.operationLogSystem.logPhaseComplete('投票', '🗳️ 投票阶段完成，投票结果已处理，可以进入下一阶段');
  }

  // This GameMaster instance manages a single game, so getGameState is not needed

  async addPlayer(playerId: number, url: string, personality?: string, voiceId?: string): Promise<void> {
    console.log(`👤 Adding player ${playerId} to game ${this.gameId}`);

    // 只添加客户端信息，角色信息在assignRoles时分配
    const client: Client = {
      id: playerId,
      url: url,
      personality: personality,
      voiceId: voiceId
    };

    this.clients.push(client);
    this.operationLogSystem.logSystemAction(`玩家 ${playerId} 加入游戏`);
    console.log(`✅ Client ${playerId} added to game ${this.gameId} with voice: ${voiceId || 'default'}`);
  }

  async assignRoles(): Promise<void> {
    this.operationLogSystem.logSystemAction(`开始为 ${this.clients.length} 个玩家分配角色`);
    const roleConfigs = RoleAssignment.getDefaultRoleConfig(this.clients.length);

    // 生成并打乱角色数组
    const roles: Role[] = roleConfigs.flatMap(config =>
      Array(config.count).fill(config.role)
    );
    const shuffledRoles = this.shuffleArray(roles);

    // 为每个客户端分配角色并创建Player对象
    this.clients.forEach((client, index) => {
      const assignedRole = shuffledRoles[index];
      const playerAPIClient = new PlayerAPIClient(client.id, client.url);

      // 使用工厂函数创建正确的Player类实例
      client.player = createPlayer(
        assignedRole,
        client.id,
        playerAPIClient,
        this.gameId,
        index,
        client.personality
      );

      console.log(`🎭 Player ${client.id} assigned role: ${assignedRole}, personality: ${client.personality || '默认'}`);
    });

    // 初始化游戏日志（在内存中构建）
    const config = {
      playerCount: this.clients.length,
      roles: {
        werewolf: roleConfigs.find(r => r.role === Role.WEREWOLF)?.count || 0,
        seer: roleConfigs.find(r => r.role === Role.SEER)?.count || 0,
        witch: roleConfigs.find(r => r.role === Role.WITCH)?.count || 0,
        villager: roleConfigs.find(r => r.role === Role.VILLAGER)?.count || 0
      }
    };

    // 设置玩家信息
    const playerInfos: GameLogPlayerInfo[] = this.players.map(p => ({
      id: p.id,
      role: p.role,
      isAlive: p.isAlive
    }));

    // 初始化游戏日志对象
    this.gameLog = {
      gameId: this.gameId,
      startTime: new Date().toISOString(),
      config,
      players: playerInfos,
      totalRounds: 0,
      speeches: [],
      votes: [],
      nightActions: [],
      events: [
        {
          type: 'game_start',
          description: '游戏开始',
          timestamp: new Date().toISOString()
        }
      ]
    };
  }

  async nextPhase(): Promise<GamePhase> {
    // 检查游戏是否已经结束
    if (this.currentPhase === GamePhase.ENDED) {
      console.log('🏁 Game has already ended, cannot advance phase');
      return this.currentPhase;
    }

    // 标记正在处理阶段
    console.log('[GameMaster] Setting isProcessingPhase = true');
    this.isProcessingPhase = true;

    try {
      // 直接实现阶段切换逻辑
      const phaseOrder = [GamePhase.NIGHT, GamePhase.DAY, GamePhase.VOTING];
      const currentIndex = phaseOrder.indexOf(this.currentPhase);
      const nextIndex = (currentIndex + 1) % phaseOrder.length;
      this.currentPhase = phaseOrder[nextIndex];

      if (this.currentPhase === GamePhase.NIGHT) {
        this.round++;

        // 更新游戏日志的轮次
        if (this.gameLog) {
          this.gameLog.totalRounds = this.round;
        }
      }

      // 阶段名称映射
      const phaseNamesShort = {
        [GamePhase.PREPARING]: '准备',
        [GamePhase.NIGHT]: '夜晚',
        [GamePhase.DAY]: '白天',
        [GamePhase.VOTING]: '投票',
        [GamePhase.ENDED]: '结束'
      };

      const phaseNames = {
        [GamePhase.PREPARING]: '准备阶段',
        [GamePhase.NIGHT]: '夜晚',
        [GamePhase.DAY]: '白天',
        [GamePhase.VOTING]: '投票',
        [GamePhase.ENDED]: '游戏结束'
      };

      // 记录阶段切换
      this.operationLogSystem.logPhaseChange(phaseNamesShort[this.currentPhase], this.round);

      // 记录阶段切换事件到游戏日志
      if (this.gameLog) {
        this.gameLog.events.push({
          type: `${this.currentPhase}_start`,
          description: `进入${phaseNamesShort[this.currentPhase]}阶段`,
          data: { phase: this.currentPhase, round: this.round },
          timestamp: new Date().toISOString()
        });
      }

      // 添加阶段切换的系统通知

      const phaseEmojis = {
        [GamePhase.PREPARING]: '⏳',
        [GamePhase.NIGHT]: '🌙',
        [GamePhase.DAY]: '☀️',
        [GamePhase.VOTING]: '🗳️',
        [GamePhase.ENDED]: '🏁'
      };

      await this.addSpeech(-1, `${phaseEmojis[this.currentPhase]} 现在是第${this.round}天${phaseNames[this.currentPhase]}`, 'system');

      console.log(`🔄 Game ${this.gameId} advanced to phase: ${this.currentPhase}, day: ${this.round}`);

      // 触发对应阶段的AI玩家行动
      await this.triggerPhaseActions();

      return this.currentPhase;
    } finally {
      // 阶段处理完成，允许点击下一步
      console.log('[GameMaster] Setting isProcessingPhase = false');
      this.isProcessingPhase = false;
    }
  }

  async castVote(voterId: number, targetId: number): Promise<void> {
    if (!this.votes) {
      this.votes = {};
    }

    this.votes[voterId] = targetId;
    
    // 同时记录到 allVotes 中
    if (!this.allVotes[this.round]) {
      this.allVotes[this.round] = [];
    }
    
    // 检查是否已经有这个投票者的记录，如果有则更新，否则添加新记录
    const existingVoteIndex = this.allVotes[this.round].findIndex(vote => vote.voterId === voterId);
    const newVote: Vote = { voterId, targetId };
    
    if (existingVoteIndex >= 0) {
      this.allVotes[this.round][existingVoteIndex] = newVote;
    } else {
      this.allVotes[this.round].push(newVote);
    }
  }

  async processVotes(): Promise<number | null> {
    const voteCounts = this.countVotes(this.votes || {});
    const eliminatedPlayerId = this.determineElimination(voteCounts);

    if (eliminatedPlayerId) {
      await this.eliminatePlayer(eliminatedPlayerId);
    }

    // Clear votes after processing
    this.votes = {};

    return eliminatedPlayerId;
  }

  async eliminatePlayer(playerId: number): Promise<void> {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isAlive = false;

      // 更新游戏日志中的玩家状态
      if (this.gameLog) {
        // 更新玩家状态
        const playerInfo = this.gameLog.players.find(p => p.id === playerId);
        if (playerInfo) {
          playerInfo.isAlive = false;
          playerInfo.deathRound = this.round;
          playerInfo.deathReason = 'vote';
        }

        // 记录死亡事件
        this.gameLog.events.push({
          type: 'player_death',
          description: `玩家${playerId}被投票淘汰`,
          data: { playerId, reason: 'vote' },
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async getWinCondition(): Promise<WinCondition> {
    console.log(`🔍 GameMaster.getWinCondition called for gameId: ${this.gameId}`);
    console.log(`✅ Checking win condition...`);
    
    // 直接在这里实现胜利条件检查逻辑
    const alivePlayers = this.players.filter(p => p.isAlive);
    const aliveWerewolves = alivePlayers.filter(p => p.role === Role.WEREWOLF);
    const aliveVillagers = alivePlayers.filter(p => p.role !== Role.WEREWOLF);

    // 游戏胜利条件判定：简单清晰
    const winCondition: WinCondition = 
      aliveWerewolves.length === 0 ? WinCondition.VILLAGERS_WIN :
      aliveWerewolves.length >= aliveVillagers.length ? WinCondition.WEREWOLVES_WIN :
      WinCondition.ONGOING;

    // 添加游戏结束的系统消息
    if (winCondition !== WinCondition.ONGOING) {
      let winner: 'werewolf' | 'villager' | 'draw' = 'draw';
      let reason = '';

      if (winCondition === WinCondition.WEREWOLVES_WIN) {
        await this.addSpeech(-1, '[系统] 游戏结束！狼人获胜！', 'system');
        winner = 'werewolf';
        reason = '狼人数量达到或超过好人数量';
      } else if (winCondition === WinCondition.VILLAGERS_WIN) {
        await this.addSpeech(-1, '[系统] 游戏结束！好人获胜！', 'system');
        winner = 'villager';
        reason = '所有狼人被淘汰';
      }

      this.currentPhase = GamePhase.ENDED;

      // 结束游戏并保存日志
      if (this.gameLog) {
        // 设置游戏结束信息
        this.gameLog.endTime = new Date().toISOString();
        this.gameLog.duration = Date.now() - new Date(this.gameLog.startTime).getTime();
        this.gameLog.result = {
          winner,
          reason,
          survivingPlayers: this.alivePlayers.map(p => p.id)
        };

        // 添加游戏结束事件
        this.gameLog.events.push({
          type: 'game_end',
          description: `游戏结束：${reason}`,
          data: { winner, reason },
          timestamp: new Date().toISOString()
        });

        // 发送日志到服务器保存
        await this.saveGameLog();
      }
    }

    console.log(`🏆 Win condition: ${winCondition}`);
    return winCondition;
  }

  private countVotes(votes: Record<number, number>): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const targetId of Object.values(votes)) {
      counts[targetId] = (counts[targetId] || 0) + 1;
    }
    return counts;
  }

  private determineElimination(voteCounts: Record<number, number>): number | null {
    let maxVotes = 0;
    let eliminatedPlayer: number | null = null;
    let tieCount = 0;

    for (const [playerId, votes] of Object.entries(voteCounts)) {
      const playerIdNum = parseInt(playerId);
      if (votes > maxVotes) {
        maxVotes = votes;
        eliminatedPlayer = playerIdNum;
        tieCount = 1;
      } else if (votes === maxVotes && votes > 0) {
        tieCount++;
      }
    }

    // 如果有平票，没有人被淘汰
    return tieCount === 1 ? eliminatedPlayer : null;
  }

  async addSpeech(playerId: number, content: string, type: 'player' | 'system' | 'night_action' = 'player', thinking?: string, traceId?: string): Promise<void> {
    const speech = {
      playerId,
      content,
      type,
      thinking,
      traceId
    };

    this.speechSystem.addSpeech(this.round, speech);

    // 记录玩家发言到游戏日志（排除系统消息）
    if (type === 'player' && this.gameLog) {
      this.gameLog.speeches.push({
        round: this.round,
        playerId,
        content,
        thinking,
        traceId,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async saveGameLog(): Promise<void> {
    if (!this.gameLog) return;

    try {
      console.log(`💾 Saving game log for game ${this.gameId}...`);
      const response = await fetch(`${getPlayerServiceUrl()}/api/game-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.gameLog)
      });

      if (!response.ok) {
        throw new Error(`Failed to save game log: ${response.statusText}`);
      }

      console.log(`✅ Game log saved successfully for game ${this.gameId}`);
    } catch (error) {
      console.error(`❌ Failed to save game log:`, error);
    }
  }

  getSpeeches() {
    return this.speechSystem.getAllSpeeches();
  }

  async getOperationLogs(): Promise<any[]> {
    return this.operationLogSystem.getLogs();
  }

  async getRecentOperationLogs(count: number): Promise<any[]> {
    return this.operationLogSystem.getRecentLogs(count);
  }

  // MobX computed 属性，用于UI组件直接访问
  get recentOperationLogs() {
    return this.operationLogSystem.getLogs(); // 移除了 slice(-20) 限制，显示所有操作记录
  }

}

// GameMaster 工厂函数 - 现在需要gameId参数
export function createGameMaster(gameId: string, playerCount?: number): GameMaster {
  return new GameMaster(gameId, playerCount);
}

// 游戏管理器 - 管理多个GameMaster实例
import { v4 as uuidv4 } from 'uuid';

class GameManager {
  private games: Map<string, GameMaster> = new Map();

  constructor() {
    makeAutoObservable(this);
  }

  createGame(playerCount: number): string {
    const gameId = uuidv4();
    const gameMaster = new GameMaster(gameId, playerCount);
    this.games.set(gameId, gameMaster);
    return gameId;
  }

  getGame(gameId: string): GameMaster | undefined {
    return this.games.get(gameId);
  }

  removeGame(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  getAllGames(): string[] {
    return Array.from(this.games.keys());
  }
}

// 全局游戏管理器实例
export const gameManager = new GameManager();

// 保持向后兼容 - 为第一个游戏创建默认实例
const defaultGameId = uuidv4();
export const gameMaster = createGameMaster(defaultGameId);