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
- **Context:** Postgres and an S3-compatible store (RustFS, see D-05) must run locally. Docker Desktop had previously consumed a lot of disk.
- **Options:** Docker Desktop, OrbStack, installing services directly on macOS.
- **Decision:** docker compose, run under OrbStack. Service data is kept in a project-local `.data/` folder (git-ignored) so its size is visible and it is deleted with the project.
- **Why:** OrbStack is lighter than Docker Desktop and uses the same `docker`/`compose` commands. Local data folders avoid hidden disk growth.
- **Trade-offs:** On macOS containers run in one lightweight Linux VM under the hood. Two always-available containers use some memory and disk.

### D-04: Database access: postgres.js with plain SQL
- **Date:** 2026-11-11; **revised 2026-11-12** (Prisma replaced by postgres.js, see below)
- **Context:** TypeScript must talk to Postgres. Choices range from raw SQL strings to ORMs.
- **Options:** raw drivers (`pg`, `postgres.js`; `pg` is what `zaro-backend` uses); query builders (Kysely, Knex); hybrid (Drizzle); ORM (Prisma, TypeORM).
- **Decision:** `postgres.js` (npm `postgres`), writing real SQL, with plain `.sql` migration files that create the tables.
- **Why:** The owner first chose Prisma on recommendation, with no reason of their own recorded. On reaching Slice 1 step 5 they said they did not like it and wanted to interact with SQL directly. A plain driver makes SQL the actual interface, which fits the goal of learning the project end to end. With only two tables the extra manual work is small.
- **Trade-offs:** Nothing checks query column names before they run, and row types are written by hand. Mitigation: validate rows coming back from the database with zod. Migrations are hand-written `.sql` files run in order by a small runner (chosen in step 5), instead of being generated. Kysely is a possible later step up if typed queries are wanted; it can be added without redoing the migrations.
- **Superseded choice:** Prisma (schema file, generated typed client, generated migrations). Dropped before any Prisma code was written.

### D-05: File storage: RustFS (S3-compatible)
- **Date:** 2026-11-11; **revised 2026-11-12** (MinIO replaced by RustFS, see below)
- **Context:** Image bytes need to live somewhere. The database should hold metadata only.
- **Options:** a local folder; MinIO; RustFS; Garage; SeaweedFS; real AWS S3 / Cloudflare R2.
- **Decision:** RustFS, run locally in a container, pinned to `rustfs/rustfs:1.0.5`.
- **Why:** A local folder would also have worked. An S3-compatible server was kept deliberately to learn the object-storage pattern used in production, where servers don't share local disk. Code written with the S3 client moves to real S3 by changing configuration. RustFS was chosen over the other alternatives as described in the comparison articles as the closest drop-in replacement for MinIO, with an Apache-2.0 licence and a built-in web console.
- **Why MinIO was dropped (2026-11-12):** the assumption behind choosing it expired. When we reached the point of writing its compose config we checked its repository, which carries a "no longer maintained" notice and was archived by its owner on 2026-04-25. The community edition is now distributed as source code only (no pre-built binaries), and its Docker instructions say to build the image yourself. It was therefore not a good dependency for a new project.
- **Trade-offs:** RustFS is much newer than MinIO, so it has less track record and fewer tutorials. Its docs are not fully consistent and did not state every setting, so the compose config was derived from reading two doc pages and then verified by running it. Its container runs as a non-root user (UID 10001), which can cause permission errors on bind-mounted folders (none occurred here). The image is pinned to a specific version instead of `latest` so it doesn't change unexpectedly.
- **What would change this:** RustFS proving unreliable, or a project goal to keep things simpler (a local folder behind a storage interface), or moving to real S3 / R2.

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

### D-23: Container image versions are pinned
- **Date:** 2026-11-12
- **Context:** `docker-compose.yml` names the images to run. A tag like `latest` can change under you between runs.
- **Decision:** Pin specific versions: `postgres:17-alpine` and `rustfs/rustfs:1.0.5`.
- **Why:** Reproducible: the same file gives the same setup next month. Postgres 17 was the newest major version with a confirmed alpine tag when checked. The `-alpine` variant is much smaller, which matters because Docker had previously filled the owner's disk. For Postgres 17 the data folder is mounted at `/var/lib/postgresql/data` (Postgres 18+ uses `/var/lib/postgresql`, so upgrading to 18 means changing the mount).
- **Trade-offs:** Versions must be bumped by hand. Postgres 18 exists and was not chosen; moving to it later is a deliberate migration, not a one-line change.

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
- **Trade-offs:** Uses more storage and needs `parent_image_id` and `transform_hash` columns. Storage grows with every distinct transform, not just every upload. See D-19 for how that growth is handled (it refines this entry).

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

