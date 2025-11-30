#!/bin/bash
# 生成占位符音频文件

set -e

AUDIO_DIR="audio"
mkdir -p "$AUDIO_DIR/bgm" "$AUDIO_DIR/sfx"

echo "🎵 生成音频占位符文件..."

# 检查是否安装了ffmpeg
if command -v ffmpeg &> /dev/null; then
    echo "✅ 使用ffmpeg生成静音音频占位符"

    # 夜间BGM - 30秒静音（实际应该是神秘低沉的音乐）
    ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 30 -q:a 9 -acodec libmp3lame \
        "$AUDIO_DIR/bgm/night.mp3" -y 2>/dev/null

    # 白天BGM - 30秒静音（实际应该是明快讨论的音乐）
    ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 30 -q:a 9 -acodec libmp3lame \
        "$AUDIO_DIR/bgm/day.mp3" -y 2>/dev/null

    # 投票BGM - 30秒静音（实际应该是紧张悬疑的音乐）
    ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 30 -q:a 9 -acodec libmp3lame \
        "$AUDIO_DIR/bgm/voting.mp3" -y 2>/dev/null

    # 阶段切换音效 - 2秒静音
    ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 2 -q:a 9 -acodec libmp3lame \
        "$AUDIO_DIR/sfx/phase-change.mp3" -y 2>/dev/null

    # 游戏开始音效 - 3秒静音
    ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 3 -q:a 9 -acodec libmp3lame \
        "$AUDIO_DIR/sfx/game-start.mp3" -y 2>/dev/null

    echo "✅ 音频文件生成完成"
else
    echo "⚠️  ffmpeg未安装，创建空占位符文件"
    echo "⚠️  请从以下来源下载真实音频并替换："
    echo "   - https://freemusicarchive.org/"
    echo "   - https://incompetech.com/"

    # 创建空文件作为占位符
    touch "$AUDIO_DIR/bgm/night.mp3"
    touch "$AUDIO_DIR/bgm/day.mp3"
    touch "$AUDIO_DIR/bgm/voting.mp3"
    touch "$AUDIO_DIR/sfx/phase-change.mp3"
    touch "$AUDIO_DIR/sfx/game-start.mp3"
fi

# 创建README
cat > "$AUDIO_DIR/README.md" << 'EOF'
# 音频资源说明

## 背景音乐 (BGM)

### night.mp3 - 夜间音乐
- **风格**: 神秘、低沉、紧张
- **时长**: 30秒循环
- **推荐**: Dark Ambient, 狼嚎声, 夜风
- **参考**: "Dark Fog" by Kevin MacLeod

### day.mp3 - 白天音乐
- **风格**: 明快、讨论氛围
- **时长**: 30秒循环
- **推荐**: Acoustic, 思考氛围
- **参考**: "Deliberate Thought" by Kevin MacLeod

### voting.mp3 - 投票音乐
- **风格**: 紧张、悬疑、倒计时
- **时长**: 30秒循环
- **推荐**: Tension, Suspense
- **参考**: "Tension" by Kevin MacLeod

## 音效 (SFX)

### phase-change.mp3 - 阶段切换音效
- **时长**: 2秒
- **用途**: 游戏阶段转换时播放

### game-start.mp3 - 游戏开始音效
- **时长**: 3秒
- **用途**: 沉浸模式启动时播放

## 推荐音乐资源

### 免费可商用音乐
1. **Incompetech** - https://incompetech.com/music/royalty-free/
   - Kevin MacLeod的作品，需署名

2. **Free Music Archive** - https://freemusicarchive.org/
   - 大量CC授权音乐

3. **Bensound** - https://www.bensound.com/
   - 高质量背景音乐

### 音效资源
1. **Freesound** - https://freesound.org/
2. **Zapsplat** - https://www.zapsplat.com/

## 文件要求

- **格式**: MP3
- **比特率**: 128kbps
- **采样率**: 44.1kHz
- **单个文件大小**: < 2MB
- **总大小**: < 10MB

## 替换方法

```bash
# 下载音频文件后，替换到对应位置
cp your-night-music.mp3 audio/bgm/night.mp3
cp your-day-music.mp3 audio/bgm/day.mp3
cp your-voting-music.mp3 audio/bgm/voting.mp3
```
EOF

echo ""
echo "📁 音频文件列表："
ls -lh "$AUDIO_DIR/bgm/"
ls -lh "$AUDIO_DIR/sfx/"
echo ""
echo "📖 使用说明已保存到 $AUDIO_DIR/README.md"
