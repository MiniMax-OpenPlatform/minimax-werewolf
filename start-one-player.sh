#!/bin/bash

export PATH="$HOME/.bun/bin:$PATH"

player_num=$1
if [ -z "$player_num" ]; then
  echo "用法: $0 <玩家编号>"
  exit 1
fi

port=$((3000 + player_num))

echo "🛑 停止端口 $port 的进程..."
lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

cd /data1/devin/wolf/AI-Werewolf

# 加载环境变量
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

echo "🤖 启动玩家 $player_num (端口 $port)..."
cd packages/player
bun run dev --config="../../config/player$player_num.yaml" > "../../logs/player$player_num-dev.log" 2>&1 &
pid=$!
cd ../..

echo "PID: $pid"
sleep 3

echo ""
echo "检查启动状态..."
if curl -s --connect-timeout 2 http://localhost:$port/api/player/status > /dev/null 2>&1; then
  echo "✅ 玩家 $player_num 启动成功 (端口 $port)"
else
  echo "❌ 玩家 $player_num 启动失败"
  echo ""
  echo "日志内容:"
  tail -20 logs/player$player_num-dev.log
fi
