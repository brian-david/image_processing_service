# Decisions Log

A record of each decision made on this project: what the options were, what was chosen, why, and what was given up. Add new entries at the bottom. If a decision changes, add a new entry that supersedes the old one instead of deleting it.

**Format for each entry:** Context, Options, Decision, Why, Trade-offs.

Entries marked *accepted on recommendation* mean the choice was suggested by Claude and accepted without a strong preference of the owner's own. That is recorded honestly so the reasoning isn't overstated.

---

## Stack

### D-01: Web framework: Fastify
- **Date:** 2026-11-11
- **Context:** Node has only a raw HTTP module. Routing, body parsing, validation, file upload and rate limiting need a framework.
- **Options:** Express (oldest, biggest ecosystem, minimal); Fastify (newer, schema-based, plugins).
- **Decision:** Fastify.
- **Why:** Official plugins for exactly what the spec needs (`@fastify/multipart`, `@fastify/rate-limit`, `@fastify/jwt`), first-class TypeScript support, validation hooks built in.
- **Trade-offs:** Smaller ecosystem and fewer tutorials than Express. Its plugin model has a learning curve. The existing `zaro-backend` uses neither (serverless Lambda with middy), so this is new ground compared with the day job.

### D-02: Database: Postgres
- **Date:** 2026-11-11
- **Context:** Need to store users and per-image metadata. The data is relational (a user has many images; a derived image points to its parent).
- **Options:** Postgres, MySQL, SQLite, MongoDB, DynamoDB.
- **Decision:** Postgres, in a container.
- **Why:** *Accepted on recommendation.* For this project Postgres and MySQL are effectively interchangeable, so it was not a deciding factor. Postgres is a common default for new Node backends.
- **Trade-offs:** Needs a running server (container) and migrations, unlike SQLite. A non-relational store was rejected because the data has clear relationships that foreign keys enforce.

### D-03: Running services: containers via OrbStack + docker compose
- **Date:** 2026-11-11
- **Context:** Postgres and MinIO must run locally. Docker Desktop had previously consumed a lot of disk.
- **Options:** Docker Desktop, OrbStack, installing services directly on macOS.
- **Decision:** docker compose, run under OrbStack. Service data is kept in a project-local `.data/` folder (git-ignored) so its size is visible and it is deleted with the project.
- **Why:** OrbStack is lighter than Docker Desktop and uses the same `docker`/`compose` commands. Local data folders avoid hidden disk growth.
- **Trade-offs:** On macOS containers run in one lightweight Linux VM under the hood. Two always-available containers use some memory and disk.

### D-04: Database access: Prisma
- **Date:** 2026-11-11
- **Context:** TypeScript must talk to Postgres. Choices range from raw SQL strings to ORMs.
- **Options:** raw `pg` (what `zaro-backend` uses); query builders (Kysely, Knex); hybrid (Drizzle); ORM (Prisma, TypeORM).
- **Decision:** Prisma.
- **Why:** Chosen by the owner, who first said "query builder" and then switched to Prisma. No further reason was recorded. Prisma defines tables once in `schema.prisma`, generates typed queries, and manages migrations.
- **Trade-offs:** Hides more of the SQL than a query builder, so less direct SQL practice and it can be easier to write inefficient queries unnoticed (Prisma can log the SQL to compensate). Adds a generate step and its own schema language. Kysely was the closest alternative.

### D-05: File storage: MinIO (S3-compatible)
- **Date:** 2026-11-11
- **Context:** Image bytes need to live somewhere. The database should hold metadata only.
- **Options:** a local folder; MinIO; real AWS S3 / Cloudflare R2.
- **Decision:** MinIO, run locally in a container.
- **Why:** A local folder would also have worked. MinIO was kept deliberately to learn the object-storage pattern used in production, where servers don't share local disk. Code written with the S3 client moves to real S3 by changing configuration.
- **Trade-offs:** One more container and more setup than a folder. The learning value is smaller because the S3 SDK is already used at work. MinIO's open-source edition has changed over time; its current licensing and feature state was not verified. Alternatives (e.g. Garage, SeaweedFS) exist if it becomes a problem.

