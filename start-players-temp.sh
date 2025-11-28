#!/bin/bash

export PATH="$HOME/.bun/bin:$PATH"

echo "🤖 启动 AI 玩家服务器..."
mkdir -p logs

cd packages/player

for i in 1 2 3 4 5 6; do
  echo "启动玩家 $i (端口 300$i)..."
  bun run dev --config="../../config/player$i.yaml" > "../../logs/player$i-dev.log" 2>&1 &
  pid=$!
  echo "  PID: $pid"
  sleep 2
done

cd ../..

sleep 3
echo ""
echo "✅ 所有玩家服务器启动完成！"
echo ""
echo "检查进程状态..."
ps aux | grep "bun.*dev" | grep -v grep | head -10

echo ""
echo "📋 查看日志："
echo "  tail -f logs/player1-dev.log"
