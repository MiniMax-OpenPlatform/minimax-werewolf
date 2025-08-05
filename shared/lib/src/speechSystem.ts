import type { GameEvent, Speech, AllSpeeches } from '@ai-werewolf/types';
import { makeAutoObservable } from 'mobx';

export class SpeechSystem {
  private speeches: AllSpeeches = {};

  constructor() {
    makeAutoObservable(this);
  }

  addSpeech(round: number, speech: Speech): void {
    if (!this.speeches[round]) {
      this.speeches[round] = [];
    }
    
    this.speeches[round].push(speech);
  }

  getSpeeches(round: number): Speech[] {
    return this.speeches[round] || [];
  }
  
  getAllSpeeches(): AllSpeeches {
    return this.speeches;
  }

  broadcastSpeech(round: number, speech: Speech): GameEvent {
    this.addSpeech(round, speech);
    
    return {
      type: 'speech',
      playerId: speech.playerId,
      content: speech,
      timestamp: new Date()
    };
  }
}