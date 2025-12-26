# Pelican - AI Image Generator

A web application that converts prompts and reference images into SVG or ASCII art using AI models, with progressive multi-step refinement capabilities.

## Project Structure

```yaml
src/lib/:
  server/:
    db/:
      schema.ts: Drizzle schema (PostgreSQL)
      index.ts: DB operations (db_* functions)
    s3/:
      index.ts: S3 upload functions
  components/:
    ArtifactPreview.svelte: Main SVG/ASCII preview with copy button
    StepsHistory.svelte: Step/artifact thumbnails with selection
    RawOutput.svelte: Raw model output panel (step.rawOutput)
    CopyButton.svelte: Copy-to-clipboard with checkmark feedback
    CostDisplay.svelte: Token usage and cost display
    ModelSettings.svelte: Provider, model, API key, endpoint
    OutputSettings.svelte: Format, dimensions, max steps
    PromptEditor.svelte: CodeMirror-based template editor
    PromptInput.svelte: Main prompt textarea + reference images
    PromptTermplates.svelte: Initial/refinement template sections
    ui/: shadcn-svelte primitives (Button, Switch, etc.)
  data.remote.ts: SvelteKit remote functions (query/command)
  models.ts: Provider/model definitions + pricing
  prompts.ts: Default prompt templates
  appstate.svelte.ts: Transient app state (two-tier pattern)
  persisted.svelte.ts: LocalStorage persistence
  generate.ts: Client-side generation logic
  utils.ts: Utilities (cn, getInputImageUrl)

src/routes/:
  +layout.svelte: App layout with Toaster
  +page.svelte: Main generation page
  '[id]/': Generation detail route
  public/: Public gallery

drizzle/: Migration files
infra/: Terraform (S3, CloudFront, IAM)
static/: Static assets
```

## State Management

Uses `app.currentGeneration` as the single source of truth for the current generation being edited/viewed.

1. **New Generation Mode** (no ID in URL):
   - `app.initFromPersisted()` creates a "dummy" generation object
   - Values come directly from `persisted` (localStorage)
   - UI binds to `app.currentGeneration.*`
   - Edits update both `currentGeneration` and are immediately persisted

2. **Viewing Existing Generation** (ID in URL):
   - `getGeneration({ id })` query fetches from DB
   - Result is assigned to `app.currentGeneration`
   - UI binds to the same reactive object
   - Edits are local only (not saved back to DB)

3. **Generating**:
   - Create new generation record in DB from `currentGeneration`
   - Navigate to new generation's URL

### Files

- **`persisted.svelte.ts`** - localStorage persistence using `runed`'s `PersistedState`
- **`appstate.svelte.ts`** - AppState class with:
  - `currentGeneration` - The reactive generation object (DB record shape)
  - `initFromPersisted()` - Creates dummy generation from localStorage
  - UI state fields (`isGenerating`, `referenceImageFile`, etc.)

### What's Where

| Value          | persisted | currentGeneration | DB generation |
| -------------- | --------- | ----------------- | ------------- |
| prompt         | ✓         | ✓                 | ✓             |
| format         | ✓         | ✓                 | ✓             |
| dimensions     | ✓         | ✓                 | ✓             |
| provider/model | ✓         | ✓                 | ✓             |
| templates      | ✓         | ✓                 | ✓             |
| steps          | ✗         | ✓ (empty)         | ✓             |
| images         | ✗         | ✓ (empty)         | ✓             |
| apiKeys        | ✓         | ✗                 | ✗             |
| isGenerating   | ✗         | ✗ (in AppState)   | ✗             |

## Database Schema

Uses PostgreSQL with Drizzle ORM. All tables are in the `pelican` schema.

> **Important:** The database is shared with other projects. Do NOT modify or drop the `public` schema in any scripts or migrations. All application data resides in the `pelican` schema.

### Tables

**`generations`** - Top-level generation record

- `id` (uuid, PK) - Auto-generated
- `userId` (uuid) - Browser-generated user ID for retrieval
- `title` (text) - Display title
- `prompt` (text) - User's generation prompt
- `format` (enum: svg, ascii) - Output format
- `width`, `height` (int) - Target dimensions
- `provider` (enum) - openai, anthropic, google, xai, openrouter, custom
- `model` (text) - Model identifier
- `endpoint` (text, nullable) - Custom endpoint URL
- `initialTemplate`, `refinementTemplate` (text) - Prompt templates
- `maxSteps` (int) - Max refinement steps
- `sendFullHistory` (bool) - Include prior steps in prompt
- `createdAt`, `updatedAt` (timestamp)

