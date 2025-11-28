#!/bin/bash

export PATH="$HOME/.bun/bin:$PATH"

echo "🛑 停止所有服务..."
pkill -9 -f "bun" 2>/dev/null
pkill -9 -f "vite" 2>/dev/null
pkill -9 -f "node.*vite" 2>/dev/null

sleep 3

# 清理端口
for port in 3000 3001 3002 3003 3004 3005 3006; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null
done

echo "✅ 清理完成"
sleep 2

# 加载环境变量
cd /data1/devin/wolf/AI-Werewolf
if [ -f ".env" ]; then
    echo "📋 加载环境变量..."
    set -a
    source .env
    set +a
fi

echo ""
echo "🤖 启动AI玩家服务器..."
mkdir -p logs

cd packages/player

for i in 1 2 3 4 5 6; do
  echo "  启动玩家 $i (端口 300$i)..."
  bun run dev --config="../../config/player$i.yaml" > "../../logs/player$i-dev.log" 2>&1 &
  sleep 3
done

cd ../..
sleep 5

echo ""
echo "🎮 启动游戏主界面..."
bun run dev:game-master > logs/game-master-dev.log 2>&1 &
sleep 5

echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "检查服务状态..."
bash check-status.sh
