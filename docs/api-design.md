# API Design

## Auth

- `GET|POST /api/auth/[...nextauth]`: NextAuth v5 route. The current MVP uses demo credentials and can be swapped to Google, Kakao, Discord, or email.

## Game

- `POST /api/game/story`: Generates Korean dungeon narration with OpenAI. If `OPENAI_API_KEY` is absent, returns deterministic local fallback text.
- `POST /api/game/save`: Validates a local-first save payload. It is ready to connect to `GameSave` in Prisma after PostgreSQL is configured.

## Planned Production Endpoints

- `GET /api/characters`: List user characters.
- `POST /api/characters`: Create fate-analyzed character server-side.
- `PATCH /api/characters/:id`: Persist level, stats, gold, reincarnation.
- `POST /api/dungeons/start`: Create a dungeon run from seed, level band, and dungeon table.
- `POST /api/dungeons/:runId/choice`: Resolve a room choice server-side.
- `POST /api/combat/:runId/action`: Resolve one turn with server-authoritative combat.
- `POST /api/equipment/:id/enhance`: Apply enhancement probability and cost.
- `POST /api/quests/generate`: Generate AI-assisted quest templates and sanitize rewards.
