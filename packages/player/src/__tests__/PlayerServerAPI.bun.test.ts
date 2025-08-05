import { test, expect, describe, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { PlayerServer } from '../PlayerServer';
import { ConfigLoader } from '../config/PlayerConfig';
import { 
  Role, 
  GamePhase, 
  type StartGameParams, 
  type PlayerContext, 
  type WitchContext, 
  type SeerContext 
} from '@ai-werewolf/types';

// Mock the Langfuse imports at the top level
mock.module('@ai-werewolf/lib', () => ({
  initializeLangfuse: mock(() => {}),
  shutdownLangfuse: mock(() => Promise.resolve()),
  langfuse: {
    flushAsync: mock(() => Promise.resolve())
  },
  withLangfuseErrorHandling: mock((fn: () => any) => fn),
  getAITelemetryConfig: mock(() => ({ isEnabled: false }))
}));

// Mock dotenv/config
mock.module('dotenv/config', () => ({}));

// Create Express app similar to index.ts but without server startup
function createTestApp(playerServer: PlayerServer, config: any) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Helper function for flushing Langfuse (mocked)
  const flushLangfuseData = async () => {
    // Mock implementation - do nothing in tests
  };

  // API endpoints (copied from index.ts)
  app.post('/api/player/start-game', async (req, res) => {
    try {
      const params: StartGameParams = req.body;
      await playerServer.startGame(params);
      
      const response = {
        message: 'Game started successfully',
        langfuseEnabled: true
      };
      
      res.json(response);
    } catch (error) {
      console.error('Start game error:', error);
      res.status(500).json({ error: 'Failed to start game' });
    }
  });

  app.post('/api/player/speak', async (req, res) => {
    try {
      const context: PlayerContext = req.body;
      const speech = await playerServer.speak(context);
      await flushLangfuseData();
      
      const response = { speech };
      res.json(response);
    } catch (error) {
      console.error('Speak error:', error);
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  });

  app.post('/api/player/vote', async (req, res) => {
    try {
      const context: PlayerContext = req.body;
      const voteResponse = await playerServer.vote(context);
      await flushLangfuseData();
      
      res.json(voteResponse);
    } catch (error) {
      console.error('Vote error:', error);
      res.status(500).json({ error: 'Failed to generate vote' });
    }
  });

  app.post('/api/player/use-ability', async (req, res) => {
    try {
      const context: PlayerContext | WitchContext | SeerContext = req.body;
      const result = await playerServer.useAbility(context);
      await flushLangfuseData();
      
      res.json(result);
    } catch (error) {
      console.error('Use ability error:', error);
      res.status(500).json({ error: 'Failed to use ability' });
    }
  });

  app.post('/api/player/last-words', async (req, res) => {
    try {
      const lastWords = await playerServer.lastWords();
      await flushLangfuseData();
      
      const response = { content: lastWords };
      res.json(response);
    } catch (error) {
      console.error('Last words error:', error);
      res.status(500).json({ error: 'Failed to generate last words' });
    }
  });

  app.post('/api/player/status', (req, res) => {
    try {
      const status = playerServer.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Status error:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  return app;
}

describe('PlayerServer Express API', () => {
  let app: express.Application;
  let playerServer: PlayerServer;
  let mockConfig: any;
  let mockPlayerServerSpeak: any;
  let mockPlayerServerVote: any;
  let mockPlayerServerUseAbility: any;
  let mockPlayerServerLastWords: any;

  beforeEach(() => {
    // Create mock config
    mockConfig = {
      server: {
        port: 3001,
        host: '0.0.0.0'
      },
      ai: {
        model: 'google/gemini-2.5-flash',
        maxTokens: 150,
        temperature: 0.8,
        provider: 'openrouter',
        apiKey: 'test-api-key'
      },
      game: {
        name: 'TestPlayer',
        personality: 'Analytical player',
        strategy: 'balanced',
        speakingStyle: 'casual'
      },
      logging: {
        level: 'info',
        enabled: true
      }
    };

    // Create PlayerServer instance
    playerServer = new PlayerServer(mockConfig);

    // Mock PlayerServer methods
    mockPlayerServerSpeak = spyOn(playerServer, 'speak');
    mockPlayerServerVote = spyOn(playerServer, 'vote');
    mockPlayerServerUseAbility = spyOn(playerServer, 'useAbility');
    mockPlayerServerLastWords = spyOn(playerServer, 'lastWords');

    // Create Express app
    app = createTestApp(playerServer, mockConfig);
  });

  afterEach(() => {
    // Clean up mocks
    mock.restore();
  });

  describe('POST /api/player/start-game', () => {
    test('should start game successfully for villager', async () => {
      const startGameParams: StartGameParams = {
        gameId: 'test-game-123',
        role: Role.VILLAGER,
        playerId: 1,
        teammates: []
      };

      const response = await request(app)
        .post('/api/player/start-game')
        .send(startGameParams)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Game started successfully',
        langfuseEnabled: true
      });

      // Verify player status was updated
      const status = playerServer.getStatus();
      expect(status.gameId).toBe('test-game-123');
      expect(status.role).toBe(Role.VILLAGER);
      expect(status.isAlive).toBe(true);
    });

    test('should start game successfully for werewolf with teammates', async () => {
      const startGameParams: StartGameParams = {
        gameId: 'werewolf-game-456',
        role: Role.WEREWOLF,
        playerId: 2,
        teammates: [3, 5]
      };

      const response = await request(app)
        .post('/api/player/start-game')
        .send(startGameParams)
        .expect(200);

      expect(response.body.message).toBe('Game started successfully');

      const status = playerServer.getStatus();
      expect(status.role).toBe(Role.WEREWOLF);
      expect(status.teammates).toEqual([3, 5]);
    });

    test('should start game for special roles (seer, witch)', async () => {
      const seerParams: StartGameParams = {
        gameId: 'seer-game-789',
        role: Role.SEER,
        playerId: 3,
        teammates: []
      };

      await request(app)
        .post('/api/player/start-game')
        .send(seerParams)
        .expect(200);

      const status = playerServer.getStatus();
      expect(status.role).toBe(Role.SEER);
    });

    test('should handle invalid request body gracefully', async () => {
      const invalidParams = {
        invalidField: 'invalid'
      };

      const response = await request(app)
        .post('/api/player/start-game')
        .send(invalidParams)
        .expect(200); // PlayerServer is lenient with missing fields

      expect(response.body.message).toBe('Game started successfully');
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/player/start-game')
        .send({})
        .expect(200); // PlayerServer accepts empty request body

      expect(response.body.message).toBe('Game started successfully');
    });

    test('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/player/start-game')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });

  describe('POST /api/player/speak', () => {
    const mockPlayerContext: PlayerContext = {
      round: 2,
      currentPhase: GamePhase.DAY,
      alivePlayers: [
        { id: 1, isAlive: true },
        { id: 2, isAlive: true },
        { id: 3, isAlive: true }
      ],
      allSpeeches: {
        1: [
          { playerId: 2, content: 'I am the seer!', type: 'player' }
        ]
      },
      allVotes: {}
    };

    beforeEach(async () => {
      // Start game first
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.VILLAGER,
        playerId: 1,
        teammates: []
      });
    });

    test('should generate speech successfully', async () => {
      const expectedSpeech = 'This is my analysis of the current situation.';
      mockPlayerServerSpeak.mockResolvedValue(expectedSpeech);

      const response = await request(app)
        .post('/api/player/speak')
        .send(mockPlayerContext)
        .expect(200);

      expect(response.body).toEqual({ speech: expectedSpeech });
      expect(mockPlayerServerSpeak).toHaveBeenCalledWith(mockPlayerContext);
    });

    test('should handle speech generation errors', async () => {
      mockPlayerServerSpeak.mockImplementation(async () => {
        throw new Error('AI service error');
      });

      const response = await request(app)
        .post('/api/player/speak')
        .send(mockPlayerContext)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate speech');
    });

    test('should handle empty context', async () => {
      mockPlayerServerSpeak.mockImplementation(async () => {
        throw new Error('Invalid context');
      });

      const response = await request(app)
        .post('/api/player/speak')
        .send({})
        .expect(500);

      expect(response.body.error).toBe('Failed to generate speech');
    });

    test('should handle missing required fields in context', async () => {
      const incompleteContext = {
        round: 1
        // missing other required fields
      };

      mockPlayerServerSpeak.mockImplementation(async () => {
        throw new Error('Missing required fields');
      });

      await request(app)
        .post('/api/player/speak')
        .send(incompleteContext)
        .expect(500);
    });
  });

  describe('POST /api/player/vote', () => {
    const mockPlayerContext: PlayerContext = {
      round: 2,
      currentPhase: GamePhase.DAY,
      alivePlayers: [
        { id: 1, isAlive: true },
        { id: 2, isAlive: true },
        { id: 3, isAlive: true }
      ],
      allSpeeches: {},
      allVotes: {
        1: [
          { voterId: 1, targetId: 2 },
          { voterId: 3, targetId: 2 }
        ]
      }
    };

    beforeEach(async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.VILLAGER,
        playerId: 1,
        teammates: []
      });
    });

    test('should generate vote successfully', async () => {
      const expectedVote = {
        target: 2,
        reason: 'Player 2 seems suspicious based on their speech patterns.'
      };
      mockPlayerServerVote.mockResolvedValue(expectedVote);

      const response = await request(app)
        .post('/api/player/vote')
        .send(mockPlayerContext)
        .expect(200);

      expect(response.body).toEqual(expectedVote);
      expect(mockPlayerServerVote).toHaveBeenCalledWith(mockPlayerContext);
    });

    test('should handle vote generation errors', async () => {
      mockPlayerServerVote.mockImplementation(async () => {
        throw new Error('Vote generation failed');
      });

      const response = await request(app)
        .post('/api/player/vote')
        .send(mockPlayerContext)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate vote');
    });

    test('should handle invalid vote target', async () => {
      mockPlayerServerVote.mockImplementation(async () => {
        throw new Error('Invalid vote target');
      });

      await request(app)
        .post('/api/player/vote')
        .send(mockPlayerContext)
        .expect(500);
    });

    test('should handle vote during wrong phase', async () => {
      const nightContext = {
        ...mockPlayerContext,
        currentPhase: GamePhase.NIGHT
      };

      mockPlayerServerVote.mockImplementation(async () => {
        throw new Error('Cannot vote during night phase');
      });

      await request(app)
        .post('/api/player/vote')
        .send(nightContext)
        .expect(500);
    });
  });

  describe('POST /api/player/use-ability', () => {
    const mockSeerContext: SeerContext = {
      round: 1,
      currentPhase: GamePhase.NIGHT,
      alivePlayers: [
        { id: 1, isAlive: true },
        { id: 2, isAlive: true },
        { id: 3, isAlive: true }
      ],
      allSpeeches: {},
      allVotes: {},
      investigatedPlayers: {}
    };

    const mockWitchContext: WitchContext = {
      round: 1,
      currentPhase: GamePhase.NIGHT,
      alivePlayers: [
        { id: 1, isAlive: true },
        { id: 2, isAlive: true },
        { id: 3, isAlive: true }
      ],
      allSpeeches: {},
      allVotes: {},
      killedTonight: 2,
      potionUsed: { heal: false, poison: false }
    };

    test('should use seer ability successfully', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.SEER,
        playerId: 1,
        teammates: []
      });

      const expectedAbility = {
        action: 'investigate',
        target: 2,
        reason: 'Investigating player 2 as they seem suspicious.'
      };
      mockPlayerServerUseAbility.mockResolvedValue(expectedAbility);

      const response = await request(app)
        .post('/api/player/use-ability')
        .send(mockSeerContext)
        .expect(200);

      expect(response.body).toEqual(expectedAbility);
      expect(mockPlayerServerUseAbility).toHaveBeenCalledWith(mockSeerContext);
    });

    test('should use witch ability successfully', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.WITCH,
        playerId: 3,
        teammates: []
      });

      const expectedAbility = {
        action: 'using',
        healTarget: 2,
        healReason: 'Saving player 2',
        poisonTarget: 0,
        poisonReason: 'Not using poison this round'
      };
      mockPlayerServerUseAbility.mockResolvedValue(expectedAbility);

      const response = await request(app)
        .post('/api/player/use-ability')
        .send(mockWitchContext)
        .expect(200);

      expect(response.body).toEqual(expectedAbility);
    });

    test('should use werewolf ability successfully', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.WEREWOLF,
        playerId: 2,
        teammates: [3]
      });

      const expectedAbility = {
        action: 'kill',
        target: 1,
        reason: 'Eliminating the biggest threat.'
      };
      mockPlayerServerUseAbility.mockResolvedValue(expectedAbility);

      const response = await request(app)
        .post('/api/player/use-ability')
        .send(mockSeerContext)
        .expect(200);

      expect(response.body).toEqual(expectedAbility);
    });

    test('should handle ability usage errors', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.SEER,
        playerId: 1,
        teammates: []
      });

      mockPlayerServerUseAbility.mockImplementation(async () => {
        throw new Error('Ability failed');
      });

      const response = await request(app)
        .post('/api/player/use-ability')
        .send(mockSeerContext)
        .expect(500);

      expect(response.body.error).toBe('Failed to use ability');
    });

    test('should handle villager attempting to use ability', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.VILLAGER,
        playerId: 1,
        teammates: []
      });

      mockPlayerServerUseAbility.mockImplementation(async () => {
        throw new Error('我没有特殊能力可以使用。');
      });

      await request(app)
        .post('/api/player/use-ability')
        .send(mockSeerContext)
        .expect(500);
    });

    test('should handle ability usage during wrong phase', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.SEER,
        playerId: 1,
        teammates: []
      });

      const dayContext = {
        ...mockSeerContext,
        currentPhase: GamePhase.DAY
      };

      mockPlayerServerUseAbility.mockImplementation(async () => {
        throw new Error('Cannot use ability during day');
      });

      await request(app)
        .post('/api/player/use-ability')
        .send(dayContext)
        .expect(500);
    });
  });

  describe('POST /api/player/last-words', () => {
    test('should generate last words for villager', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.VILLAGER,
        playerId: 1,
        teammates: []
      });

      const expectedLastWords = 'Good luck finding the werewolves!';
      mockPlayerServerLastWords.mockResolvedValue(expectedLastWords);

      const response = await request(app)
        .post('/api/player/last-words')
        .send({})
        .expect(200);

      expect(response.body).toEqual({ content: expectedLastWords });
      expect(mockPlayerServerLastWords).toHaveBeenCalled();
    });

    test('should generate last words for werewolf', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.WEREWOLF,
        playerId: 2,
        teammates: [3, 5]
      });

      const expectedLastWords = 'The werewolves will avenge me!';
      mockPlayerServerLastWords.mockResolvedValue(expectedLastWords);

      const response = await request(app)
        .post('/api/player/last-words')
        .send({})
        .expect(200);

      expect(response.body.content).toBe(expectedLastWords);
    });

    test('should generate last words for special roles', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.SEER,
        playerId: 1,
        teammates: []
      });

      const expectedLastWords = 'Remember my investigations!';
      mockPlayerServerLastWords.mockResolvedValue(expectedLastWords);

      const response = await request(app)
        .post('/api/player/last-words')
        .send({})
        .expect(200);

      expect(response.body.content).toBe(expectedLastWords);
    });

    test('should handle last words generation errors', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.VILLAGER,
        playerId: 1,
        teammates: []
      });

      mockPlayerServerLastWords.mockImplementation(async () => {
        throw new Error('Last words failed');
      });

      const response = await request(app)
        .post('/api/player/last-words')
        .send({})
        .expect(500);

      expect(response.body.error).toBe('Failed to generate last words');
    });

    test('should generate last words without game started', async () => {
      const expectedDefaultWords = '很遗憾要离开游戏了，希望好人阵营能够获胜！';
      mockPlayerServerLastWords.mockResolvedValue(expectedDefaultWords);

      const response = await request(app)
        .post('/api/player/last-words')
        .send({})
        .expect(200);

      expect(response.body.content).toBe(expectedDefaultWords);
    });
  });

  describe('POST /api/player/status', () => {
    test('should return inactive status initially', async () => {
      const response = await request(app)
        .post('/api/player/status')
        .send({})
        .expect(200);

      expect(response.body).toEqual({
        gameId: undefined,
        playerId: undefined,
        role: undefined,
        teammates: [],
        isActive: false,
        playerName: 'TestPlayer',
        personality: 'Analytical player',
        strategy: 'balanced',
        speakingStyle: 'casual',
        dayCount: 1,
        currentPhase: 'night'
      });
    });

    test('should return active status after game start', async () => {
      await playerServer.startGame({
        gameId: 'test-game-789',
        role: Role.WEREWOLF,
        playerId: 3,
        teammates: [2, 5]
      });


      const response = await request(app)
        .post('/api/player/status')
        .send({})
        .expect(200);

      expect(response.body).toEqual({
        gameId: 'test-game-789',
        playerId: 3,
        role: Role.WEREWOLF,
        teammates: [2, 5],
        isActive: true,
        playerName: 'TestPlayer',
        personality: 'Analytical player',
        strategy: 'balanced',
        speakingStyle: 'casual',
        dayCount: 2,
        currentPhase: GamePhase.DAY
      });
    });

    test('should handle status errors gracefully', async () => {
      // Mock getStatus to throw an error
      const originalGetStatus = playerServer.getStatus;
      playerServer.getStatus = () => {
        throw new Error('Status error');
      };

      const response = await request(app)
        .post('/api/player/status')
        .send({})
        .expect(500);

      expect(response.body.error).toBe('Failed to get status');

      // Restore original method
      playerServer.getStatus = originalGetStatus;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle requests without Content-Type header', async () => {
      const response = await request(app)
        .post('/api/player/start-game')
        .send('invalid data')
        .expect(200); // Express handles string data gracefully

      expect(response.body.message).toBe('Game started successfully');
    });

    test('should handle extremely large request payloads', async () => {
      const largePayload = {
        gameId: 'test',
        role: Role.VILLAGER,
        playerId: 1,
        teammates: [],
        extraData: 'x'.repeat(10000) // 10KB of extra data
      };

      const response = await request(app)
        .post('/api/player/start-game')
        .send(largePayload)
        .expect(200);

      expect(response.body.message).toBe('Game started successfully');
    });

    test('should handle concurrent requests', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.VILLAGER,
        playerId: 1,
        teammates: []
      });

      mockPlayerServerSpeak.mockResolvedValue('Test speech');

      const context: PlayerContext = {
        round: 1,
        currentPhase: GamePhase.DAY,
        alivePlayers: [{ id: 1, isAlive: true }],
        allSpeeches: {},
        allVotes: {}
      };

      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/player/speak')
          .send(context)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.speech).toBe('Test speech');
      });
    });

    test('should handle network errors during AI service calls', async () => {
      await playerServer.startGame({
        gameId: 'test-game',
        role: Role.VILLAGER,
        playerId: 1,
        teammates: []
      });

      // Simulate network timeout error
      mockPlayerServerSpeak.mockImplementation(async () => {
        throw new Error('ECONNRESET');
      });

      const context: PlayerContext = {
        round: 1,
        currentPhase: GamePhase.DAY,
        alivePlayers: [{ id: 1, isAlive: true }],
        allSpeeches: {},
        allVotes: {}
      };

      const response = await request(app)
        .post('/api/player/speak')
        .send(context)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate speech');
    });
  });

  describe('API Validation and Robustness', () => {
    test('should handle requests with missing required endpoints', async () => {
      await request(app)
        .post('/api/player/nonexistent')
        .send({})
        .expect(404);
    });

    test('should handle GET requests on POST-only endpoints', async () => {
      await request(app)
        .get('/api/player/speak')
        .expect(404);
    });

    test('should handle different HTTP methods', async () => {
      await request(app)
        .put('/api/player/speak')
        .send({})
        .expect(404);

      await request(app)
        .delete('/api/player/speak')
        .send({})
        .expect(404);
    });

    test('should handle malformed JSON in different endpoints', async () => {
      const endpoints = [
        '/api/player/speak',
        '/api/player/vote',
        '/api/player/use-ability',
        '/api/player/last-words'
      ];

      for (const endpoint of endpoints) {
        await request(app)
          .post(endpoint)
          .set('Content-Type', 'application/json')
          .send('{"malformed": json}')
          .expect(400);
      }
    });

    test('should handle requests with wrong Content-Type', async () => {
      const response = await request(app)
        .post('/api/player/start-game')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(200); // Express middleware handles content gracefully

      expect(response.body.message).toBe('Game started successfully');
    });
  });
});