### D-24: Talking to object storage: AWS SDK, wrapped in one file
- **Date:** 2026-11-12
- **Context:** The app needs three storage operations (put, get, delete an image). The owner asked whether the official AWS SDK is overkill for that.
- **Options:** `@aws-sdk/client-s3` (the standard); a lightweight S3 client (for example `s3mini`, or `aws4fetch` for request signing); hand-written HTTP with request signing.
- **Decision:** Use `@aws-sdk/client-s3`, and keep **all** storage code in a single file, `src/storage.ts`, exposing only the operations the app needs. The rest of the app never imports the SDK directly.
- **Why:** The hard part of S3 is signing every request correctly (AWS Signature V4); the SDK does it, plus streaming and retries, and is the best documented option. The owner likes wrapping a dependency in one file, which also makes the library cheap to replace.
- **Trade-offs:** Heavy for three operations (about 18 MB on disk for the `@aws-sdk` and `@smithy` packages, measured 2026-11-12, out of 85 MB in `node_modules`). If it ever feels like too much, only the inside of `storage.ts` changes.

### D-25: What to test: rules that must not silently break
- **Date:** 2026-11-12
- **Context:** The owner had little experience with automated tests and questioned their value: after a change you check that change by hand and know the unrelated parts are unaffected. The original definition of done asked for one happy-path and one failure-path test per slice.
- **Options:** test everything; test only the rules whose breakage would be silent and serious; test nothing and check by hand.
- **Decision:** Test the rules that must not silently break (authentication required, images private to their owner, upload limits and file-type checks). Every slice gets at least one happy-path test. Nothing else needs a test just to have one.
- **Why:** The risk in a manual check is the part you do not think to look at. Example: while adding `?format=webp` to `GET /images/:id` you could drop the ownership check; format conversion would still work, so nothing looks wrong, but privacy (D-13) would be broken. Tests earn their place where a mistake is silent and serious. A second Slice 1 test (an unknown URL returns 404) was written and then dropped, because it could only fail if Fastify's built-in behaviour changed, which protects nothing.
- **Trade-offs:** Less coverage than a strict "test everything" approach, so some regressions will be found by hand or not at all. Tests live in `test/`, outside `src/`, so they are not part of the build. Tools: vitest 5.1.0 with Fastify's `app.inject` (no real server needed).

### D-26: Setup steps done by hand for now (tables and bucket)
- **Date:** 2026-11-12
- **Context:** Two one-off setup steps are needed after the containers start: create the database tables (`migrations/001_init.sql`) and create the `images` storage bucket. Both could be automated (a migration runner script, an `ensureBucket()` function on server start).
- **Options:** automate both now; do both by hand and document them; automate only one.
- **Decision:** Both by hand, documented in the README. The tables are created by feeding the SQL file to `psql` in the Postgres container. The bucket is created in the RustFS web console.
- **Why:** Each is run once and the code to automate it is more than the job needs today. A migration runner solves a problem the project does not have yet (many migrations over time), and the real storage code is written in Slice 3, where it has a job to do (see D-24).
- **Trade-offs:** A fresh machine, or a wiped `.data/` folder, needs the two manual steps repeated. A runner (and possibly `ensureBucket`) should be added when a second migration appears, or when tests need a clean database and bucket automatically. Also learned while setting this up: Postgres and RustFS read their credentials from the environment only when first created (Postgres) or at start (RustFS), and Docker Compose parses `.env` differently from Node (for example a `"` in a value). Keep `.env` values to letters, numbers, dashes and underscores.

---

## Data model

### D-19: Keep every transformed file; never auto-delete (refines D-14)
- **Date:** 2026-11-12
- **Context:** Every transform creates a new image (D-14), so storage grows with each one. The question was whether transformed files should be permanent or disposable.
- **Options:**
  1. Keep every transformed file permanently.
  2. Keep the database record and its settings permanently, but treat the *file* as a cache: delete rarely used files and regenerate them on demand.
  3. Delete derived images after a fixed time (e.g. 30 days).
