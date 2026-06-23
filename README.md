# 이세계 던전 탐험

현실 정보 기반 캐릭터 생성, 운명 분석, 랜덤 직업/특성/던전/장비, 턴제 텍스트 전투, 환생 기반 성장을 갖춘 Next.js 웹 RPG입니다.

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Zustand local-first autosave
- Framer Motion
- NextAuth v5
- Prisma + PostgreSQL schema
- OpenAI API story generation with local fallback

## Run

The desktop workspace provides bundled Node and pnpm. If your shell already has Node, plain `pnpm` works.

```bash
export PATH="/Users/jaekwangahn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/jaekwangahn/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH"
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:3000`.

## Implemented MVP

- Reality profile input: name, gender, birth date, birth time, height, weight.
- Fate analysis: zodiac, five elements, temperament, fortune, talent bonus.
- Avatar generation: stats, random rarity job, hidden job chance, trait.
- Beginner dungeon: randomized room chain with monsters, traps, treasure, shop, rest, mini-boss, boss.
- Turn combat: attack, skill, defend, dodge, item, escape.
- Loot: rarity equipment, random options, equipment slots, enhancement.
- Town: dungeon entry, potion purchase, weapon enhancement, reincarnation gate.
- Quests and achievements foundation.
- Local autosave with Zustand persist.
- AI story endpoint at `/api/game/story`.
- Prisma schema and API design docs for production persistence.

## Production Notes

Configure PostgreSQL in `DATABASE_URL`, run `pnpm db:generate` and `pnpm db:push`, then wire `/api/game/save` to `GameSave`. Prisma 7 stores the connection URL in `prisma.config.ts`, while `prisma/schema.prisma` keeps the data model. The schema already includes users, characters, equipment, inventory, quests, achievements, dungeon runs, and save snapshots.

## Docs

- [API Design](docs/api-design.md)
- [Game Balance](docs/balance.md)
- [Roadmap](docs/roadmap.md)
- [Sample Data](docs/sample-data.md)

## Deploy on Vercel

1. Create a Vercel project.
2. Add `DATABASE_URL`, `AUTH_SECRET`, and optionally `OPENAI_API_KEY`.
3. Use a managed PostgreSQL provider.
4. Run Prisma migrations during release.

The game runs without `OPENAI_API_KEY`; dynamic story generation falls back to local narration.
