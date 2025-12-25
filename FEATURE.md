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
    InputImagesPreview.svelte: Reference image upload/preview
    ModelSettings.svelte: Provider, model, API key, endpoint
    OutputSettings.svelte: Format, dimensions, max steps
    PromptEditor.svelte: CodeMirror-based template editor
    PromptInput.svelte: Main prompt textarea
    PromptTermplates.svelte: Initial/refinement template sections
    ui/: shadcn-svelte primitives (Button, Switch, etc.)
  data.remote.ts: SvelteKit remote functions (query/command)
  models.ts: Provider/model definitions + pricing
  prompts.ts: Default prompt templates
  appstate.svelte.ts: Transient app state (two-tier pattern)
  persisted.svelte.ts: LocalStorage persistence
  generation.svelte.ts: Client-side generation logic
  svg.ts: SVG utilities

src/routes/:
  +layout.svelte: App layout with Toaster
  +page.svelte: Main generation page
  '[id]/': Generation detail route

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
  - Legacy fields (being migrated to `currentGeneration`)

### What's Where

| Value          | persisted | currentGeneration | DB generation |
| -------------- | --------- | ----------------- | ------------- |
| prompt         | ✓         | ✓                 | ✓             |
| format         | ✓         | ✓                 | ✓             |
| dimensions     | ✓         | ✓                 | ✓             |
| provider/model | ✓         | ✓                 | ✓             |
| templates      | ✓         | ✓                 | ✓             |
| steps          | ✗         | ✓ (empty)         | ✓             |
| apiKeys        | ✓         | ✗                 | ✗             |
| isGenerating   | ✗         | ✗ (in AppState)   | ✗             |

### Note: One-Way Binding

`generationFromPersisted()` creates a **snapshot** of persisted values at call time. The `currentGeneration` object is not reactively linked to localStorage — edits to `app.currentGeneration.prompt` do NOT automatically save to `p.prompt.current`.

**Strategy:** Save to localStorage when the user clicks "Generate". Call a `commitToPersisted(gen)` function that writes `currentGeneration` values back to persisted before inserting to DB.

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

**`inputImages`** - Reference images for a generation

- `id` (uuid, PK) - Also used as S3 key component
- `generationId` (uuid, FK → generations)

### Types

- `Generation` - Select type (all fields)
- `NewGeneration` - Insert type (required fields, no id)
- `UpdateGeneration` - Update type (id required, all else optional)
- Same pattern for `Step`, `NewStep`, `UpdateStep`

### Relations

- generation → many steps → many artifacts
- generation → many inputImages

## Backend API

### Remote Functions (`src/lib/data.remote.ts`)

Uses SvelteKit's `query` and `command` wrappers with Valibot validation.

**Queries:**

- `getGeneration({ id })` - Get generation with steps, artifacts, inputImages
- `getGenerations({ userId })` - List user's generations (summary)
- `getStep({ id })`, `getSteps({ generationId })`
- `getArtifact({ id })`, `getArtifacts({ stepId })`
- `getInputImage({ id })`, `getInputImages({ generationId })`

**Commands:**

- `insertGeneration({ userId, title, prompt, format, ... })` - Create new
- `updateGeneration({ id, ...partial })` - Update existing (any fields)
- `insertStep({ generationId, renderedPrompt, status })` - Create step
- `updateStep({ id, ...partial })` - Update step (status, tokens, cost, etc.)
- `uploadInputImage({ generationId, data: File, extension })` - DB + S3
- `uploadArtifact({ generationId, stepId, content, format })` - DB + S3

### S3 Storage (`src/lib/server/s3/index.ts`)

**Bucket:** `pelican-artifacts`
**CloudFront:** `d3rybyofuhagdh.cloudfront.net`

**Key Structure:**

```
{generationId}/input/{imageId}.{ext}     # Reference images
{generationId}/{stepId}_{artifactId}.{ext}  # Artifacts (svg, txt)
```

Client constructs URLs: `https://${PUBLIC_CLOUDFRONT_URL}/${key}`

## AI Generation (Client-Side)

Generation happens entirely in the browser using Vercel AI SDK.

**Supported Providers:**

- OpenAI (GPT-4o, o3-mini, GPT-4o Mini)
- Anthropic (Claude 3.5 Sonnet/Haiku, Claude 3 Opus/Sonnet/Haiku)
- Google (Gemini 1.5 Pro/Flash, Gemini 2.0 Flash)
- xAI (Grok Beta, Grok Vision Beta)
- OpenRouter (various models)
- Custom (any OpenAI-compatible endpoint)

