import { type providersKey, providers } from './models';
import * as p from './persisted.svelte';
import dbg from 'debug';
import type { getGeneration } from './data.remote';
import { untrack } from 'svelte';

const debug = dbg('app:state');

// Type for generation without timestamps (used for new/editing generations)
type DBGeneration = NonNullable<Awaited<ReturnType<typeof getGeneration>>>;
export type CurrentGeneration = Omit<DBGeneration, 'createdAt' | 'updatedAt' | 'id'>

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

	// Pending files to upload when generating (not yet in DB/S3)
	pendingInputFiles = $state<File[]>([]);

	/** Reset to a fresh generation from persisted values */
	resetFromPersisted() {
		untrack(() => {
			this.currentGeneration = generationFromPersisted();
		});
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
