# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
AI-powered Werewolf game framework - a monorepo implementing an AI-driven multiplayer werewolf game with distinct AI personalities, featuring immersive TTS audio, background music, and real-time visualization.

🎮 **Online Demo**: https://solution.minimaxi.com/werewolf/

## Tech Stack & Package Manager
- **Package Manager**: Bun (no build step needed for backend, direct execution)
- **Frontend**: Vite + React + MobX + TailwindCSS
- **Backend**: Node.js/Bun + Express
- **AI Integration**: MiniMax AI (MiniMax-M2 model), Langfuse telemetry
- **Audio**: Web Audio API, TTS (Text-to-Speech), Background Music
- **State Management**: MobX with global stores
- **Deployment**: Docker + Docker Compose
- 我用bun，不需要build

## Critical Development Rules
- **TypeScript**: NEVER use `any` type - always use proper typing
- **Always use ultrathink** for complex reasoning tasks
- **Player IDs**: Always use numbers for Player IDs
- **Shared Types**: Only put types in shared/ if needed by Player services (e.g., API types called by game master)
- **MobX Reactivity**: ALL components using MobX state MUST use `observer` HOC
- **Audio Context**: TTS and BGM use synchronized AudioCoordinator for ducking

## Common Development Commands

### Docker Deployment (Production)
```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

### Development
```bash
# Start all 6 AI players (ports 3001-3006)
./scripts/dev-players.sh
# OR
bun run dev:players

# Start game master frontend (port 3000)
bun run dev:game-master

# Start individual player with config
bun run dev:player:aggressive
bun run dev:player:conservative
bun run dev:player:witty
bun run dev:player:default
```

### Code Quality
```bash
# Type checking (entire monorepo)
bun run typecheck
bunx tsc --build

# Type checking specific packages
bun run typecheck:frontend
bun run typecheck:backend

# Linting
bun run lint

# Testing (when tests exist)
bun test
bun run test:packages
bun run test:coverage
```

## Architecture Overview

### Monorepo Structure
```
packages/
├── game-master-vite/   # Frontend UI (Vite + React + MobX)
│   └── src/
│       ├── components/      # React components with observer HOC
│       │   ├── ImmersiveMode/  # Immersive view components
│       │   │   ├── ImmersiveView.tsx     # Main immersive mode
│       │   │   ├── EventTimeline.tsx     # Left panel: key events
│       │   │   ├── ThinkingPanel.tsx     # Right panel: inner thoughts
│       │   │   ├── PlayerCircle.tsx      # Circular player layout
│       │   │   └── PhaseIndicator.tsx    # Game phase display
│       ├── stores/          # MobX global stores
│       └── lib/             # GameMaster class, audio system
│           ├── GameMaster.ts         # Core game logic
│           ├── PlayerAPIClient.ts    # HTTP client for AI players
│           └── audio/                # Audio system
│               ├── AudioCoordinator.ts      # TTS + BGM coordinator
│               ├── TTSQueue.ts             # TTS playback queue
│               └── BackgroundMusicPlayer.ts # Phase-based BGM
├── player/             # AI player server
│   └── src/
│       ├── services/   # AIService, PersonalityFactory
│       ├── configs/    # Player personality configs (JSON)
│       └── prompts/    # Modular prompt templates
shared/
├── types/              # Shared TypeScript types & schemas
│   └── src/
│       ├── api.ts      # API request/response types
│       └── schemas.ts  # Zod schemas for AI responses
├── lib/                # Shared utilities & Langfuse integration
└── prompts/            # AI prompt templates
```

### Core Game Flow
1. **Game Creation**: Frontend calls `gameMaster.createGame(6)` → adds 6 AI players → assigns roles
2. **Game Phases**: Night (role abilities) → Day (discussion) → Voting → repeat
3. **AI Players**: Each runs on separate port (3001-3006), receives game state via HTTP API
4. **Role System**: 4 roles only - VILLAGER, WEREWOLF, SEER, WITCH (no HUNTER/GUARD)
5. **Immersive Mode**: TTS narration, background music, real-time event timeline, inner thoughts display

## MobX React Development Pattern

### Required Pattern
```typescript
// ✅ ALWAYS use this pattern
import { observer } from 'mobx-react-lite';
import { gameMaster } from '@/stores/gameStore';

