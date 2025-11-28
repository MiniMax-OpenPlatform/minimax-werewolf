'use client';

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type GameRules, DEFAULT_GAME_RULES } from '@ai-werewolf/types';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameRulesModal = observer(function GameRulesModal({ isOpen, onClose }: GameRulesModalProps) {
  const [rules, setRules] = useState<GameRules>(() => {
    // 从 localStorage 加载规则，如果没有则使用默认规则
    const savedRules = localStorage.getItem('gameRules');
    return savedRules ? JSON.parse(savedRules) : DEFAULT_GAME_RULES;
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    localStorage.setItem('gameRules', JSON.stringify(rules));
    setIsEditing(false);
    alert('规则已保存！');
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认规则吗？')) {
      setRules(DEFAULT_GAME_RULES);
      localStorage.setItem('gameRules', JSON.stringify(DEFAULT_GAME_RULES));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-background z-10 border-b">
            <CardTitle className="text-2xl">🐺 游戏规则</CardTitle>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  ✏️ 编辑规则
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleReset}>
                    🔄 重置默认
                  </Button>
                  <Button variant="default" onClick={handleSave}>
                    💾 保存
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={onClose}>
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* 游戏配置 */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>⚙️</span>
                <span>游戏配置</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">玩家人数</label>
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      value={rules.playerCount}
                      onChange={(e) => setRules({ ...rules, playerCount: parseInt(e.target.value) })}
                      min={4}
                      max={12}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">{rules.playerCount} 人</div>
                  )}
                </div>
              </div>
            </section>

            {/* 角色配置 */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>🎭</span>
                <span>角色配置</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">🐺 狼人</label>
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      value={rules.roles.werewolf}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          roles: { ...rules.roles, werewolf: parseInt(e.target.value) },
                        })
                      }
                      min={1}
                      max={4}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">{rules.roles.werewolf} 人</div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">🔮 预言家</label>
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      value={rules.roles.seer}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          roles: { ...rules.roles, seer: parseInt(e.target.value) },
                        })
                      }
                      min={0}
                      max={2}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">{rules.roles.seer} 人</div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">🧪 女巫</label>
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      value={rules.roles.witch}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          roles: { ...rules.roles, witch: parseInt(e.target.value) },
                        })
                      }
                      min={0}
                      max={2}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">{rules.roles.witch} 人</div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">👤 村民</label>
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      value={rules.roles.villager}
                      onChange={(e) =>
                        setRules({
                          ...rules,
                          roles: { ...rules.roles, villager: parseInt(e.target.value) },
                        })
                      }
                      min={0}
                      max={8}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">{rules.roles.villager} 人</div>
                  )}
                </div>
              </div>
            </section>

            {/* 角色说明 */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>📖</span>
                <span>角色说明</span>
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{rules.roleDescriptions.villager}</p>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{rules.roleDescriptions.werewolf}</p>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{rules.roleDescriptions.seer}</p>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{rules.roleDescriptions.witch}</p>
                </div>
              </div>
            </section>

            {/* 胜利条件 */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>🏆</span>
                <span>胜利条件</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-1">好人</Badge>
                  <p className="text-sm flex-1">{rules.winConditions.villagersWin}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="destructive" className="mt-1">狼人</Badge>
                  <p className="text-sm flex-1">{rules.winConditions.werewolvesWin}</p>
                </div>
              </div>
            </section>

            {/* 特殊规则 */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>⚡</span>
                <span>特殊规则</span>
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules.specialRules.witchFirstNightSelfSave}
                    onChange={(e) =>
                      isEditing &&
                      setRules({
                        ...rules,
                        specialRules: {
                          ...rules.specialRules,
                          witchFirstNightSelfSave: e.target.checked,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">女巫首夜可以自救</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules.specialRules.tieVoteNoElimination}
                    onChange={(e) =>
                      isEditing &&
                      setRules({
                        ...rules,
                        specialRules: {
                          ...rules.specialRules,
                          tieVoteNoElimination: e.target.checked,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">平票时无人出局</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules.specialRules.deadPlayersSilent}
                    onChange={(e) =>
                      isEditing &&
                      setRules({
                        ...rules,
                        specialRules: {
                          ...rules.specialRules,
                          deadPlayersSilent: e.target.checked,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">死亡玩家禁言</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules.specialRules.revealRoleOnDeath}
                    onChange={(e) =>
                      isEditing &&
                      setRules({
                        ...rules,
                        specialRules: {
                          ...rules.specialRules,
                          revealRoleOnDeath: e.target.checked,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">死亡时公开身份</span>
                </label>
              </div>
            </section>

            {/* 游戏流程 */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>🔄</span>
                <span>游戏流程</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-2">夜晚行动顺序</label>
                  <div className="flex gap-2 flex-wrap">
                    {rules.gameFlow.nightOrder.map((role, index) => (
                      <Badge key={index} variant="secondary">
                        {index + 1}. {role === 'werewolf' ? '🐺 狼人' : role === 'seer' ? '🔮 预言家' : '🧪 女巫'}
                      </Badge>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules.gameFlow.dayDiscussion}
                    onChange={(e) =>
                      isEditing &&
                      setRules({
                        ...rules,
                        gameFlow: {
                          ...rules.gameFlow,
                          dayDiscussion: e.target.checked,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">启用白天讨论阶段</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules.gameFlow.votingEnabled}
                    onChange={(e) =>
                      isEditing &&
                      setRules({
                        ...rules,
                        gameFlow: {
                          ...rules.gameFlow,
                          votingEnabled: e.target.checked,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">启用投票放逐</span>
                </label>
              </div>
            </section>

            {/* 底部说明 */}
            <div className="border-t pt-4 mt-6">
              <p className="text-xs text-muted-foreground">
                💡 提示：您可以自定义编辑游戏规则并保存到浏览器本地存储。
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                ✅ 修改后的规则会在创建新游戏时自动应用到 AI 行为（作为 System Prompt）。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
