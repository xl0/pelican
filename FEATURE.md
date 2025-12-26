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

### Completed This Session

- [x] **Multi-step generation** (refinement loop):
  - `generate.ts` refactored to loop for `maxSteps` iterations
  - Uses `initialTemplate` for step 1, `refinementTemplate` for steps 2+
  - Uses pre-rendered prompts from `app.renderedPrompt`/`renderedRefinementPrompt`
  - Renders artifacts to PNG Blob and sends to LLM via Uint8Array
  - **Message structure per step**:
    - User: input images (via URL) + initial prompt
    - (For refinement) Assistant: previous step output + User: rendered image (Uint8Array) + refinement prompt
  - `stepHistory[]` tracks each step's output and rendered Blob (for next refinement)
  - `sendFullHistory`: includes all previous steps vs just last step
  - **Svelte 5 $state proxy fix**: access step via `gen.steps[stepNum]` not direct object ref
- [x] **Rendered artifact storage** (S3):
  - Schema: `artifacts.rendered` boolean to track if rendering succeeded
  - svg.ts: `svgToPngBlob`/`asciiToPngBlob` return Blob (no base64 conversion needed)
  - s3: `uploadRenderedArtifact()` uploads PNG to `{genId}/{stepId}_{artifactId}.png`
  - uploadArtifact: accepts `renderedData` bytes + `rendered` flag
  - RawOutput: displays rendered images via S3 URL (`getRenderedArtifactUrl`)
- [x] **Refactored image handling**:
  - `inputImageParts[]` uses URL for existing images, Uint8Array for new uploads
  - Pending images uploaded first, then added to `gen.images` with ID
  - No base64 conversion - Vercel AI SDK accepts URL/Uint8Array directly
- [x] **Enhanced RawOutput component**:
  - Shows User/Assistant conversation format
  - Shows rendered previous step image via S3 URL (from artifact.rendered)
  - CodeMirror for code display with line numbers and wrapping
  - "All Steps" toggle (persisted) to view all steps
- [x] **Persisted UI State**:
  - `promptTemplatesOpen` and `showRawOutput` moved to `persisted.svelte.ts`
  - Values persist across reloads (localStorage)

### Previously Completed

- [x] Fixed streaming reactivity - `gen.steps = [...gen.steps]` in onChunk
- [x] Input image upload: File → Uint8Array conversion
- [x] Images included in AI prompts (both pending and existing)
- [x] Refactored images to standalone entities (many-to-many)
- [x] Single-step generation with Vercel AI SDK
- [x] Template reset functionality (persisted vs DB originals)
- [x] All providers: OpenAI, Anthropic, Google, xAI, OpenRouter, Custom
- [x] Step/artifact selection and preview
- [x] Raw output panel with copy button
- [x] ASCII FG/BG color pickers (persisted)
- [x] Public gallery page

### Backlog

- [ ] Conditional UI based on model vision capabilities
- [ ] Fork generation from specific history step
- [ ] Export refinement sequence as animation
- [ ] Cost tracking display
