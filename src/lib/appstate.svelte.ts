import * as p from './persisted.svelte';
import dbg from 'debug';
import type { getGeneration } from './data.remote';
import { untrack } from 'svelte';
import { extractArtifacts } from './artifacts';

const debug = dbg('app:state');

type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Required<Pick<T, K>>;
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Type for generation without timestamps (used for new/editing generations)
type DBGeneration = NonNullable<Awaited<ReturnType<typeof getGeneration>>>;
export type CurrentGeneration = Omit<MakeOptional<DBGeneration, 'id' | 'createdAt' | 'updatedAt'>, 'steps' | 'generationImages'> & {
	steps: (Omit<PartialExcept<DBGeneration['steps'][number], 'status'>, 'artifacts'> & {
		artifacts: Partial<DBGeneration['steps'][number]['artifacts'][number]>[];
	})[];
	// Flattened images array for convenience (from generationImages junction table)
	images: { id: string; extension: string }[];
};

/**
 * Creates a "dummy" generation object from persisted localStorage values.
 * Used when no generation ID is in the URL (new generation mode).
 */
export function generationFromPersisted(): CurrentGeneration {
	debug('generationFromPersisted');
	const format = p.outputFormat.current;
	const provider = p.provider.current;

	return {
		userId: '', // Will be set from layout data
		prompt: p.prompt.current,
		format,
		width: format === 'svg' ? p.svgWidth.current : p.asciiWidth.current,
		height: format === 'svg' ? p.svgHeight.current : p.asciiHeight.current,
		provider,
		model: p.selected_model.current[provider] ?? '',
		endpoint: p.endpoint.current[provider] ?? null,
		initialTemplate: format === 'svg' ? p.initialTemplate.current : p.asciiInitialTemplate.current,
		refinementTemplate: format === 'svg' ? p.refinementTemplate.current : p.asciiRefinementTemplate.current,
		maxSteps: p.maxSteps.current,
		sendFullHistory: p.sendFullHistory.current,
		// Visibility (actual values set server-side based on user type)
		shared: false,
		public: false,
		approval: 'pending' as const,
		// Relations (empty for new generation)
		steps: [],
		images: []
	};
}

/**
 * App state - holds current generation and UI state.
 */
class AppState {
	currentGeneration = $state<CurrentGeneration | undefined>(generationFromPersisted());

	// Original templates from DB (for reset in existing generations)
	originalTemplates = $state<{ initial: string; refinement: string } | undefined>();

	// UI state (not persisted, not from generation)
	isGenerating = $state(false);
	selectedStepIndex = $state<number>(); // undefined -> last step
	selectedArtifactIndex = $state<number>(); // undefined -> last artifact

	// Rendered templates (computed from templates + context)
	renderedPrompt = $state('');
	renderedRefinementPrompt = $state('');

	// Pending files to upload when generating (not yet in DB/S3)
	pendingInputFiles = $state<File[]>([]);

	/** Reset to a fresh generation from persisted values */
	resetFromPersisted() {
		untrack(() => {
			this.currentGeneration = generationFromPersisted();
			this.originalTemplates = undefined; // Clear since it's a new generation
		});
	}

	/** Save current generation settings to localStorage */
	commitToPersisted() {
		const gen = this.currentGeneration;
		if (!gen) return;

		p.prompt.current = gen.prompt;
		p.outputFormat.current = gen.format;
		if (gen.format === 'svg') {
			p.svgWidth.current = gen.width;
			p.svgHeight.current = gen.height;
			p.initialTemplate.current = gen.initialTemplate;
			p.refinementTemplate.current = gen.refinementTemplate;
		} else {
			p.asciiWidth.current = gen.width;
			p.asciiHeight.current = gen.height;
			p.asciiInitialTemplate.current = gen.initialTemplate;
			p.asciiRefinementTemplate.current = gen.refinementTemplate;
		}
		p.provider.current = gen.provider;
		p.selected_model.current[gen.provider] = gen.model;
		if (gen.endpoint) p.endpoint.current[gen.provider] = gen.endpoint;
		p.maxSteps.current = gen.maxSteps;
		p.sendFullHistory.current = gen.sendFullHistory;
	}

	/** Change format, save to persisted, then reset to pick up format-specific defaults */
	setFormat(format: 'svg' | 'ascii') {
		if (!this.currentGeneration) return;
		// Save current state before switching
		this.commitToPersisted();
		// Update format in persisted
		p.outputFormat.current = format;
		// Reset to get format-specific values (dimensions, templates)
		this.resetFromPersisted();
	}

	/** Switch provider - model is set by caller (ModelSettings) */
	switchProvider(newProvider: string) {
		if (!this.currentGeneration) return;
		this.currentGeneration.provider = newProvider;
		this.currentGeneration.model = p.selected_model.current[newProvider] ?? '';
		this.currentGeneration.endpoint = p.endpoint.current[newProvider] ?? null;
	}

	// Streaming state
	isStreaming = $state(false);
	private streamAbort: AbortController | null = null;

	/** Stop any in-progress simulated stream */
	stopStream() {
		this.streamAbort?.abort();
		this.streamAbort = null;
		this.isStreaming = false;
	}

	/**
	 * Update step.artifacts from step.rawOutput.
	 * Call on each streaming chunk to incrementally show artifacts.
	 */
	updateStepArtifacts(stepIndex?: number) {
		const gen = this.currentGeneration;
		if (!gen?.steps?.length) return;
		const idx = stepIndex ?? gen.steps.length - 1;
		const step = gen.steps[idx];
		if (!step?.rawOutput) return;

		const extracted = extractArtifacts(step.rawOutput, gen.format);
		// Map to artifact shape (with placeholder ids since we're client-side)
		step.artifacts = extracted.map((a, i) => ({
			id: -(i + 1), // negative ids for client-generated artifacts
			stepId: step.id,
			body: a.body
		}));
		debug('updateStepArtifacts', { stepIndex: idx, count: step.artifacts.length });
	}

	/**
	 * Simulate streaming the current step's rawOutput.
	 * Replaces rawOutput character by character, calling updateStepArtifacts on each chunk.
	 */
	async simulateStream(charsPerChunk = 20, delayMs = 30) {
		const gen = this.currentGeneration;
		if (!gen?.steps?.length) return;
		const stepIdx = this.selectedStepIndex ?? gen.steps.length - 1;
		const step = gen.steps[stepIdx];
		if (!step?.rawOutput) return;

		// Store original content
		const fullOutput = step.rawOutput;

		// Clear artifacts and rawOutput
		step.rawOutput = '';
		step.artifacts = [];

		// Setup abort controller
		this.streamAbort = new AbortController();
		this.isStreaming = true;
		// this.isGenerating = true;

		try {
			for (let i = 0; i <= fullOutput.length; i += charsPerChunk) {
				if (this.streamAbort.signal.aborted) break;
				step.rawOutput = fullOutput.slice(0, i);
				this.updateStepArtifacts(stepIdx);
				await new Promise((r) => setTimeout(r, delayMs));
			}
			// Final complete output
			step.rawOutput = fullOutput;
			this.updateStepArtifacts(stepIdx);
		} finally {
			this.isStreaming = false;
			// this.isGenerating = false;
			this.streamAbort = null;
		}
	}
}

export const app = new AppState();
