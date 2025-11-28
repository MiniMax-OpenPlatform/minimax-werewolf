#!/bin/bash

export PATH="$HOME/.bun/bin:$PATH"

echo "🛑 停止旧的游戏主界面进程..."
pkill -f "vite.*3000" 2>/dev/null
killall -9 node 2>/dev/null
sleep 2

echo "🎮 启动游戏主界面（监听所有网卡）..."
cd /data1/devin/wolf/AI-Werewolf

bun run dev:game-master > logs/game-master-dev.log 2>&1 &
pid=$!

echo "游戏主界面 PID: $pid"
sleep 5

echo ""
echo "检查端口 3000 监听状态..."
netstat -tuln 2>/dev/null | grep ":3000" || ss -tuln 2>/dev/null | grep ":3000"

echo ""
if netstat -tuln 2>/dev/null | grep -q "0.0.0.0:3000"; then
  echo "✅ 游戏主界面已启动，监听所有网卡 (0.0.0.0:3000)"
  echo ""
  echo "📱 访问地址:"
  echo "  本地: http://localhost:3000"
  echo "  外部: http://10.43.1.247:3000"
elif netstat -tuln 2>/dev/null | grep -q "127.0.0.1:3000"; then
  echo "⚠️  游戏主界面只监听本地 (127.0.0.1:3000)"
  echo "    外部无法访问，请检查配置"
else
  echo "❌ 游戏主界面启动失败"
  echo "    请查看日志: tail -f logs/game-master-dev.log"
fi

echo ""
echo "📋 查看日志: tail -f logs/game-master-dev.log"
