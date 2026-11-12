# Image Processing Service: The Plan

Spec: https://roadmap.sh/projects/image-processing-service

A backend like a small Cloudinary: users register and log in, upload images, apply transformations, and retrieve or list them.

This document says **what we are building and in what order**. For **why** each choice was made (options, trade-offs, reasons), see [DECISIONS.md](DECISIONS.md).

## Stack
| Job | Choice |
|---|---|
| Language / runtime | TypeScript on Node |
| Web framework | Fastify |
| Database | Postgres, in a container (OrbStack + docker compose), data in `.data/` |
| Database access | Prisma |
| File storage | MinIO (S3-compatible), locally via docker compose |
| Image processing | `sharp` |
| Validation | zod via `fastify-type-provider-zod` |
| Password hashing | `argon2` (bcrypt as fallback) |
| Login tokens | JWT via `@fastify/jwt` |
| Tests | vitest + Fastify `app.inject`, real Postgres test database reset between tests |

## Behaviour rules
- Retrieval format: `GET /images/:id?format=webp`; omit `format` to get the stored format.
- Images are private to their owner; anyone else gets 404.
- A transform creates a new image record linked to its parent; the original is never changed.
- Every endpoint needs a JWT except `/register` and `/login`.
- Uploads: max 10 MB, JPEG/PNG/WebP only, verified by having `sharp` decode the bytes.
- JWT secret lives in an uncommitted `.env` (placeholder in `.env.example`); tokens last 1 hour; no refresh tokens.

## Data model (draft, still to review)
- `users(id, username unique, password_hash, created_at)`
- `images(id, user_id, parent_image_id null, storage_key, mime_type, width, height, size_bytes, transform_hash null, created_at)`
  - `parent_image_id` + `transform_hash` identify a derived image, so the same transform of the same original can be reused (cache).

## API contract (from the spec)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /register | no | `{username, password}` -> user + JWT |
| POST | /login | no | `{username, password}` -> user + JWT |
| POST | /images | yes | multipart; returns id, url, metadata |
| POST | /images/:id/transform | yes | `{transformations: {resize, crop, rotate, format, filters}}` |
| GET | /images/:id | yes | returns the image bytes; optional `?format=` |
| GET | /images?page=&limit= | yes | paginated list with metadata |

## Slices (check off as you go)
- [x] 0. Stack and design decisions made (data model still to review)
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
- Any decision that changed is updated in [DECISIONS.md](DECISIONS.md)
