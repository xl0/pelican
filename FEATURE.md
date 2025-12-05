# Image Converter Webapp - Feature Status

## Overview

A web application that converts prompts and reference images into SVG or ASCII art using AI models, with progressive multi-step refinement capabilities.

## Current Status: ✅ Fully Functional

### Core Features Implemented

#### 1. Frontend UI (SvelteKit + Shadcn)

- [x] **Input Controls**
  - Prompt input with default: "Pelican riding a bicycle"
  - Reference image upload (optional, vision-capable models only)
  - Output format selection (SVG/ASCII)
  - **Aspect Ratio Selection**: Preset buttons for 1:1, 4:3, 16:9, 3:4, 9:16 (with custom option)
  - Refinement steps slider (1-5, default: 5)

- [x] **Preview & History**
  - Real-time streaming preview during generation
  - Progressive rendering with DOMPurify SVG sanitization
  - History bar showing all refinement steps
  - Click any history item to view that version
  - **Raw Output View**: Toggle to display complete model output including thinking process
  - Raw output shown in separate card below preview for simultaneous viewing
  - Download generated images

- [x] **Advanced Settings**
  - Provider selection (OpenAI, Anthropic, Google, xAI, OpenRouter, Custom)
  - Model selection with latest models (default: Anthropic Claude Haiku 4.5)
  - **Custom Model Support**: Ability to specify any custom model ID for any provider
  - API key management (per-provider, stored in localStorage)
  - Clear key / Clear all keys functionality
  - Custom endpoint configuration
  - Prompt template editing (Initial & Refinement)

#### 2. AI Generation

- [x] **Client-Side Generation**
  - Uses Vercel AI SDK with `streamText` for real-time updates
  - Supports multiple providers via unified interface
  - Streaming text with progressive UI updates
  - `anthropic-dangerous-direct-browser-access` header for browser usage
  - **Thinking Tokens**: Encourages model to think, rephrase, and visualize before generating SVG

- [x] **Multi-Step Refinement**
  - Configurable refinement steps (1-5)
  - Full conversation history maintained across steps
  - Previous generation rendered as PNG and sent to model
  - Detailed refinement prompts encouraging significant improvements
  - **Enhanced Error Detection**: SVG parsing with line/column error reporting

- [x] **Error Handling**
  - **Precise Error Location**: DOMParser extracts line and column numbers from SVG errors
  - **Code Context**: Shows 2-3 lines before/after error with visual markers (`>>>` and `^`)
  - Error messages sent to model without redundant code (references previous message)
  - SVG sanitization with DOMPurify for partial rendering
  - ASCII art rendered as SVG text elements (no canvas tainting)

- [x] **Dimension Control**
  - Target dimensions passed to model in prompts (`{{width}}x{{height}}`)
  - System prompts include complete SVG opening tag with `xmlns` attribute
  - ASCII art given character grid dimensions based on aspect ratio
  - Dimensions stored in database per project

#### 3. Backend API (SvelteKit)

- [x] **Database (PostgreSQL + Drizzle ORM)**
  - Projects table (stores project metadata, width, height)
  - Generations table (tracks each refinement step, raw output, rendered image path)
  - Settings table (user preferences)
  - Database migrations via `drizzle-kit generate` and `drizzle-kit migrate`

- [x] **API Endpoints**
  - `/api/projects` - List and create projects
  - `/api/projects/[id]` - Get, update, delete project
  - `/api/generations` - Create generation record
  - `/api/generations/[id]` - Update generation status and rendered image path
  - `/api/artifacts/reference` - Save reference image
  - `/api/artifacts/generation` - Save generated artifact (SVG, ASCII, or PNG)

- [x] **Filesystem Service**
  - Artifact storage in `artifacts/projects/{id}/`
  - Reference images: `ref.{ext}`
  - Generated artifacts: `gen_{step}.{format}`
  - **Rendered images**: `gen_{step}.png` (saved immediately after each generation)
  - Base64 support for PNG artifacts

#### 4. Model Support & Capabilities

**Model Capability Detection**