**`steps`** - Individual refinement steps within a generation

- `id` (serial, PK) - Global auto-increment ensures ordering
- `generationId` (uuid, FK → generations)
- `renderedPrompt` (text) - Rendered prompt sent to model
- `status` (enum: pending, generating, completed, failed)
- `errorMessage` (text, nullable)
- `rawOutput` (text, nullable) - Full model output including thinking
- `inputTokens`, `outputTokens` (int, nullable) - Token usage
- `inputCost`, `outputCost` (real, nullable) - Cost in USD
- `createdAt`, `completedAt` (timestamp)

**`artifacts`** - Output content from a step (model may produce multiple)

- `id` (serial, PK)
- `stepId` (int, FK → steps)
- `body` (text) - SVG/ASCII content

**`images`** - Standalone reference images (many-to-many with generations)

- `id` (uuid, PK) - Also used as S3 key component
- `extension` (text) - File extension (png, jpg, etc.)

**`generationImages`** - Junction table for many-to-many

- `generationId` (uuid, FK → generations)
- `imageId` (uuid, FK → images)
- PK: (generationId, imageId)

### S3 Key Structure

```
input/{imageId}.{ext}                    # Reference images (standalone)
{generationId}/{stepId}_{artifactId}.{ext}  # Artifacts (svg, txt)
```

### Types

- `Generation` / `NewGeneration` / `UpdateGeneration`
- `Step` / `NewStep` / `UpdateStep`
- `Artifact` / `NewArtifact`
- `Image` / `NewImage`

### Relations

- generation → many steps → many artifacts
- generation ↔ many images (via generationImages junction)

## Backend API

### Remote Functions (`src/lib/data.remote.ts`)

Uses SvelteKit's `query` and `command` wrappers with Valibot validation.

**Queries:**

- `getGeneration({ id })` - Get generation with steps, artifacts, images
- `getGenerations({ userId })` - List user's generations (summary)
- `getStep({ id })`, `getSteps({ generationId })`
- `getArtifact({ id })`, `getArtifacts({ stepId })`
- `getImage({ id })`, `getImagesForGeneration({ generationId })`

**Commands:**

- `insertGeneration({ ... })` - Create new generation
- `updateGeneration({ id, ...partial })` - Update existing
- `insertStep({ generationId, renderedPrompt, status })` - Create step
- `updateStep({ id, ...partial })` - Update step
- `uploadInputImage({ generationId, data: Uint8Array, extension })` - Creates image, uploads to S3, links to generation
- `uploadArtifact({ generationId, stepId, content, format })` - DB + S3
- `linkImageToGeneration({ generationId, imageId })` - Link existing image to new generation

## AI Generation (Client-Side)

Generation happens entirely in the browser using Vercel AI SDK (`streamText`).

**Flow:**

1. User provides prompt + optional reference images
2. Create generation record in DB
3. Upload pending images to S3 (as Uint8Array, not File)
4. Link existing images to new generation if continuing
5. Build messages with text + image URLs (AI SDK accepts URLs)
6. Stream using `onChunk` with array reassignment for Svelte reactivity
7. Extract artifacts progressively, update step.rawOutput and step.artifacts
8. On completion: update step status, upload artifacts to S3

**Reactivity Note:** Must reassign `gen.steps = [...gen.steps]` in `onChunk` to trigger Svelte 5 reactivity updates.

## Current Status

### Completed

- Multi-step generation with refinement loop, rendered artifact storage (S3)
- Refactored image handling (many-to-many, URL/Uint8Array for AI SDK)
- Enhanced RawOutput with conversation format and CodeMirror
- Persisted UI state (promptTemplatesOpen, showRawOutput)
- All providers, step/artifact selection, template reset, public gallery
- Auth system (anonymous-first with sessions)
- **Style Cleanup (Dec 2025)**:
  - Added semantic CSS variables: `--user`, `--user-bg`, `--assistant`, `--assistant-bg`, `--success`, `--ascii-grid-stroke`, `--ascii-frame-stroke`
  - Exposed semantic colors to Tailwind: `text-user`, `bg-user-bg`, `text-assistant`, `bg-assistant-bg`, `text-success`
  - Removed all gradients from titles and buttons (using solid `primary` color)
  - Replaced all inline `orange-*`, `slate-*`, `blue-*`, `green-*`, `emerald-*` colors with semantic variables
  - Replaced `.ascii-grid`/`.ascii-frame` hex colors with CSS variables

