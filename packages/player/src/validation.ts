// Re-export validation schemas from shared types package
export {
  SpeechResponseSchema,
  VotingResponseSchema,
  NightActionResponseSchema,
  LastWordsResponseSchema,
  WerewolfNightActionSchema,
  WitchNightActionSchema,
  SeerNightActionSchema,
  getNightActionSchemaByRole
} from '@ai-werewolf/types';