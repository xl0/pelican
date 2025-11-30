# SvelteKit + Shadcn + Drizzle Skeleton

This project is a skeleton setup with the following stack:

- **Framework**: SvelteKit (Svelte 5)
- **Styling**: TailwindCSS v4
- **UI Components**: Shadcn-Svelte (bits-ui)
- **Database**: Drizzle ORM + SQLite (better-sqlite3)
- **Package Manager**: Bun

## Getting Started

1. Install dependencies:

   ```bash
   bun install
   ```

2. Set up the database:

   ```bash
   bun run db:push
   ```

   This creates a local `sqlite.db` file.

3. Start the development server:
   ```bash
   bun dev
   ```

## Project Structure

- `src/lib/components/ui`: Shadcn components
- `src/lib/server/db`: Database configuration and schema
- `drizzle.config.ts`: Drizzle Kit configuration
- `.env`: Environment variables (DATABASE_URL)

## Database

- Edit `src/lib/server/db/schema.ts` to define your tables.
- Run `bun run db:push` to apply changes to the database.
- Run `bun run db:studio` to view the database content in a browser.

## Components

Add new components using the Shadcn CLI:

```bash
bunx shadcn-svelte@latest add [component-name]
```
