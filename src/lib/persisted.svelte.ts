import { PersistedState } from 'runed';
import { toast } from 'svelte-sonner';
import { type providersKey } from './models';
import {
	DEFAULT_ASCII_INITIAL_TEMPLATE,
	DEFAULT_ASCII_REFINEMENT_TEMPLATE,
	DEFAULT_INITIAL_TEMPLATE,
	DEFAULT_REFINEMENT_TEMPLATE
} from './prompts';

const DEFAULT_ASCII_WIDTH = 80;
const DEFAULT_ASCII_HEIGHT = 24;
const STORAGE_PREFIX = 'pelican:';

const prefix = (s: string) => STORAGE_PREFIX + s;
const persisted = <T>(s: string, arg: T) => new PersistedState<T>(prefix(s), arg);

// Default templates

// Persisted settings (using runed's PersistedState)

export const provider = persisted<providersKey>('provider', 'anthropic');
export const customModelId = persisted('customModelId', '');
export const outputFormat = persisted<'svg' | 'ascii'>('outputFormat', 'svg');
export const svgWidth = persisted('svgWidth', 800);
export const svgHeight = persisted('svgHeight', 600);
export const asciiWidth = persisted('asciiWidth', DEFAULT_ASCII_WIDTH);
export const asciiHeight = persisted('asciiHeight', DEFAULT_ASCII_HEIGHT);
export const maxSteps = persisted('maxSteps', 5);
export const sendFullHistory = persisted('sendFullHistory', true);
export const initialTemplate = persisted('initialTemplate', DEFAULT_INITIAL_TEMPLATE);
export const refinementTemplate = persisted('refinementTemplate', DEFAULT_REFINEMENT_TEMPLATE);
export const asciiInitialTemplate = persisted('asciiInitialTemplate', DEFAULT_ASCII_INITIAL_TEMPLATE);
export const asciiRefinementTemplate = persisted('asciiRefinementTemplate', DEFAULT_ASCII_REFINEMENT_TEMPLATE);
export const prompt = persisted('prompt', 'Pelican riding a bicycle');

export const apiKeys = persisted<Record<string, string>>('apiKeys', {});
// Save the selected model and endpoint per provider
export const selected_model = persisted<Record<string, string>>('model', {});
export const endpoint = persisted<Record<string, string>>('endpoint', {});

// Project/Generation state - reflects DB data
// export const projectState = $state({ current: null as Generation | null, generations: [] as Generation[] });

// UI-only state (not persisted)
// export const uiState = $state({
// 	isGenerating: false,
// 	selectedStepIndex: null as number | null, // null = latest
// 	referenceImageFile: null as File | null,
// 	streamingContent: '' // content being streamed for current generation
// });

// // Helper to get the currently viewed generation
// export function getSelectedGeneration(): Generation | null {
// 	if (projectState.generations.length === 0) return null;
// 	if (uiState.selectedStepIndex === null) {
// 		return projectState.generations[projectState.generations.length - 1];
// 	}
// 	return projectState.generations[uiState.selectedStepIndex] || null;
// }

// // Reset project state for new generation
// export function resetProjectState(): void {
// 	projectState.current = null;
// 	projectState.generations = [];
// 	uiState.selectedStepIndex = null;
// 	uiState.streamingContent = '';
// }

// API keys - stored as object with provider as key (auto-persisted)

export function clearApikey(p: providersKey): void {
	delete apiKeys.current[p];
	// const { [p]: _, ...rest } = apiKeys.current;
	// apiKeys.current = rest;
	toast.success(`API key cleared for ${provider.current}`);
}

export function clearAllApiKeys(): void {
	apiKeys.current = {};
	toast.success('All API keys cleared');
}
