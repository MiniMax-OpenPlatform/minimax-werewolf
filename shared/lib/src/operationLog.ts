export interface OperationLog {
  id: string;
  sequence: number;  // 添加序列号确保正确排序
  timestamp: Date;
  type: 'phase_change' | 'player_request' | 'player_response' | 'system_action' | 'result';
  message: string;
  details?: {
    playerId?: number;
    phase?: string;
    actionType?: string;
    target?: string;
    result?: string;
  };
}

import { makeAutoObservable } from 'mobx';

export class OperationLogSystem {
  private logs: OperationLog[] = [];
  private sequenceCounter: number = 0;

  constructor() {
    makeAutoObservable(this);
  }

  addLog(log: Omit<OperationLog, 'id' | 'timestamp' | 'sequence'>): void {
    const operationLog: OperationLog = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sequence: this.sequenceCounter++,
      timestamp: new Date()
    };

    this.logs.push(operationLog);
    console.log('🔍 addLog called:', log.message, 'total logs:', this.logs.length);
  }

  getLogs(): OperationLog[] {
    return [...this.logs];
  }

  getRecentLogs(count: number): OperationLog[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
    this.sequenceCounter = 0;
  }

  // 便捷方法
  logPhaseChange(phase: string, dayCount: number): void {
    this.addLog({
      type: 'phase_change',
      message: `🔄 游戏进入${phase}阶段（第${dayCount}天）`,
      details: { phase }
    });
  }

  logPlayerRequest(playerId: number, actionType: string): void {
    this.addLog({
      type: 'player_request',
      message: `📤 询问玩家${playerId} ${actionType}`,
      details: { playerId, actionType }
    });
  }

  logPlayerResponse(playerId: number, actionType: string, result?: string): void {
    this.addLog({
      type: 'player_response',
      message: `📥 玩家${playerId} ${actionType}完成${result ? ': ' + result : ''}`,
      details: { playerId, actionType, result }
    });
  }

  logSystemAction(message: string, details?: any): void {
    this.addLog({
      type: 'system_action',
      message: `⚙️ ${message}`,
      details
    });
  }

  logResult(message: string, details?: any): void {
    this.addLog({
      type: 'result',
      message: `📊 ${message}`,
      details
    });
  }

  logPhaseComplete(phase: string, message?: string): void {
    const defaultMessage = `✅ ${phase}阶段完成，可以进入下一阶段`;
    this.addLog({
      type: 'system_action',
      message: message || defaultMessage,
      details: { phase }
    });
  }
}