# Image Processing Service: Plan

Spec: https://roadmap.sh/projects/image-processing-service

## Stack (decided)
- TypeScript + Node, Fastify (or Express; pick one in Slice 1)
- Image processing: `sharp`
- Storage: MinIO locally via Docker (S3 API, `@aws-sdk/client-s3`)
- DB: Postgres (suggested; you confirm) + a query layer (Drizzle/Prisma/Kysely, your call)
- Auth: JWT + argon2/bcrypt
- Validation: zod
- Tests: vitest + supertest/inject

## Decisions to make yourself (Slice 0 homework)
Write one or two sentences for each. These are the point of the exercise.
1. `GET /images/:id` format selection: query param (`?format=webp`)? Accept header? Only via transform?
2. Ownership: are images private to the uploader? What does another user get (403 or 404)?
3. Transform result: new record or overwrite? (Suggested: new derived record, original untouched.)
4. Which endpoints need a JWT? (Suggested: all except `/register` and `/login`.)
5. Upload limits: max size, allowed MIME types, how you verify the file really is an image.
6. Where does the JWT secret live, and how long do tokens last?

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
- [ ] 0. Answer the decisions above; sketch the schema
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
