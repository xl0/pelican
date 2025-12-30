import { PersistedState } from 'runed';
import { toast } from 'svelte-sonner';
import { type providersKey } from './models';
import {
	DEFAULT_ASCII_INITIAL_TEMPLATE,
	DEFAULT_ASCII_REFINEMENT_TEMPLATE,
	DEFAULT_INITIAL_TEMPLATE,
	DEFAULT_REFINEMENT_TEMPLATE
} from './prompts';
import dbg from 'debug';

const debug = dbg('app:persisted');

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
export const showAllSteps = persisted('showAllSteps', false);
export const prompt = persisted('prompt', 'Pelican riding a bicycle');
export const promptTemplatesOpen = persisted('promptTemplatesOpen', false);
export const showRawOutput = persisted('showRawOutput', false);
export const asciiStyle = persisted<'teletype' | 'crt'>('asciiStyle', 'crt');

export const apiKeys = persisted<Record<string, string>>('apiKeys', {});

// Save the selected model and endpoint per provider
export const selected_model = persisted<Partial<Record<providersKey, string>>>('model', {});
export const endpoint = persisted<Partial<Record<providersKey, string>>>('endpoint', {});

// API keys - stored as object with provider as key (auto-persisted)

export function clearApikey(p: providersKey): void {
	const { [p]: _, ...rest } = apiKeys.current;
	apiKeys.current = rest;
	toast.success(`API key cleared for ${provider.current}`);
}

export function clearAllApiKeys(): void {
	apiKeys.current = {};
	toast.success('All API keys cleared');
}
