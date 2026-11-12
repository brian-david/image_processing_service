# Image Processing Service

A backend for uploading, transforming and retrieving images, similar in spirit to Cloudinary. Users register and log in, upload images, apply transformations (resize, crop, rotate, format change, filters), and fetch or list their images.

This is a practice project built from the [roadmap.sh Image Processing Service](https://roadmap.sh/projects/image-processing-service) brief. A goal of the project is to practise **planning and implementing** a backend in small, working slices, so the reasoning behind each choice is written down.

> **Status:** planning is complete and implementation has not started. There is no runnable code yet. The sections below describe what is planned.

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
1. Project skeleton, docker compose (Postgres and RustFS), health check
2. Authentication
3. Upload and list
4. Retrieve
5. Transformations
6. Hardening: rate limiting, caching, consistent errors
7. Bonus: queue-based asynchronous transforms

The checklist lives in [docs/PLAN.md](docs/PLAN.md).

## Running it
Setup and run instructions will be added in Slice 1, once there is something to run.
