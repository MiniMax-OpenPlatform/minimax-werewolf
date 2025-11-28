#!/bin/bash

echo "=== 直接测试玩家1 API ==="
echo ""

echo "1. 检查玩家1端口状态..."
nc -zv localhost 3001 2>&1 | head -2

echo ""
echo "2. 测试 status API..."
curl -s http://localhost:3001/api/player/status | head -10

echo ""
echo "3. 测试 speak API..."
curl -s -X POST http://localhost:3001/api/player/speak \
  -H "Content-Type: application/json" \
  -d '{"round":1,"phase":"DAY","alivePlayers":[1,2,3,4,5,6],"speeches":{},"votingHistory":{}}' \
  | python3 -m json.tool 2>&1 | head -30

echo ""
echo "4. 查看最新日志..."
tail -5 /data1/devin/wolf/AI-Werewolf/logs/player1-dev.log | grep -v "^$"
