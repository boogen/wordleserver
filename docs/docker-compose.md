# Docker Compose

## Profiles

There are three deployment profiles. Each starts only the services it needs.

| Profile | Port | Mongo | MariaDB | Use case |
|---------|------|-------|---------|----------|
| `dev` | 5003 | external | external | Local development against shared DBs |
| `prod` | 5000 | external | external | Production, DBs managed outside compose |
| `standalone` | `$PORT` | local container | local container | Self-contained, no external dependencies |

A fourth one-shot profile handles data initialization:

| Profile | Use case |
|---------|----------|
| `model` | Seed MongoDB with words, crosswords, and spelling bee data (run once) |

---

## Quick start

### dev / prod

These profiles expect MongoDB and MariaDB to be running externally. Set `MONGO_HOST` (and stats DB vars) in your `.env`, then:

```bash
docker compose --profile=dev up
# or
docker compose --profile=prod up
```

### standalone

Starts the app, MongoDB, and MariaDB all together. First run also requires seeding the database:

```bash
# First run only — seed MongoDB with game data
docker compose --profile=standalone --profile=model up

# Subsequent runs
docker compose --profile=standalone up
```

---

## Environment variables

Create a `.env` file in the project root. Variables marked **required** must be set for the relevant profile to work.

### App

| Variable | Required for | Description |
|----------|-------------|-------------|
| `PORT` | standalone | Port the app listens on and the host port it is mapped to |
| `MONGO_HOST` | dev, prod | Hostname of the external MongoDB instance |
| `MONGO_URI` | all (set by compose) | Full MongoDB connection string — composed internally from `MONGO_HOST` |

### Stats database (MariaDB)

| Variable | Required for | Description |
|----------|-------------|-------------|
| `STATS_DB_NAME` | standalone | Database name (e.g. `wordle_stats`) |
| `STATS_DB_USER` | standalone | Application DB user |
| `STATS_DB_PASSWORD` | standalone | Password for `STATS_DB_USER` |

### Model seeding

| Variable | Required for | Description |
|----------|-------------|-------------|
| `MONGO_DB` | model | Target MongoDB database name for seeding |

### Optional / external integrations

| Variable | Description |
|----------|-------------|
| `ONE_SIGNAL_API_KEY` | Push notification delivery via OneSignal |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Calendar integration) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth refresh token |
| `SENTRY_DNS` | Sentry DSN for error tracking |

---

## Services

### `wordle_dev` / `wordle_prod` / `wordle_standalone`

Node.js application container. On startup it installs dependencies, compiles TypeScript, then starts the app with nodemon:

```
npm clean-install && npm install typescript -g && tsc && npm run dev
```

The project root is mounted at `/wordle` inside the container, so source changes are reflected without rebuilding the image.

**dev** connects to `wordle_dev` database; **prod** and **standalone** connect to `wordle`.

### `mongo` *(standalone only)*

Official MongoDB image. Initialized by `scripts/init.sh` on first start. Data is persisted to `/var/lib/mongodb_wordle` on the host.

### `mariadb` *(standalone only)*

Official MariaDB image. Initialized with the schema from `scripts/stats.sql` on first start. Data is persisted to `/var/lib/mariadb_stats` on the host.

The stats schema contains these event tables: `registration_event`, `login_event`, `nick_set_event`, `wordle_init_event`, `wordle_guess_event`, `crossword_init`, `crossword_guess`, `spelling_bee_guess`, `spelling_bee_duel_prematch`, `spelling_bee_duel_start_event`, `spelling_bee_duel_guess_event`, `spelling_bee_duel_end_event`.

### `model` *(model profile only)*

One-shot Python container that seeds MongoDB with game data from the `model/` directory:

- `model/possible_words.txt` — valid guess words
- `model/words.txt` — answer words
- `model/crosswrds_uniq` — crossword puzzles
- `model/new_spelling_bee` — spelling bee letter sets
- `model/fallback_bee` — fallback bee data

Requires `mongo` to be running (activate `standalone` profile together with `model`).

---

## Networks

| Network | Purpose |
|---------|---------|
| `proxy` | Exposes the app to an external reverse proxy (e.g. nginx, Traefik) |
| `mongo` | Internal communication between app and MongoDB |
| `stats` | Internal communication between app and MariaDB |

In `dev` and `prod` profiles, `proxy`, `mongo`, and `stats` are expected to be pre-existing external networks on the host. In `standalone`, they are created locally by compose.

---

## Volumes (standalone)

| Host path | Container path | Service |
|-----------|---------------|---------|
| `/var/lib/mongodb_wordle` | `/data/db` | mongo |
| `/var/lib/mariadb_stats` | `/var/lib/mysql` | mariadb |

Both paths on the host must be writable by the Docker daemon, or the containers will fail to start.
