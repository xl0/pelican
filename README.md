# Pelican

[![](https://alexey.work/badge/)](https://alexey.work?ref=pelican-md)

Generate **SVG vector graphics** and **ASCII art** from text prompts. Multi-step refinement: AI sees its output and improves it iteratively.

## Features

https://github.com/user-attachments/assets/eb505e5e-21e7-4f06-a765-3f3adbafa29b

- **SVG or ASCII output** with configurable dimensions
- **Multi-step refinement** — AI reviews and improves its work
- **Multiple providers** — OpenAI, Anthropic, Google, xAI, OpenRouter, custom
- **Reference images** — upload inspiration for the AI
- **Streaming** — watch generation in real-time
- **Gallery** — public sharing with moderation
- **Jinja2 templates** — customize prompts
- **Client-side keys** — your API keys never hit the server

## Stack

| Component | Tech                 |
| --------- | -------------------- |
| Framework | SvelteKit (Svelte 5) |
| Styling   | TailwindCSS v4       |
| UI        | shadcn-svelte        |
| Database  | PostgreSQL + Drizzle |
| Storage   | S3 + CloudFront      |
| AI        | Vercel AI SDK        |

## Structure

```
src/
├── routes/
│   ├── +layout.svelte      # Main generation UI
│   ├── [id]/               # View generation
│   ├── history/            # User history
│   ├── gallery/            # Public gallery
│   └── admin/              # Moderation
├── lib/
│   ├── components/         # UI components
│   ├── server/
│   │   ├── auth.ts         # Sessions
│   │   ├── db/             # Schema + queries
│   │   └── s3/             # Uploads
│   ├── data.remote.ts      # RPC functions
│   ├── generate.ts         # AI generation
│   └── appstate.svelte.ts  # State
├── scripts/                # DB scripts
└── hooks.server.ts         # Auth middleware

infra/                      # Terraform (S3, CloudFront, IAM)
drizzle/                    # Migrations
```

## Design

- **Client-side AI** — API calls in browser, server never sees keys
- **Lazy users** — created on first action, not page visit
- **Access control** — private/shared/gallery + approval status

## Setup

### Database

```bash
bun run db:migrate
bun run src/scripts/seed-db.ts
```

## Deploy

### AWS Terraform

```bash
cd infra
terraform init
terraform apply
terraform output  # → env vars
```

Creates: S3 bucket, CloudFront, IAM user.

#### Alternaltvely, manual AWS

I assume you know your way around AWS.

1. Create private S3 bucket
2. Add CloudFront distribution
3. Create IAM user with `s3:PutObject`, `s3:DeleteObject`
4. Set bucket policy for CloudFront

### `.env`

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"

# S3 and Cloudfront (from terreform, or you can configure them manually)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET="..."
CLOUDFRONT_DOMAIN="..."

# Dev mode - pre-auth a fake dev user
DEV_AUTH_USER="fake uuid"
```

## Auth

- Users created lazily on first generation
- Anonymous: 1-year session, no way to log in if they lose the session.
- Registered: 30-day session (OAuth planned)
- Admin: `/admin` access, to manage models and the gallery.

To make a user an admin:

```sql
UPDATE pelican.users SET is_admin = true WHERE id = 'uuid';
```

## Commands

```bash
bun run db:generate   # Generate migration
bun run db:migrate    # Apply migrations
bun run db:reset      # Reset + reseed
```

## S3 Layout

```
{bucket}/
├── input/{imageId}.{ext}                    # Reference images
└── {generationId}/{stepId}_{artifactId}.png # Artifacts
```

## License

MIT
