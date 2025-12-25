import { type providersKey, providers } from './models';
import * as p from './persisted.svelte';
import dbg from 'debug';
import type { getGeneration } from './data.remote';
import { untrack } from 'svelte';

const debug = dbg('app:state');

// Type for generation without timestamps (used for new/editing generations)
type DBGeneration = NonNullable<Awaited<ReturnType<typeof getGeneration>>>;
export type CurrentGeneration = Omit<DBGeneration, 'createdAt' | 'updatedAt' | 'id'>;

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
		title: p.prompt.current || 'Untitled',
		prompt: p.prompt.current,
		format,
		width: format === 'svg' ? p.svgWidth.current : p.asciiWidth.current,
		height: format === 'svg' ? p.svgHeight.current : p.asciiHeight.current,
		provider,
		model: p.selected_model.current[provider] ?? providers[provider]?.models[0]?.value ?? '',
		endpoint: p.endpoint.current[provider] ?? null,
		initialTemplate: format === 'svg' ? p.initialTemplate.current : p.asciiInitialTemplate.current,
		refinementTemplate: format === 'svg' ? p.refinementTemplate.current : p.asciiRefinementTemplate.current,
		maxSteps: p.maxSteps.current,
		sendFullHistory: p.sendFullHistory.current,
		// Relations (empty for new generation)
		steps: [],
		inputImages: []
	};
}

/**
 * App state - holds current generation and UI state.
 */
class AppState {
	currentGeneration = $state<CurrentGeneration | undefined>(generationFromPersisted());

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

	/** Switch provider and update model to default for that provider */
	switchProvider(newProvider: providersKey) {
		if (!this.currentGeneration) return;
		this.currentGeneration.provider = newProvider;
		this.currentGeneration.model = p.selected_model.current[newProvider] ?? providers[newProvider]?.models[0]?.value ?? '';
		this.currentGeneration.endpoint = p.endpoint.current[newProvider] ?? null;
	}
}

export const app = new AppState();