export const Component = observer(function Component() {
  const data = gameMaster.computedProperty; // Direct global state access
  return <div>{data}</div>;
});
```

### Core MobX Rules
1. **Global State First**: Access state directly from global stores, never pass through props
2. **Observer Wrapper**: ALL components using MobX state MUST use `observer` HOC
3. **Computed Properties**: Use `computed` for derived data to optimize performance
4. **Avoid Redundant APIs**: Get data directly from state, don't make unnecessary network requests
5. **Observable GameLog**: `gameMaster.gameLog` is observable for real-time updates to EventTimeline/ThinkingPanel

## Immersive Mode Architecture

### Audio System
**AudioCoordinator** (`packages/game-master-vite/src/lib/audio/AudioCoordinator.ts`):
- Manages TTS Queue and Background Music Player
- Implements audio ducking (BGM volume reduces when TTS plays)
- Phase-aware music switching (night.mp3, day.mp3, voting.mp3)
- TTS completion tracking for UI synchronization

**Key Components**:
- `TTSQueue`: Sequential TTS playback queue with status callbacks
- `BackgroundMusicPlayer`: Phase-based music with fade in/out
- `subscribeTTS()`: Allows components to react to TTS state changes

### Display Synchronization
**EventTimeline** (Left Panel):
- Shows key events: night actions, speeches, votes, deaths
- Events appear ONLY after corresponding TTS completes
- Uses `displayedSpeechIds` Set to track completed TTS

**ThinkingPanel** (Right Panel):
- Shows AI inner thoughts (thinking field from API responses)
- Appears progressively as each TTS completes
- Extracts thinking from `speechSystem.getAllSpeeches()`

**Implementation Pattern**:
```typescript
// Track TTS completion by detecting ID changes
if (lastPlayingTTSIdRef.current !== currentTTSId) {
  const speechId = ttsToSpeechMapRef.current.get(previousTTSId);
  setDisplayedSpeechIds(prev => new Set([...prev, speechId]));
}
```

## Critical Integration Points

### MiniMax AI Integration
- **API Key Configuration**: Set via Web UI (no .env needed for production)
- **Model**: MiniMax-M2 with extended thinking chain
- **Response Format**: Structured outputs with Zod schemas
- **Thinking Field**: All AI responses include `thinking` for inner thoughts display

### Langfuse Telemetry
- Located in `shared/lib/src/langfuse.ts`
- Key exports: `getAITelemetryConfig`, `shutdownLangfuse`, `langfuse` object
- Browser-safe implementation (no-op flush in frontend)
- Tracks: game sessions, player actions, AI generation events

### Game State Management
- Frontend: Global `GameMaster` instance in `packages/game-master-vite/src/stores/gameStore.ts`
- **GameLog**: In-memory structured log with speeches, votes, nightActions, events
- **SpeechSystem**: Stores all speeches by round with thinking/traceId
- Players maintain local state, receive updates via API
- State sync through HTTP endpoints, no WebSocket

### TTS-Speech Synchronization
**Key Pattern**: Map TTS IDs to Speech IDs for completion tracking
```typescript
// When enqueueing TTS
const ttsId = audioCoordinator.enqueueTTS({...});
const speechId = `${roundNum}-${index}`;
ttsToSpeechMapRef.current.set(ttsId, speechId);