- [x] `supportsImageInput()` helper function to check vision capabilities
- [x] Static detection based on model ID patterns (no runtime API available)
- [x] Provider-specific checks for OpenAI, Anthropic, Google, xAI, OpenRouter

**Anthropic (Default)**

- Claude 4.5 Opus, Sonnet, Haiku ✅ Vision
- Claude 4.1 Opus ✅ Vision
- Claude 4.0 Opus, Sonnet ✅ Vision
- Claude 3.7 Sonnet ✅ Vision
- Claude 3.5 Haiku, Sonnet (Legacy) ✅ Vision
- Claude 3 Opus, Sonnet, Haiku (Legacy) ✅ Vision

**OpenAI**

- GPT-4o, GPT-4o Mini ✅ Vision
- GPT-5.1, GPT-5.1 Thinking ✅ Vision
- O1, O1 Mini, O3 Mini ✅ Vision
- GPT-4 Turbo with Vision ✅ Vision

**Google**

- Gemini 2.0 Flash ✅ Vision
- Gemini 3 Pro ✅ Vision

**xAI**

- Grok Beta, 4.1, 4.1 Fast ✅ Vision

**OpenRouter & Custom**

- Any OpenAI-compatible endpoint
- Vision support detected by model ID patterns

## Technical Highlights

### Streaming Architecture

- **Real-time updates**: Uses `onChunk` callback to update UI during generation
- **Progressive rendering**: DOMPurify sanitizes partial SVG for browser display
- **Conversation history**: Full message history maintained for context
- **Thinking Tokens**: Model output is parsed to separate thinking process from SVG code
- **Dual display**: Preview and raw output can be viewed simultaneously

### Image Feedback Loop

- **SVG**: Direct PNG conversion via canvas (800x600 standardized)
- **ASCII**: Rendered as SVG `<text>` elements to avoid canvas tainting
- **Error recovery**: Failed renders trigger detailed error messages with precise location info
- **Immediate saving**: PNG artifacts saved after each generation step, not at the end

### Enhanced Error Reporting

- **XML Parsing**: DOMParser used to extract precise error information
- **Line/Column Numbers**: Extracted from parser error messages
- **Code Context**: Shows surrounding lines with visual markers
- **Smart Feedback**: Only error details sent to model (SVG already in conversation history)

### Security & Privacy

- **Client-side generation**: API keys never sent to server
- **Per-provider storage**: Keys stored in localStorage by provider
- **CORS handling**: `anthropic-dangerous-direct-browser-access` header
- **SVG sanitization**: DOMPurify prevents XSS attacks

## Default Configuration

- **Provider**: Anthropic
- **Model**: claude-haiku-4-5
- **Refinement Steps**: 5
- **Output Format**: SVG
- **Aspect Ratio**: 4:3 (800x600)

## Known Limitations

- Requires vision-capable models for image-based refinement
- Browser-based generation requires CORS-compatible APIs
- Canvas size standardized at 800x600 for PNG conversion (aspect ratio maintained in SVG)
- Model capability detection is static (no runtime API from providers)

## Recent Enhancements (Dec 2024)

- ✅ Aspect ratio controls with preset buttons
- ✅ Raw output viewing in separate card
- ✅ Enhanced SVG error reporting with line/column numbers
- ✅ Complete SVG opening tag with xmlns in prompts
- ✅ Dimension-aware generation for both SVG and ASCII
- ✅ Immediate PNG artifact saving
- ✅ Model capability detection helper function
- ✅ Database schema updates for dimensions and rendered images

## Next Steps (Future Enhancements)

- [ ] Conditional UI based on model vision capabilities
- [ ] Fork generation from specific history step
- [ ] Export full refinement sequence as animation
- [ ] Batch generation with variations
- [ ] Model comparison mode (A/B testing)
- [ ] Custom dimension input (beyond presets)
- [ ] Server-side generation option for non-CORS APIs
- [ ] Copy SVG code to clipboard functionality

## Current Implementation Plan (Dec 4, 2024)

### UI/UX Improvements

