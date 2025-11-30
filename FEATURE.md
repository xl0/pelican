# Image Converter Webapp

## Overview

A web application to convert prompt + reference images into SVG or ASCII art.

## Features

- [x] Frontend UI (SvelteKit + Shadcn)
  - [x] Prompt input
  - [x] Reference image upload
  - [x] Configuration (Output format, Color)
  - [x] Preview area
  - [x] Progressive generation history
  - [x] Advanced Settings
    - [x] Provider selection (OpenAI, Anthropic, Google, xAI, OpenRouter, Custom)
    - [x] Model selection (Updated with latest models)
    - [x] API Endpoint configuration (Custom provider only)
    - [x] API Key input (BYOK)
    - [x] Prompt Template editing (Initial & Refinement)
      - [x] Syntax highlighting (CodeMirror)
      - [x] Variable validation (Warning for missing {{prompt}})
      - [x] Syntax checking (Hybrid: Nunjucks + Strict Regex)
      - [x] Debugging (debug.js integrated)
      - [x] Error highlighting (CodeMirror Linter)
      - [x] Verbose error messages ("Missing closing brackets", etc.)
- [ ] Backend API
  - [ ] Image processing logic
  - [ ] AI model integration
  - [ ] Progressive refinement loop
- [ ] Integration
  - [ ] Connect frontend to backend

## Current State

- Frontend implemented with mock progressive generation.
- Configuration UI updated with Tabs.
- Added settings for Provider, Model, Endpoint, API Key, and Prompt Templates.
- Prompt Templates now use `PromptEditor` with syntax highlighting and validation.
- Validation logic uses a hybrid approach with a CodeMirror linter:
  - Highlights invalid tags in red.
  - Provides specific error messages like "Missing closing brackets '}}'".
- Added `debug` package for logging.
- Fixed SSR issue with `svelte-codemirror-editor`.
- Model list updated with the latest models as of Nov 2025.
- History of generation steps is displayed.
- Shadcn components installed and configured.

## Next Steps

- Implement the backend logic for image conversion.
- Connect the frontend to the backend.