// When TTS completes
const speechId = ttsToSpeechMapRef.current.get(ttsId);
setDisplayedSpeechIds(prev => new Set([...prev, speechId]));
```

## Player Configuration
AI players run on ports 3001-3006 with personalities defined in JSON configs:
- **Port 3001-3006**: Individual AI players with unique personalities
- Config files: `packages/player/configs/*.json`
- Each player has:
  - `personality`: Detailed personality description
  - `strategy`: aggressive/conservative/balanced
  - `speechStyle`: casual/formal/witty
  - `voiceId`: TTS voice identifier

## UI Components

### Game Controls
- **Create New Game**: Blue button, auto-configures 6 AI players
- **Start Game**: Green button, enabled when game created
- **Next Phase**: Purple button, disabled during processing or TTS playback
- **Enter Immersive Mode**: Purple gradient button, enabled after game creation

### Immersive Mode Layout
```
[Exit Button]                                    (top-left)
┌─────────────────────────────────────────────────────────┐
│  Left Panel (w-64)  │  Center (flex-1)  │  Right Panel (w-80) │
│  📜 Event Timeline  │  Player Circle    │  💭 Thinking Panel   │
│  - Night actions    │  Phase Indicator  │  - Inner thoughts    │
│  - Speeches         │  Game Controls    │  - By speech/action  │
│  - Votes            │                   │                      │
│  - Deaths           │                   │                      │
└─────────────────────────────────────────────────────────┘
```

### Player Cards
- Show role icons (🐺🔮🧪👤), alive/dead status
- Circular layout in immersive mode
- Highlight animation when speaking

## Environment Configuration

### Docker Deployment (.env)
```bash
# MiniMax API Key (can also be set via Web UI)
MINIMAX_API_KEY=your_key_here

# Langfuse Telemetry (optional)
LANGFUSE_SECRET_KEY=your_secret_key
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_BASEURL=https://us.cloud.langfuse.com
```

### Audio Assets
Audio files in `audio/` directory:
- `bgm/night.mp3` - Night phase background music
- `bgm/day.mp3` - Day phase background music
- `bgm/voting.mp3` - Voting phase background music
- **Volume**: BGM defaults to 50%, ducks to 30% during TTS

## Prompt System Architecture

### Prompt Organization
Prompts are modular and role-specific in `packages/player/src/prompts/`:
- `personality/` - Personality trait prompts
- `speech/` - Role-specific speech generation prompts
- `voting/` - Voting decision prompts by role
- `night/` - Night action prompts for special roles

### Voting Prompt Optimization
- Voting phase: AI outputs vote target + thinking, NO public speech
- History format: "X号投票给Y号" (simplified, no reasoning)
- TTS plays: "我投 X 号" (short announcement only)

### Night Phase Flow
- System announces: "狼人请杀人" → waits 3.5s → werewolf acts
- System announces: "预言家请指认" → waits 3.5s → seer acts
- System announces: "女巫请确认是否使用药水" → waits 3.5s → witch acts
- Night action speeches include `thinking` field for ThinkingPanel

## API Communication Pattern

### Game Master → Player Communication
Game master sends HTTP requests to player servers on ports 3001-3008:

**Endpoints:**
- `POST /api/player/start` - Initialize player with game ID, role, teammates
- `POST /api/player/speak` - Request speech during discussion phase
- `POST /api/player/vote` - Request voting decision
- `POST /api/player/ability` - Request night ability usage (role-specific)
- `GET /api/player/status` - Health check and player status

**Response Format:**
All responses include:
- `thinking`: Inner thoughts for ThinkingPanel display
- `traceId`: Langfuse trace ID for debugging
- Action-specific fields (speech, target, reason, etc.)

### Player API Client (`PlayerAPIClient`)
Located in `packages/game-master-vite/src/lib/PlayerAPIClient.ts`:
- Handles HTTP communication with player servers
- Auto-retry logic with exponential backoff
- Timeout handling (configurable per request type)
- Error fallback to default responses

## Game History System

### GameLog Structure
Located in `packages/game-master-vite/src/lib/GameMaster.ts`:
```typescript
interface GameLog {
  gameId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  config: GameConfig;
  players: GameLogPlayerInfo[];
  totalRounds: number;
  speeches: SpeechLog[];      // All player speeches
  votes: VoteLog[];           // All voting records
  nightActions: NightActionLog[];  // All night actions
  events: GameEvent[];        // Game events (deaths, phase changes)
  result?: GameResult;        // Winner, reason, survivors
}
```

### Storage
- In-memory during gameplay
- Saved to backend API on game end
- Retrieved via `GET /api/game-logs` and `GET /api/game-logs/:gameId`

## Logging & Monitoring

### Browser Console Logs
Key log patterns for debugging:
```
[ImmersiveView] TTS switched, mark previous speech as displayed: 1-8
[ImmersiveView] Player TTS queued - ttsId: xxx, speechId: 1-8, playerId: 3
[TTSQueue] Item completed: tts-xxx
[BGM] Switching to phase: day
```

### Langfuse Tracing
- Game sessions traced with game ID
- Each player creates session with role and teammate info
- Phase-level tracing for game flow analysis
- AI generation events logged with telemetry

## Recent Major Changes

### v1.2.0 - Immersive Mode Enhancements (2024-12)
- ✅ TTS-synchronized event timeline and thinking panels
- ✅ Night action thinking properly displayed
- ✅ Voting speech optimization (short announcements only)
- ✅ Audio control panel removed (default 50% volume)
- ✅ Immersive mode entry restricted to after game creation
- ✅ GitHub link added to header

### Known Behaviors
- **Night Actions**: Display as text immediately (no TTS), thinking appears instantly
- **Player Speeches**: TTS plays, then event + thinking appear in panels
- **Voting**: TTS plays "我投X号", then vote event + thinking appear
- **Phase Processing**: "Next Phase" button disabled during AI processing or TTS playback

## Development Tips

### Adding New Audio Features
1. Update `AudioCoordinator` for new audio types
2. Create mapping in `ttsToSpeechMapRef` for completion tracking
3. Update `displayedSpeechIds` logic in TTS subscription
4. Test with console logs to verify completion detection

### Adding New Game Events
1. Add to `GameLog.events` array in `GameMaster.ts`
2. Update `EventTimeline.tsx` to display new event type
3. Ensure event has `timestamp` or `round` for sorting

### Debugging TTS Issues
- Check browser console for `[TTSQueue]` and `[ImmersiveView]` logs
- Verify `ttsToSpeechMapRef` mapping is created when enqueueing
- Ensure `subscribeTTS` callback detects TTS ID changes
- Test with different speech types (system/player/night_action)

## Known Issues & Fixes
- **TTS Completion**: Use TTS ID change detection, not `status === 'completed'`
- **Night Action Thinking**: Must pass `thinking` parameter to `addSpeech()`
- **Audio Ducking**: BGM must check if fadeIn completed before ducking
- **Langfuse Integration**: `getAITelemetryConfig` must be exported from `shared/lib/src/langfuse.ts`
- **Type Imports**: Always import `PersonalityType` when using AI services