#### 1. Configuration Tab Consolidation ✅

- **Current**: 3 tabs (Gen, Model, Prompt)
- **Target**: 1 consolidated "Configuration" tab
- **Rationale**: Simplifies navigation, all settings in one place

#### 2. Hide Model Selection for Custom Provider ✅

- **Current**: Shows model dropdown even for custom provider
- **Target**: Only show custom model ID input for custom provider
- **Rationale**: Custom provider doesn't use predefined models

#### 3. Collapsible Prompt Templates ✅

- **Current**: Prompt templates always expanded
- **Target**: Use Collapsible component, collapsed by default
- **Rationale**: Reduces visual clutter, advanced feature

#### 4. API Key Security Notice ✅

- **Current**: Generic localStorage notice
- **Target**: Add (i) icon with tooltip explaining:
  - API key saved locally on user's computer
  - Never sent to our server
  - Only sent directly to the provider
- **Rationale**: Transparency about data handling

#### 5. Public Generations Warning ✅

- **Current**: No warning about public nature
- **Target**: Add prominent notice that all generations are public
- **Rationale**: User privacy awareness

#### 6. Password Reveal Button ✅

- **Current**: Password input with no reveal option
- **Target**: Add eye icon button to toggle password visibility
- **Rationale**: Better UX, verify API key entry

#### 7. Responsive Layout Improvements ✅

- **Current**: lg:col-span-4 (left) / lg:col-span-8 (right)
- **Target**: lg:col-span-5 (left) / lg:col-span-7 (right), stack vertically on small screens
- **Rationale**: More space for controls, better mobile experience

#### 8. Handle Multiple SVG Generations ✅

- **Current**: Takes first SVG code block
- **Target**: Take the LAST SVG code block if multiple exist
- **Rationale**: Model might generate examples then final version

#### 9. Iteration Context Options ✅

- **Current**: Sends full conversation history
- **Target**: Add option to send only last step or full history
- **Rationale**: Reduce token usage, faster iterations
- **Implementation**: Add toggle in settings

#### 10. Custom Styling (Less Shadcn-y) ✅

- **Current**: Standard shadcn aesthetic
- **Target**: More unique, custom styling
- **Rationale**: Differentiate from generic shadcn apps
- **Ideas**:
  - Custom color scheme (less purple/blue)
  - Unique card styles
  - Custom button variants
  - More personality in typography

### Implementation Order

1. ✅ Consolidate tabs (remove Model and Prompt tabs)
2. ✅ Hide model dropdown for custom provider
3. ✅ Add Collapsible for prompt templates
4. ✅ Add API key info tooltip with icon
5. ✅ Add public generations warning
6. ✅ Add password reveal button
7. ✅ Adjust grid layout (col-span-5/7)
8. ✅ Fix SVG extraction to take last occurrence
9. ✅ Add iteration context toggle
10. ✅ Apply custom styling throughout

### Implementation Summary (Completed Dec 4, 2024)

All planned UI/UX improvements have been implemented:

- **Single Configuration Tab**: Removed the 3-tab layout (Gen/Model/Prompt) and consolidated everything into a single scrollable configuration panel
- **Custom Provider UX**: Model dropdown is now hidden when "Custom" provider is selected, showing only the custom model ID input
- **Collapsible Templates**: Prompt templates are now in a collapsible section, collapsed by default to reduce clutter
- **API Key Security**: Added info icon with tooltip explaining that API keys are stored locally and only sent to the provider
- **Public Warning**: Added prominent amber alert badge in header warning users that all generations are public
- **Password Reveal**: Added eye/eye-off icon button to toggle API key visibility
- **Wider Left Panel**: Changed from 4/8 split to 5/7 split (lg:col-span-5 / lg:col-span-7)
- **Multiple SVG Handling**: Updated SVG extraction to take the LAST occurrence if model generates multiple SVG blocks
- **Iteration Context**: Added "Send Full History" toggle to control whether all steps or just the last step is sent during refinement
- **Custom Styling**: Applied custom color scheme with orange/red/pink gradients, slate backgrounds, and removed generic shadcn purple/blue aesthetic
- **Compact Layout**: Reduced margins, removed rounded corners, replaced cards with simple separators, smaller UI elements
- **Component Refactoring**: Extracted major sections into reusable components (ModelSettings, OutputSettings)
- **ASCII Dimensions**: For ASCII art, show character width x height inputs instead of aspect ratio buttons, with separate state from SVG dimensions
- **Local Storage**: All settings (provider, model, dimensions, templates) and the last prompt are now saved to local storage
- **Template Reset**: Added "Reset to Default" buttons for prompt templates

