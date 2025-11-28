#!/bin/bash

echo "=== 测试玩家发言 API ==="
echo ""

echo "1. 测试玩家 1 的发言接口..."
response=$(curl -s -X POST http://localhost:3001/api/player/speak \
  -H "Content-Type: application/json" \
  -d '{
    "round": 1,
    "phase": "DAY",
    "alivePlayers": [1,2,3,4,5,6],
    "speeches": {}
  }' 2>&1)

echo "响应: $response"
echo ""

if echo "$response" | grep -q "speech\|HTML"; then
  echo "✅ 玩家 1 API 响应正常"
else
  echo "❌ 玩家 1 API 响应异常"
  echo "详细信息: $response"
fi

echo ""
echo "2. 检查玩家 2-6 的 API..."
for port in 3002 3003 3004 3005 3006; do
  status=$(curl -s --connect-timeout 2 http://localhost:$port/api/player/status 2>&1)
  if echo "$status" | grep -q "gameId\|playerId\|null"; then
    echo "   ✅ 端口 $port: 正常"
  else
    echo "   ❌ 端口 $port: 异常"
  fi
done

echo ""
echo "=== 测试完成 ==="