### Backlog

- [ ] Conditional UI based on model vision capabilities
- [ ] Fork generation from specific history step
- [ ] Export refinement sequence as animation
- [ ] Cost tracking display

---

## Auth System (Anonymous-First)

### Design

Unified session system for all users. Anonymous users get sessions too - same security as registered, just no credentials.

### User States

| State      | `username` | `passwordHash` | Session Expiry      |
| ---------- | ---------- | -------------- | ------------------- |
| Anonymous  | `null`     | `null`         | Never (or 1 year)   |
| Registered | set        | hashed         | 30 days (refreshed) |

**Lost session = lost data** for anonymous users. Acceptable tradeoff.

### Schema

```sql
-- users table (pelican schema)
id: uuid PK
username: text | null  -- null = anonymous
passwordHash: text | null  -- null = anonymous
createdAt: timestamp

-- sessions table (pelican schema)
id: text PK (sha256 of token)
userId: uuid FK -> users
expiresAt: timestamp  -- far future for anon, 30d for registered
```

### Flow

```
Request arrives
├─ Has session cookie?
│  ├─ Valid session → locals.user = user (anon or registered)
│  │  └─ Refresh expiry if registered & near expiry
│  └─ Invalid/expired → delete cookie, create new anon user+session
└─ No cookie → create anon user + session + set cookie
```

### Registration (anon → registered)

1. User provides username + password
2. Update existing user record (set username, passwordHash)
3. Update session expiry to 30 days
4. Same user ID → all generations preserved

### Login (existing registered)

1. Validate username/password
2. Create new session for that user
3. Current anonymous user is orphaned (no merge)

### Implementation ✓

- `src/lib/server/db/schema.ts` - users, sessions tables with relations
- `src/lib/server/auth.ts` - Session management (lucia-style), anon user creation
- `src/hooks.server.ts` - DEV_AUTH_USER support + auto-create anon user+session
- `src/routes/auth/login/` - Login/register/logout actions
- Migration `0007_salty_vargas.sql` - Creates tables, migrates existing user_ids

### Auth Boundary (`data.remote.ts`) ✓

Two-layer auth: remote functions verify userId, DB functions use WHERE clauses.

**Pattern:**

1. Client passes `userId` in request
2. Remote function calls `assertUserIdMatches(userId)` - 403 if mismatch with session
3. DB function uses `WHERE userId = ? AND id = ?` (or `generationId` for steps)

**Helpers:**

- `getCurrentUserId()` - Gets user ID from `getRequestEvent().locals.user`
- `assertUserIdMatches(userId)` - 403 if userId doesn't match session

**All tables now have `userId`:** generations, steps, artifacts, images

**Functions with auth:**
| Function | Client passes | DB ownership check |
|----------|---------------|----------|
| `insertGeneration` | (none, userId from session) | - |
| `updateGeneration` | `userId` | `WHERE id AND userId` |
| `getGenerations` | (none, userId from session) | `WHERE userId` |
| `getGeneration` | optional `userId` | `WHERE id [AND userId]` |
| `insertStep` | `userId`, `generationId` | verifies gen.userId = step.userId |
| `updateStep` | `userId` | `WHERE id AND userId` |
| `uploadInputImage` | `userId`, `generationId` | linkImage verifies gen+image ownership |
| `uploadArtifact` | `userId`, `generationId`, `stepId` | verifies step.userId = userId |
| `linkImageToGeneration` | `userId`, `generationId`, `imageId` | verifies gen+image ownership |

**Artifacts schema:** `renderError` (text, null = success) replaces `rendered` (boolean)

**Public (no auth):**

- `getGeneration` (without userId), `getPublicGenerations` - all generations are public
- `getStep`, `getSteps`, `getArtifact`, `getArtifacts` - read-only
- `getImage`, `getImagesForGeneration` - read-only
