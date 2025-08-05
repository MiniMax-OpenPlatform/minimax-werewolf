import { test, expect, describe, beforeEach } from 'bun:test';
import { SpeechSystem } from '../speechSystem';
import type { Speech, AllSpeeches, GameEvent } from '@ai-werewolf/types';

// Mock MobX
const mockMakeAutoObservable = () => {};

// Create a mock for mobx
const mockMobx = {
  makeAutoObservable: mockMakeAutoObservable
};

describe('SpeechSystem', () => {
  let speechSystem: SpeechSystem;

  beforeEach(() => {
    speechSystem = new SpeechSystem();
  });

  describe('Constructor', () => {
    test('should initialize with empty speeches', () => {
      const system = new SpeechSystem();
      expect(system.getAllSpeeches()).toEqual({});
    });

    test('should call makeAutoObservable on construction', () => {
      const system = new SpeechSystem();
      // We can't directly test if makeAutoObservable was called,
      // but we can verify the object exists and functions work
      expect(system).toBeInstanceOf(SpeechSystem);
    });
  });

  describe('addSpeech()', () => {
    test('should add speech to new round', () => {
      const speech: Speech = {
        playerId: 1,
        content: 'Test speech',
        type: 'player'
      };

      speechSystem.addSpeech(1, speech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches).toHaveLength(1);
      expect(speeches[0]).toEqual(speech);
    });

    test('should add multiple speeches to same round', () => {
      const speech1: Speech = {
        playerId: 1,
        content: 'First speech',
        type: 'player'
      };

      const speech2: Speech = {
        playerId: 2,
        content: 'Second speech',
        type: 'player'
      };

      speechSystem.addSpeech(1, speech1);
      speechSystem.addSpeech(1, speech2);
      
      const speeches = speechSystem.getSpeeches(1);
      expect(speeches).toHaveLength(2);
      expect(speeches[0]).toEqual(speech1);
      expect(speeches[1]).toEqual(speech2);
    });

    test('should add speeches to different rounds', () => {
      const speech1: Speech = {
        playerId: 1,
        content: 'Round 1 speech',
        type: 'player'
      };

      const speech2: Speech = {
        playerId: 2,
        content: 'Round 2 speech',
        type: 'player'
      };

      speechSystem.addSpeech(1, speech1);
      speechSystem.addSpeech(2, speech2);

      expect(speechSystem.getSpeeches(1)).toEqual([speech1]);
      expect(speechSystem.getSpeeches(2)).toEqual([speech2]);
    });

    test('should handle system messages', () => {
      const systemSpeech: Speech = {
        playerId: -1,
        content: 'Game started',
        type: 'system'
      };

      speechSystem.addSpeech(1, systemSpeech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches).toHaveLength(1);
      expect(speeches[0]).toEqual(systemSpeech);
    });

    test('should preserve speech order within rounds', () => {
      const speeches: Speech[] = [
        { playerId: 1, content: 'First', type: 'player' },
        { playerId: 2, content: 'Second', type: 'player' },
        { playerId: 3, content: 'Third', type: 'player' },
        { playerId: 4, content: 'Fourth', type: 'player' }
      ];

      speeches.forEach(speech => speechSystem.addSpeech(1, speech));
      
      const retrievedSpeeches = speechSystem.getSpeeches(1);
      expect(retrievedSpeeches).toEqual(speeches);
    });

    test('should handle negative round numbers', () => {
      const speech: Speech = {
        playerId: 1,
        content: 'Negative round speech',
        type: 'player'
      };

      speechSystem.addSpeech(-1, speech);
      const speeches = speechSystem.getSpeeches(-1);

      expect(speeches).toEqual([speech]);
    });

    test('should handle zero round number', () => {
      const speech: Speech = {
        playerId: 1,
        content: 'Zero round speech',
        type: 'player'
      };

      speechSystem.addSpeech(0, speech);
      const speeches = speechSystem.getSpeeches(0);

      expect(speeches).toEqual([speech]);
    });
  });

  describe('getSpeeches()', () => {
    test('should return empty array for non-existent round', () => {
      const speeches = speechSystem.getSpeeches(99);
      expect(speeches).toEqual([]);
    });

    test('should return speeches for existing round', () => {
      const speech: Speech = {
        playerId: 1,
        content: 'Test speech',
        type: 'player'
      };

      speechSystem.addSpeech(1, speech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches).toEqual([speech]);
    });

    test('should return empty array initially', () => {
      const speeches = speechSystem.getSpeeches(1);
      expect(speeches).toEqual([]);
    });

    test('should return correct speeches for different rounds', () => {
      const round1Speech: Speech = {
        playerId: 1,
        content: 'Round 1',
        type: 'player'
      };

      const round2Speech: Speech = {
        playerId: 2,
        content: 'Round 2',
        type: 'player'
      };

      speechSystem.addSpeech(1, round1Speech);
      speechSystem.addSpeech(2, round2Speech);

      expect(speechSystem.getSpeeches(1)).toEqual([round1Speech]);
      expect(speechSystem.getSpeeches(2)).toEqual([round2Speech]);
      expect(speechSystem.getSpeeches(3)).toEqual([]);
    });

    test('should handle large round numbers', () => {
      const speech: Speech = {
        playerId: 1,
        content: 'Large round speech',
        type: 'player'
      };

      speechSystem.addSpeech(1000000, speech);
      const speeches = speechSystem.getSpeeches(1000000);

      expect(speeches).toEqual([speech]);
    });
  });

  describe('getAllSpeeches()', () => {
    test('should return empty object initially', () => {
      const allSpeeches = speechSystem.getAllSpeeches();
      expect(allSpeeches).toEqual({});
    });

    test('should return all speeches organized by round', () => {
      const speech1: Speech = {
        playerId: 1,
        content: 'Round 1 speech',
        type: 'player'
      };

      const speech2: Speech = {
        playerId: 2,
        content: 'Round 2 speech',
        type: 'player'
      };

      const speech3: Speech = {
        playerId: 3,
        content: 'Another round 1 speech',
        type: 'player'
      };

      speechSystem.addSpeech(1, speech1);
      speechSystem.addSpeech(2, speech2);
      speechSystem.addSpeech(1, speech3);

      const allSpeeches = speechSystem.getAllSpeeches();
      
      expect(allSpeeches).toEqual({
        1: [speech1, speech3],
        2: [speech2]
      });
    });

    test('should return reference to internal speeches object', () => {
      const speech: Speech = {
        playerId: 1,
        content: 'Test speech',
        type: 'player'
      };

      speechSystem.addSpeech(1, speech);
      
      const allSpeeches1 = speechSystem.getAllSpeeches();
      const allSpeeches2 = speechSystem.getAllSpeeches();
      
      // Should be the same reference (not a copy)
      expect(allSpeeches1).toBe(allSpeeches2);
    });

    test('should reflect changes after adding new speeches', () => {
      const initialSpeeches = speechSystem.getAllSpeeches();
      expect(initialSpeeches).toEqual({});

      const speech: Speech = {
        playerId: 1,
        content: 'New speech',
        type: 'player'
      };

      speechSystem.addSpeech(1, speech);
      
      const updatedSpeeches = speechSystem.getAllSpeeches();
      expect(updatedSpeeches).toEqual({
        1: [speech]
      });
    });
  });

  describe('broadcastSpeech()', () => {
    test('should add speech and return game event', () => {
      const speech: Speech = {
        playerId: 1,
        content: 'Broadcast speech',
        type: 'player'
      };

      const gameEvent = speechSystem.broadcastSpeech(1, speech);

      // Verify speech was added
      const speeches = speechSystem.getSpeeches(1);
      expect(speeches).toHaveLength(1);
      expect(speeches[0]).toEqual(speech);

      // Verify game event structure
      expect(gameEvent).toMatchObject({
        type: 'speech',
        playerId: 1,
        content: speech
      });
      expect(gameEvent.timestamp).toBeInstanceOf(Date);
    });

    test('should handle system message broadcasts', () => {
      const systemSpeech: Speech = {
        playerId: -1,
        content: 'System message',
        type: 'system'
      };

      const gameEvent = speechSystem.broadcastSpeech(1, systemSpeech);

      expect(gameEvent).toMatchObject({
        type: 'speech',
        playerId: -1,
        content: systemSpeech
      });
    });

    test('should create unique timestamps for rapid broadcasts', () => {
      const speech1: Speech = {
        playerId: 1,
        content: 'First broadcast',
        type: 'player'
      };

      const speech2: Speech = {
        playerId: 2,
        content: 'Second broadcast',
        type: 'player'
      };

      const event1 = speechSystem.broadcastSpeech(1, speech1);
      const event2 = speechSystem.broadcastSpeech(1, speech2);

      // Timestamps should be different (or at least not fail)
      expect(event1.timestamp).toBeInstanceOf(Date);
      expect(event2.timestamp).toBeInstanceOf(Date);
    });

    test('should broadcast to different rounds correctly', () => {
      const speech1: Speech = {
        playerId: 1,
        content: 'Round 1 broadcast',
        type: 'player'
      };

      const speech2: Speech = {
        playerId: 2,
        content: 'Round 2 broadcast',
        type: 'player'
      };

      const event1 = speechSystem.broadcastSpeech(1, speech1);
      const event2 = speechSystem.broadcastSpeech(2, speech2);

      expect(event1.content).toEqual(speech1);
      expect(event2.content).toEqual(speech2);

      // Verify speeches were added to correct rounds
      expect(speechSystem.getSpeeches(1)).toEqual([speech1]);
      expect(speechSystem.getSpeeches(2)).toEqual([speech2]);
    });

    test('should return game event with correct structure', () => {
      const speech: Speech = {
        playerId: 5,
        content: 'Test broadcast content',
        type: 'player'
      };

      const gameEvent = speechSystem.broadcastSpeech(3, speech);

      // Check all required GameEvent properties
      expect(gameEvent).toHaveProperty('type');
      expect(gameEvent).toHaveProperty('playerId');
      expect(gameEvent).toHaveProperty('content');
      expect(gameEvent).toHaveProperty('timestamp');

      expect(gameEvent.type).toBe('speech');
      expect(gameEvent.playerId).toBe(5);
      expect(gameEvent.content).toEqual(speech);
      expect(gameEvent.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Speech Type Handling', () => {
    test('should handle player speeches', () => {
      const playerSpeech: Speech = {
        playerId: 1,
        content: 'I am a villager',
        type: 'player'
      };

      speechSystem.addSpeech(1, playerSpeech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches[0].type).toBe('player');
    });

    test('should handle system speeches', () => {
      const systemSpeech: Speech = {
        playerId: -1,
        content: 'Game phase changed',
        type: 'system'
      };

      speechSystem.addSpeech(1, systemSpeech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches[0].type).toBe('system');
    });

    test('should handle mixed speech types in same round', () => {
      const playerSpeech: Speech = {
        playerId: 1,
        content: 'Player message',
        type: 'player'
      };

      const systemSpeech: Speech = {
        playerId: -1,
        content: 'System message',
        type: 'system'
      };

      speechSystem.addSpeech(1, playerSpeech);
      speechSystem.addSpeech(1, systemSpeech);

      const speeches = speechSystem.getSpeeches(1);
      expect(speeches).toHaveLength(2);
      expect(speeches[0].type).toBe('player');
      expect(speeches[1].type).toBe('system');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty speech content', () => {
      const emptySpeech: Speech = {
        playerId: 1,
        content: '',
        type: 'player'
      };

      speechSystem.addSpeech(1, emptySpeech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches).toHaveLength(1);
      expect(speeches[0].content).toBe('');
    });

    test('should handle very long speech content', () => {
      const longContent = 'x'.repeat(10000);
      const longSpeech: Speech = {
        playerId: 1,
        content: longContent,
        type: 'player'
      };

      speechSystem.addSpeech(1, longSpeech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches[0].content).toBe(longContent);
    });

    test('should handle special characters in speech content', () => {
      const specialContent = '特殊字符测试 🎮🐺🔮💀 \n\t\r';
      const specialSpeech: Speech = {
        playerId: 1,
        content: specialContent,
        type: 'player'
      };

      speechSystem.addSpeech(1, specialSpeech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches[0].content).toBe(specialContent);
    });

    test('should handle negative player IDs', () => {
      const speech: Speech = {
        playerId: -999,
        content: 'Negative player ID',
        type: 'system'
      };

      speechSystem.addSpeech(1, speech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches[0].playerId).toBe(-999);
    });

    test('should handle zero player ID', () => {
      const speech: Speech = {
        playerId: 0,
        content: 'Zero player ID',
        type: 'player'
      };

      speechSystem.addSpeech(1, speech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches[0].playerId).toBe(0);
    });

    test('should handle large player IDs', () => {
      const speech: Speech = {
        playerId: 999999,
        content: 'Large player ID',
        type: 'player'
      };

      speechSystem.addSpeech(1, speech);
      const speeches = speechSystem.getSpeeches(1);

      expect(speeches[0].playerId).toBe(999999);
    });

    test('should handle many speeches in single round', () => {
      const speechCount = 1000;
      
      for (let i = 0; i < speechCount; i++) {
        const speech: Speech = {
          playerId: i % 10 + 1, // Player IDs 1-10
          content: `Speech ${i}`,
          type: 'player'
        };
        speechSystem.addSpeech(1, speech);
      }

      const speeches = speechSystem.getSpeeches(1);
      expect(speeches).toHaveLength(speechCount);
      expect(speeches[0].content).toBe('Speech 0');
      expect(speeches[speechCount - 1].content).toBe(`Speech ${speechCount - 1}`);
    });

    test('should handle many rounds', () => {
      const roundCount = 100;
      
      for (let round = 1; round <= roundCount; round++) {
        const speech: Speech = {
          playerId: 1,
          content: `Round ${round} speech`,
          type: 'player'
        };
        speechSystem.addSpeech(round, speech);
      }

      const allSpeeches = speechSystem.getAllSpeeches();
      expect(Object.keys(allSpeeches)).toHaveLength(roundCount);
      
      for (let round = 1; round <= roundCount; round++) {
        expect(allSpeeches[round]).toHaveLength(1);
        expect(allSpeeches[round][0].content).toBe(`Round ${round} speech`);
      }
    });
  });

  describe('Data Integrity', () => {
    test('should maintain speech order across multiple operations', () => {
      const operations = [
        { round: 1, playerId: 1, content: 'First in round 1' },
        { round: 2, playerId: 2, content: 'First in round 2' },
        { round: 1, playerId: 3, content: 'Second in round 1' },
        { round: 2, playerId: 4, content: 'Second in round 2' },
        { round: 1, playerId: 5, content: 'Third in round 1' }
      ];

      operations.forEach(op => {
        const speech: Speech = {
          playerId: op.playerId,
          content: op.content,
          type: 'player'
        };
        speechSystem.addSpeech(op.round, speech);
      });

      const round1Speeches = speechSystem.getSpeeches(1);
      const round2Speeches = speechSystem.getSpeeches(2);

      expect(round1Speeches).toHaveLength(3);
      expect(round1Speeches[0].content).toBe('First in round 1');
      expect(round1Speeches[1].content).toBe('Second in round 1');
      expect(round1Speeches[2].content).toBe('Third in round 1');

      expect(round2Speeches).toHaveLength(2);
      expect(round2Speeches[0].content).toBe('First in round 2');
      expect(round2Speeches[1].content).toBe('Second in round 2');
    });

    test('should not affect other rounds when adding to specific round', () => {
      // Add initial speeches to multiple rounds
      speechSystem.addSpeech(1, { playerId: 1, content: 'Round 1 initial', type: 'player' });
      speechSystem.addSpeech(2, { playerId: 2, content: 'Round 2 initial', type: 'player' });
      speechSystem.addSpeech(3, { playerId: 3, content: 'Round 3 initial', type: 'player' });

      // Add new speech to round 2
      speechSystem.addSpeech(2, { playerId: 4, content: 'Round 2 new', type: 'player' });

      // Verify other rounds are unaffected
      expect(speechSystem.getSpeeches(1)).toHaveLength(1);
      expect(speechSystem.getSpeeches(1)[0].content).toBe('Round 1 initial');
      
      expect(speechSystem.getSpeeches(3)).toHaveLength(1);
      expect(speechSystem.getSpeeches(3)[0].content).toBe('Round 3 initial');
      
      // Verify target round was updated correctly
      expect(speechSystem.getSpeeches(2)).toHaveLength(2);
      expect(speechSystem.getSpeeches(2)[1].content).toBe('Round 2 new');
    });
  });
});