- **Decision:** Option 1. Keep every transformed file. Nothing is deleted automatically.
- **Why:**
  - Option 3 was rejected. A transformed image is the user's work (for example an exact crop), not a throwaway cache entry. Silently deleting it after 30 days, so the user returns to find it gone, is a bad outcome. Having the original does not fix this, because the valuable part is the edit.
  - Option 2 is a valid design, because storing the settings means the user never has to redo an edit. But it is a cost comparison: storing a file costs a little every month, regenerating costs CPU every time it is requested. Rarely requested files are cheaper to regenerate, popular ones cheaper to keep. At this project's scale both costs are negligible, so cost does not decide it.
  - With cost negligible, complexity decides. Option 2 needs a background eviction job, regenerate-on-miss logic (including two requests regenerating at once), slower first requests after eviction, and chain handling (regenerating a derived-of-derived image needs its parent's file). Option 1 needs none of that.
  - Identical transforms are not duplicated, because `transform_hash` finds the existing result (D-20).
- **Trade-offs:** Storage is unbounded per user in this version. If growth becomes a real cost, the planned answer is a per-user quota with a clear error, plus a user-controlled `DELETE /images/:id` endpoint (not in the spec; the user decides what to free). Deleting a parent raises a question to settle at that point: what happens to images derived from it.
- **What would change this:** real storage cost at scale, or wanting to build caching as a learning bonus. Option 2 can then be added without changing the tables, because the settings and parent link are already stored (see D-21).
- **Process note:** the reasoning pattern used here: list options, find the costs, check which costs matter at this scale, let the remaining difference (complexity) decide, confirm it is reversible, and write it down.

### D-20: One `images` table for uploads and transformed images
- **Date:** 2026-11-12
- **Context:** Should original uploads and transformed results live in one table or two?
- **Options:** one `images` table where a transformed image has a `parent_image_id`; two tables (`images` for uploads, a separate table for transformed results).
- **Decision:** One table. An upload has an empty `parent_image_id`; a transformed image points to its parent.
- **Why:** A transformed result is, as far as the rest of the system is concerned, the same kind of thing as an upload: a file in storage with a format, a size and an owner. `GET /images/:id`, listing and the ownership check work identically for both. Transforming a transformed image (a chain such as 1 -> 2 -> 4) works naturally because any image can be a parent.
- **Trade-offs:** `parent_image_id`, `transform_hash` and `transformations` are empty for uploads. Two tables would be explicit but would duplicate storage-key, format and size columns and make "the parent could be either table" awkward. Two tables become the better design only if the two kinds start to differ in columns or rules.
- **How transforms are recorded over time:** each transform is its own new row; no row is ever overwritten. History is the chain of parent links.

### D-21: Store the transformation settings and a hash on derived images
- **Date:** 2026-11-12
- **Context:** What identifies a transformed image and records what was done?
- **Decision:** Derived images store two things:
  - `transform_hash`: a fingerprint of the parent image plus the settings. It answers "has this exact transform already been done?", so a repeat request returns the existing image instead of recomputing and duplicating it. This is the caching bonus from the spec.
  - `transformations`: the settings as readable JSON (for example `{"resize":{"width":200},"format":"webp"}`). It is needed to compute the hash, makes the list endpoint and debugging understandable ("this is a 200px WebP copy"), and as a side effect would allow evict-and-regenerate later.
- **Why:** The settings column is not extra insurance: it earns its place for the reasons above. The ability to add regeneration later is a free side effect, not a reason to build anything now.
- **Trade-offs:** One extra JSON column and one hash column. Dropping `transformations` would still work for caching (the hash alone is enough) but would make rows opaque to a human.

### D-22: UUID identifiers
- **Date:** 2026-11-12
- **Context:** Users and images need unique IDs that appear in URLs such as `/images/:id`.
- **Options:** UUID; auto-increment integer.
- **Decision:** UUID for `users.id` and `images.id`.
- **Why:** Unguessable, so a URL doesn't reveal the next ID or how many images exist. This also supports the privacy decision (D-13), because even though non-owners get 404, IDs can't be enumerated. They can also be generated in application code without a database round-trip.
- **Trade-offs:** Larger than integers and not human-readable. Slightly less efficient to index than sequential numbers, which is irrelevant at this scale.

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
- Add a migration runner and automatic bucket creation when a second migration is needed or tests need a clean database (see D-26).
- Write `src/storage.ts` (put, get, delete image) in Slice 3 (see D-24).
- Later, if wanted: per-user quota, `DELETE /images/:id`, and a decision on what deleting a parent image does to its derived images (see D-19).
