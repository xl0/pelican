/**
 * Client-side AI generation using Vercel AI SDK.
 * Handles streaming, artifact extraction, and database persistence.
 * Supports multi-step refinement with rendered artifacts sent back to LLM.
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, type LanguageModel, type ImagePart } from 'ai';
import type { ModelMessage } from 'ai';

import { goto } from '$app/navigation';
import dbg from 'debug';

import { toast } from 'svelte-sonner';
import { app, type CurrentGeneration } from './appstate.svelte';
import { extractArtifacts } from './artifacts';
import {
	insertGeneration,
	insertStep,
	updateStep,
	uploadArtifact,
	uploadInputImage,
	linkImageToGeneration,
	getProvidersWithModels
} from './data.remote';
import * as p from './persisted.svelte';
import { svgStringToPng } from 'svelte-asciiart';
import { renderAsciiToSvg } from './svg';
import { getInputImageUrl } from './utils';
import type { Format } from './types';

const debug = dbg('app:generate');

/** Extract detailed error message from AI SDK errors (API errors have data.error.message) */
function extractErrorMessage(error: unknown): string {
	if (error && typeof error === 'object') {
		const e = error as Record<string, unknown>;
		// AI SDK API errors have data.error.message with provider's error
		if (e.data && typeof e.data === 'object') {
			const data = e.data as Record<string, unknown>;
			if (data.error && typeof data.error === 'object') {
				const apiError = data.error as Record<string, unknown>;
				if (typeof apiError.message === 'string') {
					const parts = [apiError.message];
					if (apiError.type) parts.push(`type: ${apiError.type}`);
					if (apiError.code) parts.push(`code: ${apiError.code}`);
					if (apiError.param) parts.push(`param: ${apiError.param}`);
					return parts.join(' | ');
				}
			}
		}
	}
	return error instanceof Error ? error.message : String(error);
}

