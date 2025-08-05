// 通用工具函数

export function formatPlayerList(players: any[]): string {
  if (!players || !Array.isArray(players)) {
    return '暂无玩家信息';
  }
  return players.filter(p => p.isAlive).map(p => p.id || p).join(', ');
}

export function formatSpeechHistory(history: any[]): string {
  if (!history || !Array.isArray(history)) {
    return '暂无发言记录';
  }
  return history.map(h => `${h.playerId}: "${h.content}"`).join('，');
}

export function formatHistoryEvents(events: string[]): string {
  if (!events || !Array.isArray(events)) {
    return '暂无历史事件';
  }
  return events.join('，');
}