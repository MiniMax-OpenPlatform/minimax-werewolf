// 测试环境设置
beforeEach(() => {
  // 重置控制台mock
  jest.clearAllMocks();
});

// 全局测试工具函数
(global as any).createMockPlayer = (id: string, name: string, role: any) => ({
  id,
  name,
  role,
  isAlive: true,
  teammates: role === 'werewolf' ? ['teammate1'] : undefined
});

(global as any).createMockGameState = (players: any[] = []) => ({
  gameId: 'test-game',
  players,
  currentPhase: 'night',
  dayCount: 1,
  winCondition: 'ongoing',
  votes: {}
});

// 抑制控制台输出（在测试期间）
(global as any).console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};