import { useEffect, useRef } from 'react';
import { getPlayerServiceUrl } from '@/lib/playerConfig';

/**
 * 用户心跳 Hook
 * 定期向后端发送心跳以记录用户在线状态
 * @param apiKey - 用户的 API Key
 * @param enabled - 是否启用心跳（默认 true）
 * @param interval - 心跳间隔（毫秒，默认 60000 = 1分钟）
 */
export function useUserHeartbeat(
  apiKey: string | null | undefined,
  enabled: boolean = true,
  interval: number = 60000
) {
  const lastHeartbeatRef = useRef<number>(0);

  useEffect(() => {
    // 如果没有 API Key 或未启用，不发送心跳
    if (!apiKey || apiKey.trim() === '' || !enabled) {
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const playerServiceUrl = getPlayerServiceUrl();
        const response = await fetch(`${playerServiceUrl}/api/user-stats/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Heartbeat] Recorded for user: ${data.userId}`);
          lastHeartbeatRef.current = Date.now();
        } else {
          console.error('[Heartbeat] Failed:', response.statusText);
        }
      } catch (error) {
        console.error('[Heartbeat] Error:', error);
      }
    };

    // 立即发送一次心跳
    sendHeartbeat();

    // 定期发送心跳
    const intervalId = setInterval(sendHeartbeat, interval);

    // 清理函数
    return () => {
      clearInterval(intervalId);
    };
  }, [apiKey, enabled, interval]);

  return {
    lastHeartbeat: lastHeartbeatRef.current,
  };
}
