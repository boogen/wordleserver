# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Compile TypeScript
npx tsc

# Run in development (watches compiled output)
npm run dev

# Run directly with ts-node (no compile step)
npm run ts-start

# Lint (auto-fixes)
npm run lint

# Run tests
npm test

# Regenerate routes and OpenAPI spec from controller decorators
npm run tsoa:gen

# Generate Swagger docs
npm run swagger-autogen
```

> After modifying any controller (`*_controller.ts`), run `npm run tsoa:gen` to regenerate `src/routes.ts`.

## Architecture

**Stack:** Express + TypeScript, MongoDB (via monk), MariaDB (analytics), Inversify DI, TSOA routing.

### Request flow

```
src/index.ts → src/app.ts (middleware, routes) → src/routes.ts (TSOA-generated)
  → Controller (src/api/v4/**/*_controller.ts)
    → DBI (src/api/v4/DBI/) for MongoDB
    → Stats (src/WordleStatsDBI.ts) for MariaDB analytics
```

### Dependency injection (`src/ioc.ts`)

All controllers and services are wired via Inversify. `src/ioc.ts` defines the container; TSOA resolves controller instances through it. Services bound as singletons: `WordleDBI`, `Stats`, `SpellingBeeSeasonManager`, `CronService`, etc. `Logger` is transient (new instance per injection).

### TSOA routing

Routes are **auto-generated** into `src/routes.ts` — never edit that file by hand. Controllers live at `src/api/v4/**/*_controller.ts` and use decorators like `@Route()`, `@Post()`, `@BodyProp()`, `@inject()`. Run `npm run tsoa:gen` after any controller change.

### Data access layer (`src/api/v4/DBI/`)

`DBI.ts` is the main MongoDB connection class (singleton). Sub-directories contain model types and query helpers per game domain: `player/`, `wordle/`, `spelling_bee/`, `crosswords/`.

### Games supported

- **Wordle** — daily word guessing (`api/v4/wordle`)
- **Spelling Bee** — letter-set word finding with seasons and ELO duels (`api/v4/spelling_bee`, `api/v4/spelling_bee/duel`)
- **Crossword v2 / v3** — two crossword implementations (`api/v4/crossword`, `api/v4/crossword_v3`)
- **Rankings** — ELO leaderboards (`api/v4/ranking`)
- **Friends** — friend codes (`api/v4/friend`)
- **Explainer** — Google Gemini AI word explanations (`api/v4/explainer`)

### Analytics

`src/WordleStatsDBI.ts` writes structured events (registrations, guesses, duel outcomes, etc.) to MariaDB. The `Stats` singleton is injected into controllers that need it.

### Logging

`src/logger.ts` wraps Winston. Logs to files (`error.log`, `out.log`) in `$LOGS_DIR` and to console in non-production. Inject `Logger` where needed; it's transient so each class gets its own instance.

## Docker

```bash
# First-time data initialization
docker compose --profile=model up

# Development (port 5003)
docker compose --profile=dev up

# Production (port 5000)
docker compose --profile=prod up
```

Container startup compiles TypeScript on launch (`tsc && npm run dev`).