## State Management Refactoring (Completed Dec 4, 2024)

### Goals

- Centralize all application state in `src/lib/state.svelte.ts` using Svelte 5 runes.
- Centralize model definitions and pricing in `src/lib/models.ts`.
- Remove prop drilling by consuming global state directly in components.
- Implement cost tracking and token usage statistics.

### Completed Status

- ✅ `src/lib/models.ts` created with provider and model definitions.
- ✅ `src/lib/state.svelte.ts` created with `AppState` class managing settings, history, and persistence.
- ✅ `ModelSettings.svelte` and `OutputSettings.svelte` refactored to use `appState`.
- ✅ `src/routes/+page.svelte` fully refactored to use `appState` throughout.
  - All local state variables replaced with `appState` properties
  - Components simplified to consume global state directly
  - No more prop drilling - components access `appState` directly
  - All bindings updated to use `appState` properties

### Implementation Summary

The refactoring successfully centralized all application state into a single reactive `AppState` class:

- **Settings**: Provider, model, API keys, output format, dimensions, templates all managed in one place
- **Generation State**: History, raw outputs, current project, reference image, generating flag
- **Persistence**: Automatic localStorage sync for settings and last prompt
- **Components**: ModelSettings and OutputSettings consume `appState` directly without props
- **Main Page**: Completely refactored to use `appState` instead of local variables

## Cost Tracking (Completed Dec 4, 2024)

### Features

- ✅ **Real-time Cost Calculation**: Automatically calculates cost for each generation step using model-specific pricing
- ✅ **Token Usage Tracking**: Tracks input and output tokens for each step and session totals
- ✅ **Session Totals**: Displays cumulative cost and token usage for the current session
- ✅ **Per-Step Breakdown**: Shows detailed cost and token usage for each refinement step
- ✅ **Collapsible Display**: Cost tracking UI is collapsible to save space
- ✅ **Reset Functionality**: Ability to reset session costs

### Implementation

- Created `CostDisplay.svelte` component with collapsible UI
- Added cost tracking methods to `AppState` class
- Integrated with Vercel AI SDK's usage reporting
- Uses pricing data from `models.ts` for accurate cost calculation
- Displays formatted costs (e.g., $0.001 for sub-cent amounts)
- Shows formatted token counts (e.g., 1.2K, 2.5M)

## Separate ASCII Templates (Completed Dec 4, 2024)

### Features

- ✅ **Format-Specific Templates**: Separate prompt templates for SVG and ASCII art generation
- ✅ **ASCII-Optimized Prompts**: Templates specifically designed for ASCII art generation
- ✅ **Template Persistence**: ASCII templates are saved to localStorage along with SVG templates
- ✅ **Reset to Defaults**: Individual reset buttons for each template type

### Templates

- **SVG Initial Template**: Optimized for creating SVG vector graphics
- **SVG Refinement Template**: Focused on improving SVG quality and fixing errors
- **ASCII Initial Template**: Optimized for creating ASCII art with character variety
- **ASCII Refinement Template**: Focused on improving ASCII art composition and detail

### Next Steps

1. **Verify Functionality**:
   - Test generation with different providers
   - Test refinement steps
   - Test persistence of settings
   - Verify cost tracking accuracy
2. **Add Cost Estimates**:
   - Show estimated cost before generation
   - Add cost warnings for expensive operations
3. **Export Cost Reports**:
   - Allow exporting cost history as CSV
   - Add cost analytics and charts
