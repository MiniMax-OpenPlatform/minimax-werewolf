#!/bin/bash

export PATH="$HOME/.bun/bin:$PATH"

# 加载环境变量
if [ -f "/data1/devin/wolf/AI-Werewolf/.env" ]; then
    echo "📋 加载环境变量..."
    set -a
    source /data1/devin/wolf/AI-Werewolf/.env
    set +a
fi

echo "🛑 停止旧的玩家服务器..."
pkill -f "bun.*player" 2>/dev/null
sleep 2

echo "🤖 重新启动 AI 玩家服务器..."
mkdir -p /data1/devin/wolf/AI-Werewolf/logs

cd /data1/devin/wolf/AI-Werewolf/packages/player

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
echo "✅ 所有玩家服务器已重启！"
echo ""
echo "检查进程状态..."
ps aux | grep "bun.*dev.*config" | grep -v grep | wc -l | xargs echo "运行中的玩家进程数:"

echo ""
echo "检查 API 密钥是否正确传递..."
sleep 2
tail -5 logs/player1-dev.log | grep -E "API|配置"

echo ""
echo "📊 运行状态检查脚本..."
bash /data1/devin/wolf/AI-Werewolf/check-status.sh