**Flow:**

1. User provides prompt + optional reference image
2. Client generates using `streamText` with `onChunk` callbacks
3. Progressive SVG/ASCII rendering with sanitization (DOMPurify)
4. Each step tracked with tokens/cost, saved to DB
5. Artifacts uploaded to S3

**Security:**

- API keys stored in localStorage per-provider
- Keys sent directly to provider, never to our server
- `anthropic-dangerous-direct-browser-access` header for Anthropic

## Current Status

### Frontend

UI components in `src/lib/components/` using Svelte 5 runes and shadcn-svelte.

- ✅ currentGeneration-based state management
- ✅ All form components bind to `app.currentGeneration.*`
- ✅ Preview displays selected artifact from current generation
- ✅ Step history with multi-artifact support (stacked vertically)
- ✅ Artifact selection updates main preview

### AppState (`src/lib/appstate.svelte.ts`)

- `currentGeneration` - The reactive generation object
- `selectedStepIndex` - Which step is selected (undefined = last)
- `selectedArtifactIndex` - Which artifact within step (undefined = last)
- `isGenerating` - Generation in progress flag
- `pendingInputFiles` - Files to upload on generate
- `renderedPrompt` / `renderedRefinementPrompt` - Computed templates
- `commitToPersisted()` - Saves currentGeneration to localStorage
- `setFormat()` - Changes format with save/reset

### Backend (Stable)

- ✅ Database schema with `maxSteps` and `sendFullHistory` (boolean)
- ✅ DB operations in `src/lib/server/db/index.ts` (prefixed with `db_`)
- ✅ Remote functions in `src/lib/data.remote.ts` (typed with providerNames)
- ✅ S3 integration for artifact storage
- ✅ Debug logging throughout (`DEBUG="app:*"`)

## TODO

### Completed This Session

- [x] Add `maxSteps` and `sendFullHistory` to generations schema
- [x] Update remote functions with proper types (providerNames picklist)
- [x] Preview display from `currentArtifact`
- [x] Step history showing all artifacts stacked vertically per step
- [x] `selectedStepIndex` and `selectedArtifactIndex` in AppState
- [x] Clicking artifact thumbnail selects step + artifact
- [x] Seed script with labeled SVGs (step/artifact numbers, color themes)
- [x] Fixed `@const` reactivity bug - use helper functions instead
- [x] Public gallery fetches artifact.body from DB
- [x] Extract ArtifactPreview component (SVG responsive via CSS)
- [x] Extract StepsHistory component (step/artifact thumbnails)
- [x] CopyButton component with checkmark feedback
- [x] RawOutput component showing step's rawOutput field
- [x] Show Raw toggle - hides controls, shows RawOutput beside preview
- [x] ASCII FG/BG color pickers (persisted)
- [x] Flex-based 3-panel layout (controls | preview | raw)
- [x] SVG scales to container width while preserving aspect ratio
- [x] Artifact extraction from raw output (`src/lib/artifacts.ts`)
- [x] Stream debug button to simulate streaming raw output
- [x] `updateStepArtifacts()` and `simulateStream()` in AppState
- [x] Shared types in `src/lib/types.ts` (formatValues, statusValues)
- [x] Single-step generation in `src/lib/generate.ts`:
  - Vercel AI SDK streamText with all providers
  - Real-time artifact extraction during streaming
  - DB persistence (generation, step, artifacts)
  - S3 upload for input images and artifacts
  - Navigate to generation URL on completion
- [x] Improved CurrentGeneration types for streaming (partial steps/artifacts)
- [x] Template reset functionality:
  - Existing generation: reset to DB value
  - New generation: reset to default and update persisted

### Previously Completed

- [x] Fix Gallery Cards - Make all cards same height
- [x] Extract PromptInput Component
- [x] OutputSettings.svelte - Uses `app.currentGeneration`
- [x] ModelSettings.svelte - Uses `app.currentGeneration`
- [x] PromptTemplates.svelte - Uses `app.currentGeneration`
- [x] PromptEditor.svelte - Accepts template as bindable string
- [x] Replace AsciiArt.svelte - Re-exports from `svelte-asciiart`
- [x] Generate new Drizzle migrations
- [x] Seed script (`bun run src/scripts/seed-db.ts`)
- [x] Public gallery page

### Backlog

- [ ] Multi-step generation (refinement loop)
- [ ] Include reference images in generation prompts
- [ ] Remove unused legacy fields from AppState
- [ ] Conditional UI based on model vision capabilities
- [ ] Fork generation from specific history step
- [ ] Export refinement sequence as animation
