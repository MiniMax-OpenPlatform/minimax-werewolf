#!/bin/bash

echo "=== 测试网络访问 ==="
echo ""

echo "1. 测试本地访问 (localhost):"
if curl -s --connect-timeout 3 http://localhost:3000 > /dev/null 2>&1; then
  echo "   ✅ localhost:3000 可访问"
else
  echo "   ❌ localhost:3000 不可访问"
fi

echo ""
echo "2. 测试内网 IP 访问 (10.43.1.247):"
if curl -s --connect-timeout 3 http://10.43.1.247:3000 > /dev/null 2>&1; then
  echo "   ✅ 10.43.1.247:3000 可访问"
else
  echo "   ❌ 10.43.1.247:3000 不可访问"
fi

echo ""
echo "3. 端口监听状态:"
netstat -tuln 2>/dev/null | grep ":3000" | while read line; do
  if echo "$line" | grep -q "0.0.0.0:3000"; then
    echo "   ✅ 监听所有网卡 (0.0.0.0:3000) - 可以外部访问"
  elif echo "$line" | grep -q "127.0.0.1:3000"; then
    echo "   ⚠️  只监听本地 (127.0.0.1:3000) - 无法外部访问"
  fi
done

echo ""
echo "4. 防火墙状态检查:"
if command -v firewall-cmd &> /dev/null; then
  if firewall-cmd --list-ports 2>/dev/null | grep -q "3000"; then
    echo "   ✅ 防火墙已开放端口 3000"
  else
    echo "   ⚠️  防火墙可能未开放端口 3000"
    echo "      (需要 root 权限才能查看和修改)"
  fi
else
  echo "   ℹ️  未检测到 firewall-cmd"
fi

echo ""
echo "5. 服务器网卡信息:"
ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print "   ", $2, $NF}'

echo ""
echo "=== 测试完成 ==="
