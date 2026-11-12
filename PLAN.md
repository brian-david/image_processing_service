# Image Processing Service: Plan

Spec: https://roadmap.sh/projects/image-processing-service

## Stack (decided)
- TypeScript + Node, Fastify (decided: less plumbing for validation, multipart, rate limiting; Express was the alternative)
- Image processing: `sharp`
- Storage: MinIO locally via Docker (S3 API, `@aws-sdk/client-s3`); decided: worth learning the object-storage pattern even though a local folder would also work
- DB: Postgres (decided; reason: recommended, and for this project it is interchangeable with MySQL, so it was not a deciding factor), run in a container via OrbStack + docker compose; data kept in a local `.data/` folder
- Query layer: Prisma (decided; ORM that generates typed queries and manages migrations from a `schema.prisma` file)
- Auth: JWT via `@fastify/jwt`; password hashing with `argon2` (decided: modern standard; bcrypt is the fallback if the native install gives trouble)
- Validation: zod via `fastify-type-provider-zod` (decided; chosen over joi/TypeBox for TypeScript type inference from schemas)
- Tests: vitest + Fastify `app.inject` (decided; Jest-like API, less TypeScript setup). Slice tests that touch the DB use a real Postgres test database, reset between tests

## Decisions to make yourself (Slice 0 homework)
Write one or two sentences for each. These are the point of the exercise.
1. `GET /images/:id` format selection: DECIDED: query param `?format=webp`; omit it to get the stored format (explicit, easy to test by hand)
2. Ownership: DECIDED: images are private to the uploader; anyone else gets 404 (does not reveal that the ID exists)
3. Transform result: DECIDED: new derived record pointing to its parent; original is never changed (enables re-transforming and caching by transform hash)
4. Which endpoints need a JWT? DECIDED: all except `/register` and `/login`
5. Upload limits: DECIDED: max 10 MB; allow-list JPEG, PNG, WebP; verify by having sharp decode the bytes (not by file name or claimed type)
6. JWT secret and lifetime: DECIDED: secret in an uncommitted `.env` with a placeholder `.env.example` committed (repo is public); single token per login, expires after 1 hour, no refresh tokens

## Data model (draft, challenge it)
- users(id, username unique, password_hash, created_at)
- images(id, user_id, parent_image_id null, storage_key, mime_type, width, height, size_bytes, transform_hash null, created_at)
  - `parent_image_id` + `transform_hash` = cache key for derived images

## API contract (from spec)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /register | no | {username, password} -> user + JWT |
| POST | /login | no | {username, password} -> user + JWT |
| POST | /images | yes | multipart; returns id, url, metadata |
| POST | /images/:id/transform | yes | {transformations: {resize, crop, rotate, format, filters}} |
| GET | /images/:id | yes | returns the image bytes |
| GET | /images?page=&limit= | yes | paginated list with metadata |

## Slices (check off as you go)
- [x] 0. Answer the decisions above (done); schema still to sketch
- [ ] 1. Skeleton: server, config/env validation, DB connection, docker-compose (Postgres + MinIO), health check, first test
- [ ] 2. Auth: register, login, JWT middleware, tests
- [ ] 3. Upload + list: multipart, validation, store in MinIO, metadata in DB, pagination
- [ ] 4. Retrieve: stream from storage, ownership check
- [ ] 5. Transform (sync): resize, crop, rotate, format, grayscale, sepia; store as derived image
- [ ] 6. Hardening: rate limit transforms, cache by transform hash, consistent error shape
- [ ] 7. Bonus: queue (BullMQ/RabbitMQ), worker, job status endpoint, watermark/flip/mirror/compress

## Definition of done for each slice
- Works end to end via curl
- At least one happy-path and one failure-path test
- Notes added here on any decision that changed
