#!/bin/bash

echo "=== 测试玩家 1 的 AI 发言功能 ==="
echo ""

response=$(curl -s -X POST http://localhost:3001/api/player/speak \
  -H "Content-Type: application/json" \
  -d '{
    "round": 1,
    "phase": "DAY",
    "alivePlayers": [1,2,3,4,5,6],
    "speeches": {},
    "votingHistory": {}
  }')

echo "响应："
echo "$response" | head -50

echo ""
echo "=== 检查响应内容 ==="
if echo "$response" | grep -q '"speech"'; then
  echo "✅ 收到AI发言响应"
  echo ""
  echo "发言内容："
  echo "$response" | grep -o '"speech":"[^"]*"' | sed 's/"speech":"//;s/"$//'
else
  echo "❌ 未收到有效的AI发言"
  echo "完整响应: $response"
fi

echo ""
echo "=== 检查玩家1日志 ==="
tail -10 /data1/devin/wolf/AI-Werewolf/logs/player1-dev.log
