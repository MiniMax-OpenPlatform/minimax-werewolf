#!/bin/bash

echo "=== 🎮 AI 狼人杀服务状态检查 ==="
echo ""

echo "🤖 AI 玩家服务器:"
for port in 3001 3002 3003 3004 3005 3006; do
  if curl -s --connect-timeout 2 http://localhost:$port/api/player/status > /dev/null 2>&1; then
    echo "  ✅ 玩家 $((port-3000)) (端口 $port): 运行中"
  else
    echo "  ❌ 玩家 $((port-3000)) (端口 $port): 未响应"
  fi
done

echo ""
echo "🎮 游戏主界面:"
if curl -s --connect-timeout 2 http://localhost:3000 > /dev/null 2>&1; then
  echo "  ✅ 游戏主界面 (端口 3000): 运行中"
else
  echo "  ❌ 游戏主界面 (端口 3000): 未运行"
fi

echo ""
echo "📊 运行中的进程:"
ps aux | grep -E "bun.*(player|dev)" | grep -v grep | head -10 | awk '{print "  PID", $2, "-", $11, $12, $13}'
ps aux | grep "vite" | grep -v grep | head -3 | awk '{print "  PID", $2, "-", $11, $12, $13}'

echo ""
echo "=== 完成 ==="