### D-06: Image processing: sharp
- **Date:** 2026-11-11
- **Context:** The spec needs resize, crop, rotate, flip/mirror, format change, compression, grayscale, sepia, watermark.
- **Options:** sharp (wraps libvips), Jimp (pure JavaScript), ImageMagick/GraphicsMagick, WebAssembly libraries.
- **Decision:** sharp.
- **Why:** *Accepted on recommendation.* Fast and memory-efficient (libvips streams pixels), the de facto standard in Node, ships prebuilt binaries, includes TypeScript types.
- **Trade-offs:** Native binary adds platform concerns when deploying (e.g. to Lambda or Docker). Sepia has no built-in function and must be built with `recomb` or `tint`.

### D-07: Validation: zod via fastify-type-provider-zod
- **Date:** 2026-11-11
- **Context:** The spec requires input validation on every endpoint. Fastify's built-in validation uses JSON Schema, not zod.
- **Options:** plain JSON Schema; TypeBox; zod (with an adapter); joi.
- **Decision:** zod with `fastify-type-provider-zod`.
- **Why:** One schema validates the request and produces the TypeScript type (`z.infer`). joi (used in `zaro-backend`) does not infer types from schemas.
- **Trade-offs:** Needs an extra adapter library to plug into Fastify. TypeBox is the most Fastify-native option and was passed over for zod's wider familiarity.

### D-08: Password hashing: argon2
- **Date:** 2026-11-11
- **Context:** Passwords must never be stored in plaintext; they need a slow, salted one-way hash.
- **Options:** argon2, bcrypt, scrypt (built into Node).
- **Decision:** `argon2`, with bcrypt as the fallback.
- **Why:** *Accepted on recommendation.* It is the current recommended standard and has a simple API.
- **Trade-offs:** Uses native code (like sharp), which can cause install problems; bcrypt is the fallback. Fewer tutorials than bcrypt.

### D-09: Login tokens: JWT via @fastify/jwt
- **Date:** 2026-11-11
- **Context:** After login, later requests must prove who is asking without resending the password.
- **Options:** `jsonwebtoken` (used in `zaro-backend`), `@fastify/jwt`.
- **Decision:** `@fastify/jwt`.
- **Why:** *Accepted on recommendation.* Integrates with Fastify hooks and handles the plumbing while still teaching the concepts.
- **Trade-offs:** Tied to Fastify. JWTs are signed, not encrypted, and cannot easily be revoked before they expire (see D-17).

### D-10: Tests: vitest + app.inject
- **Date:** 2026-11-11
- **Context:** Each slice needs a happy-path and a failure-path test.
- **Options:** Jest (used in `zaro-backend`), vitest.
- **Decision:** vitest, using Fastify's `app.inject` to send fake requests without opening a port. Tests touching the database use a real Postgres test database reset between tests.
- **Why:** Near-identical API to Jest with less TypeScript and ES-module setup, so existing Jest knowledge transfers.
- **Trade-offs:** Smaller ecosystem than Jest. Real-database tests are slower than mocks but catch real schema and migration problems.

### D-11: API style: REST
- **Date:** 2026-11-11
- **Context:** The spec defines fixed endpoints.
- **Options:** REST, GraphQL.
- **Decision:** REST, as the spec defines.
- **Why:** The work is uploads, auth and transforms, which REST handles naturally. GraphQL would add a schema and resolver layer, complicate caching and rate limiting, and make file uploads awkward.
- **Trade-offs:** Fixed response shapes; clients cannot request only the fields they want.

---

## Design decisions (Slice 0)

### D-12: Retrieving an image in a given format
- **Date:** 2026-11-11
- **Context:** The spec says images can be retrieved in different formats, but `GET /images/:id` has no obvious place to ask for one.
- **Options:** `?format=webp` query parameter; `Accept` header; only via the transform endpoint.
- **Decision:** `?format=` query parameter. Omit it to get the stored format.
- **Why:** Explicit, easy to test in a browser or curl, and the URL itself can serve as a cache key.
- **Trade-offs:** Less "pure" than HTTP content negotiation with `Accept`. Requires allow-listing valid format values.

