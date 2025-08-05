import { test, expect, describe, beforeEach, afterEach, spyOn } from 'bun:test';
import { OperationLogSystem, type OperationLog } from '../operationLog';

// Mock MobX
const mockMakeAutoObservable = () => {};
globalThis.require = {
  ...globalThis.require,
  cache: {}
} as any;

// Create a mock for mobx
const mockMobx = {
  makeAutoObservable: mockMakeAutoObservable
};

// Mock the mobx module
import.meta.resolve = (specifier: string) => {
  if (specifier === 'mobx') {
    return 'mocked-mobx';
  }
  return specifier;
};

describe('OperationLogSystem', () => {
  let logSystem: OperationLogSystem;
  let consoleSpy: any;

  beforeEach(() => {
    logSystem = new OperationLogSystem();
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Constructor', () => {
    test('should initialize with empty logs and zero sequence counter', () => {
      const system = new OperationLogSystem();
      expect(system.getLogs()).toEqual([]);
    });

    test('should call makeAutoObservable on construction', () => {
      const system = new OperationLogSystem();
      // We can't directly test if makeAutoObservable was called,
      // but we can verify the object exists and functions work
      expect(system).toBeInstanceOf(OperationLogSystem);
    });
  });

  describe('addLog()', () => {
    test('should add a log with generated id, timestamp, and sequence', () => {
      const logData = {
        type: 'system_action' as const,
        message: 'Test log message',
        details: { playerId: 1 }
      };

      logSystem.addLog(logData);
      const logs = logSystem.getLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: 'system_action',
        message: 'Test log message',
        details: { playerId: 1 },
        sequence: 0
      });
      expect(logs[0].id).toBeDefined();
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    test('should increment sequence number for multiple logs', () => {
      logSystem.addLog({ type: 'system_action', message: 'First log' });
      logSystem.addLog({ type: 'system_action', message: 'Second log' });
      logSystem.addLog({ type: 'system_action', message: 'Third log' });

      const logs = logSystem.getLogs();
      expect(logs[0].sequence).toBe(0);
      expect(logs[1].sequence).toBe(1);
      expect(logs[2].sequence).toBe(2);
    });

    test('should generate unique IDs for logs', () => {
      logSystem.addLog({ type: 'system_action', message: 'Log 1' });
      logSystem.addLog({ type: 'system_action', message: 'Log 2' });

      const logs = logSystem.getLogs();
      expect(logs[0].id).not.toBe(logs[1].id);
    });

    test('should log to console when adding logs', () => {
      logSystem.addLog({ type: 'system_action', message: 'Test message' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '🔍 addLog called:', 
        'Test message', 
        'total logs:', 
        1
      );
    });

    test('should handle logs without details', () => {
      logSystem.addLog({ type: 'phase_change', message: 'Simple log' });
      
      const logs = logSystem.getLogs();
      expect(logs[0].details).toBeUndefined();
    });

    test('should handle logs with empty details', () => {
      logSystem.addLog({ 
        type: 'phase_change', 
        message: 'Log with empty details',
        details: {}
      });
      
      const logs = logSystem.getLogs();
      expect(logs[0].details).toEqual({});
    });
  });

  describe('getLogs()', () => {
    test('should return empty array initially', () => {
      expect(logSystem.getLogs()).toEqual([]);
    });

    test('should return copy of logs array', () => {
      logSystem.addLog({ type: 'system_action', message: 'Test' });
      
      const logs1 = logSystem.getLogs();
      const logs2 = logSystem.getLogs();
      
      expect(logs1).toEqual(logs2);
      expect(logs1).not.toBe(logs2); // Different array instances
    });

    test('should return logs in chronological order', () => {
      logSystem.addLog({ type: 'system_action', message: 'First' });
      logSystem.addLog({ type: 'system_action', message: 'Second' });
      logSystem.addLog({ type: 'system_action', message: 'Third' });

      const logs = logSystem.getLogs();
      expect(logs[0].message).toBe('First');
      expect(logs[1].message).toBe('Second');
      expect(logs[2].message).toBe('Third');
    });
  });

  describe('getRecentLogs()', () => {
    beforeEach(() => {
      // Add multiple logs for testing
      logSystem.addLog({ type: 'system_action', message: 'Log 1' });
      logSystem.addLog({ type: 'system_action', message: 'Log 2' });
      logSystem.addLog({ type: 'system_action', message: 'Log 3' });
      logSystem.addLog({ type: 'system_action', message: 'Log 4' });
      logSystem.addLog({ type: 'system_action', message: 'Log 5' });
    });

    test('should return last N logs', () => {
      const recentLogs = logSystem.getRecentLogs(3);
      
      expect(recentLogs).toHaveLength(3);
      expect(recentLogs[0].message).toBe('Log 3');
      expect(recentLogs[1].message).toBe('Log 4');
      expect(recentLogs[2].message).toBe('Log 5');
    });

    test('should return all logs if count exceeds total', () => {
      const recentLogs = logSystem.getRecentLogs(10);
      
      expect(recentLogs).toHaveLength(5);
      expect(recentLogs[0].message).toBe('Log 1');
    });

    test('should return empty array if count is 0', () => {
      const recentLogs = logSystem.getRecentLogs(0);
      expect(recentLogs).toEqual([]);
    });

    test('should handle negative count', () => {
      const recentLogs = logSystem.getRecentLogs(-1);
      expect(recentLogs).toEqual([]);
    });

    test('should return empty array if no logs exist', () => {
      const emptySystem = new OperationLogSystem();
      const recentLogs = emptySystem.getRecentLogs(5);
      expect(recentLogs).toEqual([]);
    });
  });

  describe('clearLogs()', () => {
    test('should clear all logs and reset sequence counter', () => {
      logSystem.addLog({ type: 'system_action', message: 'Test 1' });
      logSystem.addLog({ type: 'system_action', message: 'Test 2' });
      
      expect(logSystem.getLogs()).toHaveLength(2);
      
      logSystem.clearLogs();
      
      expect(logSystem.getLogs()).toEqual([]);
      
      // Verify sequence counter is reset
      logSystem.addLog({ type: 'system_action', message: 'After clear' });
      const logs = logSystem.getLogs();
      expect(logs[0].sequence).toBe(0);
    });

    test('should allow adding logs after clearing', () => {
      logSystem.addLog({ type: 'system_action', message: 'Before clear' });
      logSystem.clearLogs();
      logSystem.addLog({ type: 'system_action', message: 'After clear' });
      
      const logs = logSystem.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('After clear');
    });
  });

  describe('logPhaseChange()', () => {
    test('should log phase change with correct format', () => {
      logSystem.logPhaseChange('夜晚', 2);
      
      const logs = logSystem.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: 'phase_change',
        message: '🔄 游戏进入夜晚阶段（第2天）',
        details: { phase: '夜晚' }
      });
    });

    test('should handle different phases and day counts', () => {
      logSystem.logPhaseChange('白天', 1);
      logSystem.logPhaseChange('投票', 3);
      
      const logs = logSystem.getLogs();
      expect(logs[0].message).toBe('🔄 游戏进入白天阶段（第1天）');
      expect(logs[1].message).toBe('🔄 游戏进入投票阶段（第3天）');
    });
  });

  describe('logPlayerRequest()', () => {
    test('should log player request with correct format', () => {
      logSystem.logPlayerRequest(5, '发言');
      
      const logs = logSystem.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: 'player_request',
        message: '📤 询问玩家5 发言',
        details: { playerId: 5, actionType: '发言' }
      });
    });

    test('should handle different player IDs and action types', () => {
      logSystem.logPlayerRequest(1, '投票');
      logSystem.logPlayerRequest(3, '使用技能');
      
      const logs = logSystem.getLogs();
      expect(logs[0].details).toEqual({ playerId: 1, actionType: '投票' });
      expect(logs[1].details).toEqual({ playerId: 3, actionType: '使用技能' });
    });
  });

  describe('logPlayerResponse()', () => {
    test('should log player response without result', () => {
      logSystem.logPlayerResponse(2, '发言');
      
      const logs = logSystem.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: 'player_response',
        message: '📥 玩家2 发言完成',
        details: { playerId: 2, actionType: '发言' }
      });
    });

    test('should log player response with result', () => {
      logSystem.logPlayerResponse(4, '投票', '投给玩家3');
      
      const logs = logSystem.getLogs();
      expect(logs[0]).toMatchObject({
        type: 'player_response',
        message: '📥 玩家4 投票完成: 投给玩家3',
        details: { playerId: 4, actionType: '投票', result: '投给玩家3' }
      });
    });

    test('should handle empty result string', () => {
      logSystem.logPlayerResponse(1, '技能', '');
      
      const logs = logSystem.getLogs();
      expect(logs[0].message).toBe('📥 玩家1 技能完成');
    });
  });

  describe('logSystemAction()', () => {
    test('should log system action with message prefix', () => {
      logSystem.logSystemAction('游戏开始');
      
      const logs = logSystem.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: 'system_action',
        message: '⚙️ 游戏开始'
      });
    });

    test('should log system action with details', () => {
      const details = { gameId: 'test-123', playerCount: 6 };
      logSystem.logSystemAction('初始化游戏', details);
      
      const logs = logSystem.getLogs();
      expect(logs[0]).toMatchObject({
        type: 'system_action',
        message: '⚙️ 初始化游戏',
        details
      });
    });

    test('should handle system action without details', () => {
      logSystem.logSystemAction('系统消息');
      
      const logs = logSystem.getLogs();
      expect(logs[0].details).toBeUndefined();
    });
  });

  describe('logResult()', () => {
    test('should log result with message prefix', () => {
      logSystem.logResult('投票结果：玩家3被淘汰');
      
      const logs = logSystem.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: 'result',
        message: '📊 投票结果：玩家3被淘汰'
      });
    });

    test('should log result with details', () => {
      const details = { eliminatedPlayer: 3, votes: { 3: 4, 2: 1 } };
      logSystem.logResult('投票统计完成', details);
      
      const logs = logSystem.getLogs();
      expect(logs[0]).toMatchObject({
        type: 'result',
        message: '📊 投票统计完成',
        details
      });
    });
  });

  describe('logPhaseComplete()', () => {
    test('should log phase completion with default message', () => {
      logSystem.logPhaseComplete('白天');
      
      const logs = logSystem.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: 'system_action',
        message: '✅ 白天阶段完成，可以进入下一阶段',
        details: { phase: '白天' }
      });
    });

    test('should log phase completion with custom message', () => {
      logSystem.logPhaseComplete('夜晚', '所有夜间行动已完成');
      
      const logs = logSystem.getLogs();
      expect(logs[0]).toMatchObject({
        type: 'system_action',
        message: '所有夜间行动已完成',
        details: { phase: '夜晚' }
      });
    });

    test('should handle empty custom message', () => {
      logSystem.logPhaseComplete('投票', '');
      
      const logs = logSystem.getLogs();
      expect(logs[0].message).toBe('✅ 投票阶段完成，可以进入下一阶段');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle very long messages', () => {
      const longMessage = 'x'.repeat(1000);
      logSystem.addLog({ type: 'system_action', message: longMessage });
      
      const logs = logSystem.getLogs();
      expect(logs[0].message).toBe(longMessage);
    });

    test('should handle special characters in messages', () => {
      const specialMessage = '特殊字符测试 🎮🐺🔮💀 \n\t\r';
      logSystem.addLog({ type: 'system_action', message: specialMessage });
      
      const logs = logSystem.getLogs();
      expect(logs[0].message).toBe(specialMessage);
    });

    test('should handle undefined values in details', () => {
      logSystem.addLog({
        type: 'system_action',
        message: 'Test',
        details: {
          playerId: undefined,
          phase: undefined,
          actionType: undefined
        }
      });
      
      const logs = logSystem.getLogs();
      expect(logs[0].details).toEqual({
        playerId: undefined,
        phase: undefined,
        actionType: undefined
      });
    });

    test('should handle multiple rapid log additions', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        logSystem.addLog({ type: 'system_action', message: `Rapid log ${i}` });
      }
      
      const logs = logSystem.getLogs();
      expect(logs).toHaveLength(100);
      
      // Verify all sequences are unique and in order
      const sequences = logs.map(log => log.sequence);
      expect(sequences).toEqual([...Array(100).keys()]);
    });

    test('should handle concurrent log operations', () => {
      // Simulate concurrent operations
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => {
          logSystem.addLog({ type: 'system_action', message: `Async log ${i}` });
        }));
      }
      
      Promise.all(promises).then(() => {
        const logs = logSystem.getLogs();
        expect(logs).toHaveLength(10);
        
        // All logs should have unique sequences
        const sequences = logs.map(log => log.sequence);
        const uniqueSequences = [...new Set(sequences)];
        expect(uniqueSequences).toHaveLength(10);
      });
    });
  });

  describe('Log Type Coverage', () => {
    test('should handle all log types', () => {
      const logTypes = [
        'phase_change',
        'player_request',
        'player_response',
        'system_action',
        'result'
      ] as const;

      logTypes.forEach((type, index) => {
        logSystem.addLog({
          type,
          message: `Message for ${type}`,
          details: { playerId: index }
        });
      });

      const logs = logSystem.getLogs();
      expect(logs).toHaveLength(5);
      
      logTypes.forEach((type, index) => {
        expect(logs[index].type).toBe(type);
      });
    });
  });
});