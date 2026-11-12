# Image Processing Service

A backend for uploading, transforming and retrieving images, similar in spirit to Cloudinary. Users register and log in, upload images, apply transformations (resize, crop, rotate, format change, filters), and fetch or list their images.

This is a practice project built from the [roadmap.sh Image Processing Service](https://roadmap.sh/projects/image-processing-service) brief. A goal of the project is to practise **planning and implementing** a backend in small, working slices, so the reasoning behind each choice is written down.

> **Status:** Slice 1 (the skeleton) is done: a Fastify server with a `/health` endpoint, validated configuration, Postgres and RustFS running under docker compose, the `users` and `images` tables, and a first test. Authentication, upload and transforms are not built yet, so the API below is the plan, not what exists.

## Documentation
- [docs/PLAN.md](docs/PLAN.md): what is being built and in what order (stack, rules, data model, API contract, slices).
- [docs/DECISIONS.md](docs/DECISIONS.md): every decision with its options, reasoning and trade-offs.

## Planned stack
| Job | Choice |
|---|---|
| Language / runtime | TypeScript on Node |
| Web framework | Fastify |
| Database | Postgres (in a container) |
| Database access | postgres.js with plain SQL migrations |
| File storage | RustFS (S3-compatible) |
| Image processing | sharp |
| Validation | zod |
| Auth | argon2 password hashing, JWT via `@fastify/jwt` |
| Tests | vitest |

## Planned API
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/register` | no | Create an account |
| POST | `/login` | no | Log in, receive a JWT |
| POST | `/images` | yes | Upload an image (multipart) |
| POST | `/images/:id/transform` | yes | Apply transformations, creating a new image |
| GET | `/images/:id` | yes | Fetch an image; optional `?format=webp` |
| GET | `/images?page=&limit=` | yes | List your images with metadata |

Images are private to their owner. Transforms never change the original.

## Roadmap
Work is split into slices, each of which works end to end before the next begins:

0. Stack and design decisions (done)
1. Project skeleton, docker compose (Postgres and RustFS), health check (done)
2. Authentication
3. Upload and list
4. Retrieve
5. Transformations
6. Hardening: rate limiting, caching, consistent errors
7. Bonus: queue-based asynchronous transforms

The checklist lives in [docs/PLAN.md](docs/PLAN.md).

## Running it
You need Node, npm, and a container engine (Docker or OrbStack).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your settings file and fill it in (see the comments in `.env.example`):
   ```bash
   cp .env.example .env
   ```
3. Start Postgres and RustFS:
   ```bash
   docker compose up -d
   ```
4. Create the database tables (once):
   ```bash
   docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < migrations/001_init.sql
   ```
5. Create the storage bucket (once): open the RustFS console at http://localhost:9001, log in with `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY` from your `.env`, and create a bucket named `images` (the `S3_BUCKET` value).
6. Start the server and check it:
   ```bash
   npm run dev
   curl http://localhost:3000/health
   ```
7. Run the tests:
   ```bash
   npm test
   ```

Postgres only reads `POSTGRES_PASSWORD` the first time it creates its data folder (`.data/postgres`). If you change the password afterwards, delete that folder (this erases the database) or change it inside Postgres with `ALTER USER`. The reasoning behind the setup choices is in [docs/DECISIONS.md](docs/DECISIONS.md) (D-26).
