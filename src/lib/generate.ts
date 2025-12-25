/**
 * Client-side AI generation using Vercel AI SDK.
 * Handles streaming, artifact extraction, and database persistence.
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, type LanguageModel } from 'ai';

import { goto } from '$app/navigation';
import dbg from 'debug';
import { toast } from 'svelte-sonner';
import { app, type CurrentGeneration } from './appstate.svelte';
import { extractArtifacts } from './artifacts';
import { insertGeneration, insertStep, updateStep, uploadArtifact, uploadInputImage } from './data.remote';
import { providers, type Model, type providersKey } from './models';
import * as p from './persisted.svelte';

const debug = dbg('app:generate');

/**
 * Get the AI model instance for a given provider/model/apiKey.
 */
function getModelInstance(provider: providersKey, modelId: string, apiKey: string, endpoint?: string | null): LanguageModel {
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
			// Use OpenAI-compatible API for custom endpoints
			return createOpenAI({ apiKey, baseURL: endpoint ?? undefined })(modelId);
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

/**
 * Get model info for cost calculation.
 */
function getModelInfo(provider: providersKey, modelId: string): Model | undefined {
	const providerData = providers[provider];
	if (!providerData) return undefined;
	if (provider === 'custom') {
		return { value: modelId, label: modelId, pricing: { input: 0, output: 0 }, supportsImages: true };
	}
	return providerData.models.find((m) => m.value === modelId);
}

/**
 * Calculate cost from token usage.
 */
function calculateCost(model: Model, inputTokens: number, outputTokens: number): { input: number; output: number } {
	return {
		input: (inputTokens / 1_000_000) * model.pricing.input,
		output: (outputTokens / 1_000_000) * model.pricing.output
	};
}

export interface GenerateResult {
	generationId: string;
	success: boolean;
	error?: string;
}

/**
 * Run a single-step generation.
 * Creates generation in DB, streams response, extracts artifacts, saves everything.
 */
export async function generate(userId: string): Promise<GenerateResult> {
	const gen = app.currentGeneration;
	if (!gen) throw new Error('No current generation');

	const apiKey = p.apiKeys.current[gen.provider];
	if (!apiKey) {
		toast.error(`Please enter an API key for ${providers[gen.provider].label}`);
		throw new Error('Missing API key');
	}

	const modelInfo = getModelInfo(gen.provider, gen.model);
	app.isGenerating = true;
	debug('Starting generation', { provider: gen.provider, model: gen.model });

	let generationId: string | undefined;

	try {
		// 1. Commit settings to localStorage
		app.commitToPersisted();

		// 2. Insert generation into DB
		const dbGen = await insertGeneration({
			userId,
			title: gen.title || gen.prompt.slice(0, 50),
			prompt: gen.prompt,
			format: gen.format,
			width: gen.width,
			height: gen.height,
			provider: gen.provider,
			model: gen.model,
			endpoint: gen.endpoint,
			initialTemplate: gen.initialTemplate,
			refinementTemplate: gen.refinementTemplate,
			maxSteps: gen.maxSteps,
			sendFullHistory: gen.sendFullHistory
		});
		generationId = dbGen.id;
		debug('Created generation', { generationId });

		// 3. Upload pending input images
		for (const file of app.pendingInputFiles) {
			const ext = file.name.split('.').pop() || 'png';
			await uploadInputImage({ generationId, data: file, extension: ext });
			debug('Uploaded input image', { name: file.name });
		}
		app.pendingInputFiles = [];

		// 4. Insert step record (use app.renderedPrompt from templates)
		const renderedPrompt = app.renderedPrompt;
		const dbStep = await insertStep({
			generationId,
			renderedPrompt,
			status: 'generating'
		});
		debug('Created step', { stepId: dbStep.id });

		// 5. Initialize client-side step for live preview
		const clientStep: CurrentGeneration['steps'][number] = {
			id: dbStep.id,
			generationId,
			renderedPrompt,
			status: 'pending',
			rawOutput: '',
			artifacts: []
		};
		gen.steps = [clientStep];
		app.selectedStepIndex = undefined;
		app.selectedArtifactIndex = undefined;

		// 6. Build messages (use rendered prompt directly, no system prompt for now)
		const userContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [{ type: 'text', text: renderedPrompt }];

		// TODO: Add reference images to userContent if available
		// For now, we skip image inputs

		// 7. Stream the generation
		const model = getModelInstance(gen.provider, gen.model, apiKey, gen.endpoint?.trim() || undefined);

		let fullText = '';
		const result = streamText({
			model,
			messages: [{ role: 'user', content: userContent }],
			onChunk({ chunk }) {
				if (chunk.type === 'text-delta') {
					fullText += chunk.text;
					// Update through gen.steps to trigger Svelte reactivity
					const step = gen.steps[0];
					if (step) {
						step.rawOutput = fullText;
						// Extract artifacts incrementally
						const extracted = extractArtifacts(fullText, gen.format);
						step.artifacts = extracted.map((a) => ({
							stepId: dbStep.id,
							body: a.body
						}));
						// Trigger reactivity by reassigning the array
						gen.steps = [...gen.steps];
					}
				}
			},
			onError({ error }) {
				debug('Stream error', { error });
				toast.error('Generation failed', { description: String(error) });
			}
		});

		// Consume the stream
		for await (const _ of result.textStream) {
			// Just consuming to trigger onChunk callbacks
		}

		// 8. Get final usage
		const usage = await result.usage;
		const inputTokens = usage?.inputTokens ?? 0;
		const outputTokens = usage?.outputTokens ?? 0;
		const cost = modelInfo ? calculateCost(modelInfo, inputTokens, outputTokens) : { input: 0, output: 0 };

		// 9. Final artifact extraction
		const finalArtifacts = extractArtifacts(fullText, gen.format);
		clientStep.rawOutput = fullText;
		clientStep.artifacts = finalArtifacts.map((a) => ({
			stepId: dbStep.id,
			body: a.body
		}));
		clientStep.status = 'completed';
		clientStep.inputTokens = inputTokens;
		clientStep.outputTokens = outputTokens;
		clientStep.inputCost = cost.input;
		clientStep.outputCost = cost.output;

		debug('Generation completed', { inputTokens, outputTokens, artifacts: finalArtifacts.length });

		// 10. Update step in DB
		await updateStep({
			id: dbStep.id,
			status: 'completed',
			rawOutput: fullText,
			inputTokens,
			outputTokens,
			inputCost: cost.input,
			outputCost: cost.output,
			completedAt: new Date()
		});

		// 11. Upload artifacts
		for (let i = 0; i < finalArtifacts.length; i++) {
			const art = finalArtifacts[i];
			const result = await uploadArtifact({
				generationId,
				stepId: dbStep.id,
				content: art.body,
				format: gen.format
			});
			// Update client-side artifact with real ID
			if (clientStep.artifacts[i]) {
				clientStep.artifacts[i].id = result.id;
			}
			debug('Uploaded artifact', { id: result.id });
		}

		// 12. Navigate to the generation
		await goto(`/${generationId}`);

		return { generationId, success: true };
	} catch (error) {
		debug('Generation failed', { error });
		const errorMsg = error instanceof Error ? error.message : String(error);
		toast.error('Generation failed', { description: errorMsg });

		// Update step status to failed if we have one
		if (gen.steps?.[0]?.id) {
			await updateStep({
				id: gen.steps[0].id,
				status: 'failed',
				errorMessage: errorMsg
			}).catch(() => {});
		}

		return { generationId: generationId ?? '', success: false, error: errorMsg };
	} finally {
		app.isGenerating = false;
	}
}