function getModelInstance(provider: string, modelId: string, apiKey: string, endpoint?: string | null): LanguageModel {
	switch (provider) {
		case 'openai':
			return createOpenAI({ apiKey, baseURL: endpoint ?? undefined })(modelId);
		case 'anthropic':
			return createAnthropic({
				apiKey,
				baseURL: endpoint ?? undefined,
				headers: { 'anthropic-dangerous-direct-browser-access': 'true' }
			})(modelId);
		case 'google':
			return createGoogleGenerativeAI({ apiKey, baseURL: endpoint ?? undefined })(modelId);
		case 'xai':
			return createXai({ apiKey, baseURL: endpoint ?? undefined })(modelId);
		case 'openrouter':
			return createOpenRouter({ apiKey, baseURL: endpoint ?? undefined })(modelId);
		case 'custom':
			return createOpenAI({ apiKey, baseURL: endpoint ?? undefined })(modelId);
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}



export interface GenerateResult {
	generationId: string;
	success: boolean;
	error?: string;
}

/**
 * Run multi-step generation with refinement loop.
 * Creates generation in DB, streams each step, renders artifacts as images,
 * sends them back for refinement until maxSteps is reached.
 */
export async function generate(): Promise<GenerateResult> {
	const gen = app.currentGeneration;
	if (!gen) throw new Error('No current generation');

	const apiKey = p.apiKeys.current[gen.provider];
	if (!apiKey) {
		toast.error(`Please enter an API key for ${gen.provider}`);
		throw new Error('Missing API key');
	}

	// Fetch model pricing from DB (lookup in providers data)
	const providersData = await getProvidersWithModels();
	const providerModels = providersData?.find((p) => p.id === gen.provider)?.models ?? [];
	const modelData = providerModels.find((m) => m.value === gen.model);
	const inputPrice = modelData?.inputPrice ?? 0;
	const outputPrice = modelData?.outputPrice ?? 0;

	// Determine actual model ID: use customModel when model is 'custom'
	const effectiveModelId = gen.model === 'custom' ? (gen.customModel || '') : gen.model;
	if (!effectiveModelId) {
		toast.error('Please enter a model ID');
		throw new Error('Missing model ID');
	}

	const model = getModelInstance(gen.provider, effectiveModelId, apiKey, gen.endpoint?.trim() || undefined);
	const maxSteps = gen.maxSteps || 1;

	app.isGenerating = true;
	debug('Starting generation', { provider: gen.provider, model: effectiveModelId, maxSteps, inputPrice, outputPrice });

	let generationId: string | undefined;

	try {
		// 1. Commit settings to localStorage
		app.commitToPersisted();

		// 2. Insert generation into DB
		const dbGen = await insertGeneration({
			prompt: gen.prompt,
			format: gen.format,
			width: gen.width,
			height: gen.height,
			provider: gen.provider,
			model: gen.model,
			customModel: gen.customModel,
			endpoint: gen.endpoint,
			initialTemplate: gen.initialTemplate,
			refinementTemplate: gen.refinementTemplate,
			maxSteps: gen.maxSteps,
			sendFullHistory: gen.sendFullHistory,
			access: gen.access
		});
		generationId = dbGen.id;
		gen.id = dbGen.id;
		debug('Created generation', { generationId });

		// 3. Collect input image parts for LLM (URL for existing, Uint8Array for new)
		const inputImageParts: ImagePart[] = [];

		// 3a. Process pending input files (new uploads) - upload first, then use URL
		for (const file of app.pendingInputFiles) {
			const ext = file.name.split('.').pop() || 'png';
			const buffer = await file.arrayBuffer();
			const data = new Uint8Array(buffer) as Uint8Array<ArrayBuffer>;
			const uploaded = await uploadInputImage({ generationId, data, extension: ext });
			// Add to gen.images so we have the ID
			gen.images = [...gen.images, { id: uploaded.id, extension: ext }];
			// Use URL for consistency
			const url = getInputImageUrl(uploaded.id, ext);
			inputImageParts.push({ type: 'image', image: new URL(url, window.location.origin) });
			debug('Uploaded input image', { id: uploaded.id });
		}
		app.pendingInputFiles = [];

		// 3b. Add existing images from generation and link to new generation
		if (gen.images?.length) {
			for (const img of gen.images) {
				const url = getInputImageUrl(img.id, img.extension);
				inputImageParts.push({ type: 'image', image: new URL(url, window.location.origin) });
				await linkImageToGeneration({ generationId, imageId: img.id });
				debug('Added existing image', { id: img.id });
			}
		}

		// Initialize steps array
		gen.steps = [];
		app.selectedStepIndex = undefined;
		app.selectedArtifactIndex = undefined;

		// Step history: track each completed step's output and rendered image (Blob for efficiency)
		const stepHistory: { rawOutput: string; renderedBlob: Blob }[] = [];

		// ========== Multi-step generation loop ==========
		for (let stepNum = 0; stepNum < maxSteps; stepNum++) {
			const isFirstStep = stepNum === 0;
			debug('Starting step', { stepNum: stepNum + 1, maxSteps });

			// The rendered prompt for this step (for DB storage)
			const renderedPrompt = isFirstStep ? app.renderedPrompt : app.renderedRefinementPrompt;

			// Create step data IMMEDIATELY for live UI feedback (before any async ops)
			const stepData: CurrentGeneration['steps'][number] = {
				generationId,
				renderedPrompt,
				status: 'generating',
				rawOutput: '',
				artifacts: []
			};
			gen.steps = [...gen.steps, stepData];

			// Build messages for this step
			const messages: ModelMessage[] = [];

			// Always start with: input images + initial prompt
			const initialContent: Array<{ type: 'text'; text: string } | ImagePart> = [
				...inputImageParts,
				{ type: 'text', text: app.renderedPrompt }
			];
			messages.push({ role: 'user', content: initialContent });

			// For refinement steps, add history
			if (!isFirstStep) {
				if (gen.sendFullHistory) {
					// Full history: all previous steps
					for (const hist of stepHistory) {
						messages.push({ role: 'assistant', content: hist.rawOutput });
						const renderedData = new Uint8Array(await hist.renderedBlob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
						messages.push({
							role: 'user',
							content: [
								{ type: 'image', image: renderedData },
								{ type: 'text', text: app.renderedRefinementPrompt }
							]
						});
					}
				} else {
					// Last step only: just the previous step's context
					const lastHist = stepHistory[stepHistory.length - 1];
					messages.push({ role: 'assistant', content: lastHist.rawOutput });
					const renderedData = new Uint8Array(await lastHist.renderedBlob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
					messages.push({
						role: 'user',
						content: [
							{ type: 'image', image: renderedData },
							{ type: 'text', text: app.renderedRefinementPrompt }
						]
					});
				}
			}

			// Insert step in DB (after UI is already showing the step)
			const dbStep = await insertStep({
				generationId,
				renderedPrompt,
				status: 'generating'
			});
			debug('Created step', { stepId: dbStep.id, stepNum: stepNum + 1 });
			// Update step with DB id
			gen.steps[stepNum].id = dbStep.id;
			// Access step through gen.steps[stepNum] - Svelte's $state proxy requires this

			// Stream the generation
			// Capture detailed error from onError callback (onError gets the full API error,
			// but awaiting result.usage throws a generic AI_NoOutputGeneratedError)
			let streamError: unknown;

			const result = streamText({
				model,
				messages,
				onChunk({ chunk }) {
					if (chunk.type === 'text-delta') {
						const step = gen.steps[stepNum];
						if (step) {
							step.rawOutput = (step.rawOutput ?? '') + chunk.text;
							const extracted = extractArtifacts(step.rawOutput, gen.format);
							step.artifacts = extracted.map((a) => ({
								stepId: dbStep.id,
								body: a.body
							}));
						}
					}
				},
				onError({ error }) {
					debug('Stream error', { error, stepNum: stepNum + 1 });
					streamError = error;
				}
			});

			// Consume the stream
			for await (const _ of result.textStream) {
				// Trigger onChunk callbacks
			}

			// If stream had an error, throw it now (with full details from onError)
			if (streamError) throw streamError;

			// Get usage stats
			const usage = await result.usage;
			const inputTokens = usage?.inputTokens ?? 0;
			const outputTokens = usage?.outputTokens ?? 0;

			// Final artifact extraction
			const step = gen.steps[stepNum]!;
			const finalArtifacts = extractArtifacts(step.rawOutput ?? '', gen.format);
			step.artifacts = finalArtifacts.map((a) => ({
				stepId: dbStep.id,
				body: a.body
			}));
			step.status = 'completed';
			step.inputTokens = inputTokens;
			step.outputTokens = outputTokens;
			step.inputCost = (inputTokens / 1_000_000) * inputPrice;
			step.outputCost = (outputTokens / 1_000_000) * outputPrice;

			debug('Step completed', {
				stepNum: stepNum + 1,
				inputTokens,
				outputTokens,
				artifacts: finalArtifacts.length,
				rawOutputLen: step.rawOutput?.length ?? 0
			});

			// Update step in DB
			debug('Updating step in DB', { stepId: dbStep.id, rawOutputLen: (step.rawOutput ?? '').length });
			await updateStep({
				id: dbStep.id,
				status: 'completed',
				rawOutput: step.rawOutput ?? '',
				inputTokens,
				outputTokens,
				inputCost: (inputTokens / 1_000_000) * inputPrice,
				outputCost: (outputTokens / 1_000_000) * outputPrice
			});
			debug('Step updated in DB');

			// Upload artifacts to S3, render each and upload SVG+PNG
			let lastRenderedBlob: Blob | undefined;
			for (let i = 0; i < finalArtifacts.length; i++) {
				const art = finalArtifacts[i];
				let svg: string | undefined;
				let png: Uint8Array<ArrayBuffer> | undefined;
				let renderError: string | undefined;

				// Render to SVG and PNG
				try {
					if (gen.format === 'svg') {
						svg = art.body;
					} else {
						svg = renderAsciiToSvg(art.body, gen.width, gen.height);
					}
					const pngBlob = await svgStringToPng(svg, { output: 'blob' });
					png = new Uint8Array((await pngBlob.arrayBuffer()) as ArrayBuffer);
					// Keep last successful PNG render for conversation history (LLM refinement)
					lastRenderedBlob = pngBlob;
				} catch (err) {
					renderError = err instanceof Error ? err.message : String(err);
					debug('Failed to render artifact', { index: i, error: renderError });
				}

				const uploaded = await uploadArtifact({
					generationId,
					stepId: dbStep.id,
					ascii: gen.format === 'ascii' ? art.body : undefined,
					svg,
					png,
					renderError
				});
				if (step.artifacts[i]) {
					step.artifacts[i].id = uploaded.id;
				}
				debug('Uploaded artifact', { id: uploaded.id, renderError });
			}

			// If not the last step and we have a rendered image, use for history
			const isLastStep = stepNum === maxSteps - 1;
			// XXX Let the llm know we could not render the last artifact and thus we are sending the other one.
			if (!isLastStep && lastRenderedBlob) {
				// Store blob for next step's message building
				stepHistory.push({ rawOutput: step.rawOutput ?? '', renderedBlob: lastRenderedBlob });
				debug('Added step to history', { stepNum: stepNum + 1 });
			} else if (!isLastStep && finalArtifacts.length > 0) {
				// No artifact rendered successfully, can't continue refinement
				debug('No artifacts rendered successfully, stopping refinement');
				break;
			}
		}

		// Navigate to generation page after completion
		await goto(`/${generationId}`);

		return { generationId, success: true };
	} catch (error) {
		debug('Generation failed', { error });
		// Extract detailed error message - API errors have data.error.message with provider's message
		const errorMsg = extractErrorMessage(error);
		toast.error('Generation failed', { description: errorMsg });

		// Update last step status to failed
		const lastStep = gen.steps?.[gen.steps.length - 1];
		if (lastStep?.id) {
			await updateStep({
				id: lastStep.id,
				status: 'failed',
				errorMessage: errorMsg,
				errorData: error
			}).catch(() => {});
		}

		return { generationId: generationId ?? '', success: false, error: errorMsg };
	} finally {
		app.isGenerating = false;
	}
}
