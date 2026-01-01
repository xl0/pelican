export interface ModelPricing {
	input: number; // Cost per 1M input tokens
	output: number; // Cost per 1M output tokens
}

export interface Model {
	value: string;
	label: string;
	pricing: ModelPricing;
	supportsImages: boolean;
}

export interface Provider {
	value: string;
	label: string;
	apiKeyUrl?: string;
	models: Model[];
}

export const providerNames = ['openai', 'anthropic', 'google', 'xai', 'openrouter', 'custom'] as const;
export type providersKey = (typeof providerNames)[number];

// Updated December 2025 - comprehensive production models with accurate pricing
export const providers: Record<providersKey, Provider> = {
	openai: {
		value: 'openai',
		label: 'OpenAI',
		apiKeyUrl: 'https://platform.openai.com/api-keys',
		models: [
			// GPT-5.2 series
			{ value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro', pricing: { input: 21.0, output: 168.0 }, supportsImages: true },
			{ value: 'gpt-5.2', label: 'GPT-5.2', pricing: { input: 1.75, output: 14.0 }, supportsImages: true },
			// GPT-5.1 series
			{ value: 'gpt-5.1', label: 'GPT-5.1', pricing: { input: 1.25, output: 10.0 }, supportsImages: true },
			{ value: 'gpt-5.1-codex-max', label: 'GPT-5.1 Codex Max', pricing: { input: 1.25, output: 10.0 }, supportsImages: false },
			{ value: 'gpt-5.1-codex', label: 'GPT-5.1 Codex', pricing: { input: 1.25, output: 10.0 }, supportsImages: false },
			{ value: 'gpt-5.1-codex-mini', label: 'GPT-5.1 Codex Mini', pricing: { input: 0.25, output: 2.0 }, supportsImages: false },
			// GPT-5 series
			{ value: 'gpt-5-pro', label: 'GPT-5 Pro', pricing: { input: 15.0, output: 120.0 }, supportsImages: true },
			{ value: 'gpt-5', label: 'GPT-5', pricing: { input: 1.25, output: 10.0 }, supportsImages: true },
			{ value: 'gpt-5-mini', label: 'GPT-5 Mini', pricing: { input: 0.25, output: 2.0 }, supportsImages: true },
			{ value: 'gpt-5-nano', label: 'GPT-5 Nano', pricing: { input: 0.05, output: 0.4 }, supportsImages: true },
			{ value: 'gpt-5-codex', label: 'GPT-5 Codex', pricing: { input: 1.25, output: 10.0 }, supportsImages: false },
			{ value: 'codex-mini-latest', label: 'Codex Mini', pricing: { input: 1.5, output: 6.0 }, supportsImages: false },
			// GPT-4.1 series
			{ value: 'gpt-4.1', label: 'GPT-4.1', pricing: { input: 2.0, output: 8.0 }, supportsImages: true },
			{ value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', pricing: { input: 0.4, output: 1.6 }, supportsImages: true },
			{ value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', pricing: { input: 0.1, output: 0.4 }, supportsImages: true },
			// GPT-4o series
			{ value: 'gpt-4o', label: 'GPT-4o', pricing: { input: 2.5, output: 10.0 }, supportsImages: true },
			{ value: 'gpt-4o-mini', label: 'GPT-4o Mini', pricing: { input: 0.15, output: 0.6 }, supportsImages: true },
			// O-series reasoning models
			{ value: 'o1', label: 'o1', pricing: { input: 15.0, output: 60.0 }, supportsImages: true },
			{ value: 'o1-pro', label: 'o1-pro', pricing: { input: 150.0, output: 600.0 }, supportsImages: true },
			{ value: 'o1-mini', label: 'o1-mini', pricing: { input: 1.1, output: 4.4 }, supportsImages: true },
			{ value: 'o3-pro', label: 'o3-pro', pricing: { input: 20.0, output: 80.0 }, supportsImages: true },
			{ value: 'o3', label: 'o3', pricing: { input: 2.0, output: 8.0 }, supportsImages: true },
			{ value: 'o3-mini', label: 'o3-mini', pricing: { input: 1.1, output: 4.4 }, supportsImages: true },
			{ value: 'o4-mini', label: 'o4-mini', pricing: { input: 1.1, output: 4.4 }, supportsImages: true }
		]
	},
	anthropic: {
		value: 'anthropic',
		label: 'Anthropic',
		apiKeyUrl: 'https://console.anthropic.com/settings/keys',
		models: [
			// Claude 4.5 series (latest, late 2025)
			{ value: 'claude-opus-4-5', label: 'Claude 4.5 Opus', pricing: { input: 5.0, output: 25.0 }, supportsImages: true },
			{ value: 'claude-sonnet-4-5', label: 'Claude 4.5 Sonnet', pricing: { input: 3.0, output: 15.0 }, supportsImages: true },
			{ value: 'claude-haiku-4-5', label: 'Claude 4.5 Haiku', pricing: { input: 0.8, output: 4.0 }, supportsImages: true },
			// Claude 4.1 series
			{ value: 'claude-opus-4-1', label: 'Claude 4.1 Opus', pricing: { input: 5.0, output: 25.0 }, supportsImages: true },
			// Claude 4 series (May 2025)
			{ value: 'claude-sonnet-4-0', label: 'Claude Sonnet 4', pricing: { input: 3.0, output: 15.0 }, supportsImages: true },
			{ value: 'claude-opus-4-0', label: 'Claude Opus 4', pricing: { input: 15.0, output: 75.0 }, supportsImages: true },
			// Claude 3.5 series (still available)
			{ value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet', pricing: { input: 3.0, output: 15.0 }, supportsImages: true },
			{ value: 'claude-3-haiku-20240307', label: 'Claude 3.5 Haiku', pricing: { input: 0.8, output: 4.0 }, supportsImages: true }
		]
	},
	google: {
		value: 'google',
		label: 'Google',
		apiKeyUrl: 'https://aistudio.google.com/apikey',
		models: [
			// Gemini 3 series (preview, December 2025)
			{ value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', pricing: { input: 2.0, output: 12.0 }, supportsImages: true },
			{ value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', pricing: { input: 0.3, output: 2.5 }, supportsImages: true },
			// Gemini 2.5 series
			{ value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', pricing: { input: 1.25, output: 10.0 }, supportsImages: true },
			{ value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', pricing: { input: 0.15, output: 0.6 }, supportsImages: true },
			{ value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', pricing: { input: 0.1, output: 0.4 }, supportsImages: true },
			// Gemini 2.0 series
			{ value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', pricing: { input: 0.1, output: 0.4 }, supportsImages: true },
			{ value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', pricing: { input: 0.075, output: 0.3 }, supportsImages: true }
		]
	},
	xai: {
		value: 'xai',
		label: 'xAI (Grok)',
		apiKeyUrl: 'https://console.x.ai/',
		models: [
			// Grok 4 series (latest)
			{ value: 'grok-4', label: 'Grok 4', pricing: { input: 3.0, output: 15.0 }, supportsImages: true },
			{ value: 'grok-4-1-fast', label: 'Grok 4.1 Fast', pricing: { input: 0.2, output: 0.5 }, supportsImages: true },
			{ value: 'grok-4-fast', label: 'Grok 4 Fast', pricing: { input: 0.2, output: 0.5 }, supportsImages: true },
			{ value: 'grok-code-fast-1', label: 'Grok Code Fast', pricing: { input: 0.2, output: 1.5 }, supportsImages: false },
			// Grok 3 series
			{ value: 'grok-3', label: 'Grok 3', pricing: { input: 3.0, output: 15.0 }, supportsImages: true },
			{ value: 'grok-3-mini', label: 'Grok 3 Mini', pricing: { input: 0.3, output: 0.5 }, supportsImages: true },
			// Image generation
			{ value: 'grok-2-image-1212', label: 'Grok 2 Image', pricing: { input: 0, output: 0.07 }, supportsImages: true }
		]
	},
	openrouter: {
		value: 'openrouter',
		label: 'OpenRouter',
		apiKeyUrl: 'https://openrouter.ai/settings/keys',
		models: [
			// DeepSeek (most popular on OpenRouter)
			{ value: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3', pricing: { input: 0.27, output: 1.1 }, supportsImages: false },
			{ value: 'deepseek/deepseek-r1', label: 'DeepSeek R1', pricing: { input: 0.55, output: 2.19 }, supportsImages: false },
			// Qwen (2nd most popular)
			{ value: 'qwen/qwen-3-235b-a22b', label: 'Qwen 3 235B', pricing: { input: 0.14, output: 0.14 }, supportsImages: false },
			{ value: 'qwen/qwq-32b', label: 'QwQ 32B', pricing: { input: 0.12, output: 0.18 }, supportsImages: false },
			{ value: 'qwen/qwen3-coder-480b-a35b', label: 'Qwen3 Coder 480B', pricing: { input: 0.22, output: 0.95 }, supportsImages: false },
			// Llama (3rd most popular)
			{ value: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', pricing: { input: 0.08, output: 0.3 }, supportsImages: true },
			{ value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', pricing: { input: 0.1, output: 0.1 }, supportsImages: false },
			// Mistral
			{ value: 'mistralai/mistral-large-2411', label: 'Mistral Large', pricing: { input: 2.0, output: 6.0 }, supportsImages: true },
			{ value: 'mistralai/mistral-small-3', label: 'Mistral Small 3', pricing: { input: 0.15, output: 0.15 }, supportsImages: false },
			{ value: 'mistralai/codestral-2501', label: 'Codestral', pricing: { input: 0.3, output: 0.9 }, supportsImages: false }
		]
	},
	custom: {
		value: 'custom',
		label: 'Custom',
		models: [{ value: 'custom', label: 'Custom Model', pricing: { input: 0, output: 0 }, supportsImages: true }]
	}
} as const;

export function providerLabel(s: providersKey) {
	return providers[s].label;
}

export function calculateCost(model: Model, inputTokens?: number, outputTokens?: number) {
	const inputCost = ((inputTokens ?? 0) / 1_000_000) * model.pricing.input;
	const outputCost = ((outputTokens ?? 0) / 1_000_000) * model.pricing.output;
	return inputCost + outputCost;
}
