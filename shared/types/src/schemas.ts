import { z } from 'zod';

// Speech Response Schema - 对应发言生成的返回格式
export const SpeechResponseSchema = z.object({
  speech: z.string().describe('生成的发言内容')
});

// Voting Response Schema - 对应投票决策的返回格式
export const VotingResponseSchema = z.object({
  target: z.number().describe('要投票的玩家ID'),
  reason: z.string().describe('投票的理由')
});

// 狼人夜间行动Schema - 匹配API的WerewolfAbilityResponse
export const WerewolfNightActionSchema = z.object({
  action: z.literal('kill').describe('行动类型，狼人固定为kill'),
  target: z.number().describe('要击杀的目标玩家ID'),
  reason: z.string().describe('选择该目标的详细理由，包括对其身份的推测'),
});

// 预言家夜间行动Schema - 匹配API的SeerAbilityResponse
export const SeerNightActionSchema = z.object({
  action: z.literal('investigate').describe('行动类型，预言家固定为investigate'),
  target: z.number().describe('要查验身份的目标玩家ID'),
  reason: z.string().describe('选择查验该玩家的理由，基于其发言和行为的分析'),
});

// 女巫夜间行动Schema - 匹配API的WitchAbilityResponse
export const WitchNightActionSchema = z.object({
  action: z.enum(['using', 'idle']).describe('行动类型：using表示使用药水，idle表示不使用'),
  healTarget: z.number().describe('救人的目标玩家ID，0表示不救人'),
  healReason: z.string().describe('救人或不救人的理由'),
  poisonTarget: z.number().describe('毒人的目标玩家ID，0表示不毒人'),
  poisonReason: z.string().describe('毒人或不毒人的理由'),
});


// 通用夜间行动Schema (向后兼容)
export const NightActionResponseSchema = z.union([
  WerewolfNightActionSchema,
  SeerNightActionSchema,
  WitchNightActionSchema
]);

// 根据角色获取对应的Schema，村民返回null表示跳过
export function getNightActionSchemaByRole(role: string): typeof WerewolfNightActionSchema | typeof SeerNightActionSchema | typeof WitchNightActionSchema | null {
  switch (role) {
    case '狼人':
      return WerewolfNightActionSchema;
    case '预言家':
      return SeerNightActionSchema;
    case '女巫':
      return WitchNightActionSchema;
    case '村民':
      return null; // 村民夜间无行动，直接跳过
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}

// Last Words Response Schema - 对应遗言生成的返回格式
export const LastWordsResponseSchema = z.object({
  content: z.string(),
  reveal_role: z.boolean().optional(),
  accusation: z.string().optional(),
  advice: z.string().optional()
});


// 类型导出
export type SpeechResponseType = z.infer<typeof SpeechResponseSchema>;
export type VotingResponseType = z.infer<typeof VotingResponseSchema>;
export type NightActionResponseType = z.infer<typeof NightActionResponseSchema>;
export type LastWordsResponseType = z.infer<typeof LastWordsResponseSchema>;