#!/bin/bash

export PATH="$HOME/.bun/bin:$PATH"

echo "🎮 启动游戏主界面..."
cd /data1/devin/wolf/AI-Werewolf

bun run dev:game-master > logs/game-master-dev.log 2>&1 &
pid=$!

echo "游戏主界面 PID: $pid"
sleep 5

echo ""
echo "检查端口 3000..."
netstat -tulnp 2>/dev/null | grep ":3000" || ss -tulnp 2>/dev/null | grep ":3000"

echo ""
echo "✅ 游戏主界面启动完成！"
echo ""
echo "📱 访问地址: http://localhost:3000"
echo ""
echo "📋 查看日志: tail -f logs/game-master-dev.log"
