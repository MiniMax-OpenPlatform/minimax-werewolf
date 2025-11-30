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
