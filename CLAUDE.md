# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
AI-powered Werewolf game framework - a monorepo implementing an AI-driven multiplayer werewolf game with distinct AI personalities.

## Tech Stack & Package Manager
- **Package Manager**: Bun (no build step needed for backend, direct execution)
- **Frontend**: Vite + React + MobX + TailwindCSS
- **Backend**: Node.js/Bun + Express
- **AI Integration**: OpenAI SDK, Langfuse telemetry
- **State Management**: MobX with global stores
- 我用bun，不需要build

## Critical Development Rules
- **TypeScript**: NEVER use `any` type - always use proper typing
- **Always use ultrathink** for complex reasoning tasks
- **Player IDs**: Always use numbers for Player IDs
- **Shared Types**: Only put types in shared/ if needed by Player services (e.g., API types called by game master)

## Common Development Commands

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
│       ├── components/ # React components with observer HOC
│       ├── stores/     # MobX global stores
│       └── lib/        # GameMaster class
├── player/             # AI player server
│   └── src/
│       ├── services/   # AIService, PersonalityFactory
│       └── configs/    # Player personality configs
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
2. **Game Phases**: Day (discussion + voting) → Night (role abilities) → repeat
3. **AI Players**: Each runs on separate port (3001-3006), receives game state via HTTP API
4. **Role System**: 4 roles only - VILLAGER, WEREWOLF, SEER, WITCH (no HUNTER/GUARD)

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

## Critical Integration Points

### Langfuse Telemetry
- Located in `shared/lib/src/langfuse.ts`
- Key exports: `getAITelemetryConfig`, `shutdownLangfuse`, `langfuse` object
- Browser-safe implementation (no-op flush in frontend)

### AI Service Architecture
- `AIService` class handles all AI interactions
- Personality system via `PersonalityFactory`
- Each player has configurable personality affecting decisions
- Zod schemas validate AI responses (see `shared/types/src/schemas.ts`)

### Game State Management
- Frontend: Global `GameMaster` instance in `packages/game-master-vite/src/stores/gameStore.ts`
- Players maintain local state, receive updates via API
- State sync through HTTP endpoints, no WebSocket

## Player Configuration
AI players run on ports 3001-3006 with personalities defined in YAML configs:
- **Port 3001-3006**: Individual AI players with unique personalities
- Config files: `config/player[1-6].yaml`
- Each player has strategy (aggressive/conservative/balanced), speech style (casual/formal/witty)

## UI Components
- **Game Controls**: Blue create, green start, purple next phase, red end buttons
- **Player Cards**: Show role icons (🐺🔮🧪👤), alive/dead status
- **Auto-setup**: "Create New Game" button automatically configures 6 AI players

## Environment Configuration

### Required Environment Variables (.env)
```bash
# AI Provider (OpenRouter recommended - supports multiple models)
OPENROUTER_API_KEY=your_key_here
AI_MODEL=google/gemini-2.5-flashm  # or other OpenRouter models

# Langfuse Telemetry (optional but recommended)
LANGFUSE_SECRET_KEY=your_secret_key
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_BASEURL=https://us.cloud.langfuse.com
```

### Player Configuration (YAML)
Config files in `config/` directory define per-player settings:
- `server.port`: Player server port (3001-3008 for 8 players)
- `server.host`: Server host (default "0.0.0.0")
- `ai.maxTokens`: Max tokens for AI responses (default 5000)
- `ai.temperature`: AI temperature setting (default 0.8)
- `ai.provider`: AI provider (e.g., "openrouter")
- `game.personality`: Custom personality description
- `game.strategy`: Strategy type (aggressive/conservative/balanced)
- `logging.enabled`: Enable/disable logging

## Testing

### Running Tests
```bash
# Run all tests with Bun
bun test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage

# Test specific packages
bun run test:packages
```

### API Testing
Test player endpoints directly:
```bash
# Test player speech generation
curl -X POST http://localhost:3001/api/player/speak \
  -H "Content-Type: application/json" \
  -d '{"otherSpeeches": ["player2: 我觉得player3很可疑"]}'

# Check player status
curl http://localhost:3001/api/player/status
```

## Player Count Configuration
- Script supports **8 players** (ports 3001-3008)
- Frontend currently optimized for **6 players**
- To add more players, update both:
  - `scripts/dev-players.sh` (player array)
  - Game configuration for role distribution

## Prompt System Architecture

### Prompt Organization
Prompts are modular and role-specific in `packages/player/src/prompts/`:
- `personality/` - Personality trait prompts (aggressive/conservative/cunning)
- `speech/` - Role-specific speech generation prompts
- `voting/` - Voting decision prompts by role
- `night/` - Night action prompts for special roles
- `special/` - Special scenarios (last words, etc.)

### WerewolfPrompts Factory
Main interface for prompt generation:
- `WerewolfPrompts.getPersonality()` - Get personality prompt
- `WerewolfPrompts.getSpeech()` - Generate speech prompt
- `WerewolfPrompts.getVoting()` - Generate voting prompt
- `WerewolfPrompts.getNightAction()` - Generate night action prompt

## AI Response Validation

All AI responses use Zod schemas for validation (`shared/types/src/schemas.ts`):
- `SpeechResponseSchema` - Speech generation
- `VotingResponseSchema` - Voting decisions
- `WerewolfNightActionSchema` - Werewolf kill action
- `SeerNightActionSchema` - Seer investigate action
- `WitchNightActionSchema` - Witch heal/poison actions

## API Communication Pattern

### Game Master → Player Communication
Game master sends HTTP requests to player servers on ports 3001-3008:

**Endpoints:**
- `POST /api/player/start` - Initialize player with game ID, role, teammates
- `POST /api/player/speak` - Request speech during discussion phase
- `POST /api/player/vote` - Request voting decision
- `POST /api/player/ability` - Request night ability usage (role-specific)
- `GET /api/player/status` - Health check and player status

**Context Payload:**
All requests include `PlayerContext` with:
- `round`: Current round number
- `phase`: Current game phase (DAY/NIGHT/etc.)
- `alivePlayers`: Array of alive player IDs
- `votingHistory`: Historical voting data
- `speeches`: Recent player speeches
- Role-specific context (e.g., `WitchContext` includes werewolf target)

### Player API Client (`PlayerAPIClient`)
Located in `packages/game-master-vite/src/lib/PlayerAPIClient.ts`:
- Handles HTTP communication with player servers
- Auto-retry logic with exponential backoff
- Timeout handling (configurable per request type)
- Error fallback to default responses

## Logging & Monitoring

### Log Files
Development logs in `logs/` directory:
- `player1-dev.log` through `player8-dev.log` - Player logs
- `game-master-dev.log` - Game master logs (if configured)

### Langfuse Tracing
- Game sessions traced with game ID
- Each player creates session with role and teammate info
- Phase-level tracing for game flow analysis
- AI generation events logged with telemetry

## Known Issues & Fixes
- **Langfuse Integration**: `getAITelemetryConfig` must be exported from `shared/lib/src/langfuse.ts`
- **Create Game**: Must add players and assign roles after game creation
- **Type Imports**: Always import `PersonalityType` when using AI services
- **Script Permissions**: Ensure `dev-players.sh` is executable: `chmod +x scripts/dev-players.sh`