### D-13: Image ownership and visibility
- **Date:** 2026-11-11
- **Context:** The spec doesn't say whether a user can see another user's images.
- **Options:** private with 404 for others; private with 403; visible to any logged-in user.
- **Decision:** Private to the owner. Anyone else gets 404.
- **Why:** 404 doesn't reveal that an ID exists. Implemented as one extra condition in the query (`id` and `user_id`).
- **Trade-offs:** A 403 would be a more informative error. No sharing between users is possible without a later change.

### D-14: What a transform does to the original
- **Date:** 2026-11-11
- **Context:** `POST /images/:id/transform` produces a new image; where does it go?
- **Options:** new derived record keeping the original; overwrite the original; return bytes only and store nothing.
- **Decision:** New derived record that points to its parent. The original is never changed.
- **Why:** Non-destructive, allows many transforms of one original, and a hash of the transform parameters makes caching possible (the same transform returns the stored result).
- **Trade-offs:** Uses more storage and needs `parent_image_id` and `transform_hash` columns. Derived images need a lifecycle policy later (cleanup) if storage grows.

### D-15: Which endpoints require a JWT
- **Date:** 2026-11-11
- **Context:** The spec says "secure endpoints" without listing them.
- **Options:** everything except register/login; also allow public `GET /images/:id`.
- **Decision:** Everything except `/register` and `/login`.
- **Why:** Consistent with private images (D-13); every image request is tied to a user.
- **Trade-offs:** Images can't be embedded publicly without login. Making some public later would need a per-image flag and revisiting D-13.

### D-16: Upload limits and file checks
- **Date:** 2026-11-11
- **Context:** Unrestricted uploads risk filling storage or accepting non-image files renamed as images.
- **Options:** 5 MB / 10 MB / 25 MB limits; narrow versus wide format allow-list.
- **Decision:** Maximum 10 MB. Allow only JPEG, PNG and WebP. Verify by having `sharp` decode the bytes, not by trusting the file name or claimed type.
- **Why:** 10 MB fits most phone photos. Content-based verification can't be defeated by renaming a file.
- **Trade-offs:** Rejects GIF and AVIF and very large originals. Decoding on upload costs some CPU time.

### D-17: JWT secret handling and token lifetime
- **Date:** 2026-11-11
- **Context:** The JWT signing secret must stay secret, and a stolen token works until it expires. The repository is public.
- **Options:** secret handling (`.env` vs a secrets service); token lifetime (15 minutes with refresh tokens, 1 hour, 24 hours).
- **Decision:** Secret in an uncommitted `.env`, with a placeholder `.env.example` committed. One token per login that expires after 1 hour. No refresh tokens.
- **Why:** Standard approach for a local project. One hour balances risk and convenience without building refresh-token machinery.
- **Trade-offs:** A stolen token stays valid for up to an hour and can't be revoked. Users log in again hourly. Production would use a secrets service (like AWS Secrets Manager at work) and likely refresh tokens.

---

## Process

### D-18: Repository and workflow
- **Date:** 2026-11-12
- **Context:** Work should be tracked and shareable.
- **Decision:** Git repository on GitHub at `brian-david/image_processing_service`, **public** (owner's choice). Work happens on branches, starting with `chore/project-setup`; `main` was created at the same commit so the remote has a default branch.
- **Why:** A public repo is a portfolio piece and a record of how the project was planned and built.
- **Trade-offs:** Anything committed is visible to everyone and removing it later does not erase it from history, so secrets stay out via `.gitignore` (`.env*`, data folders) and only placeholder values are committed.

---

## Open items
- Data model: review the draft `users` and `images` tables against the decisions above, then write the Prisma schema (Slice 1).
- Pick the Fastify and Prisma versions at the start of Slice 1 and check current setup docs, since Prisma's configuration changes between major versions.
