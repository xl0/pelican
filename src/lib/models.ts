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
  models: Model[];
}

export const PROVIDERS: Record<string, Provider> = {
  openai: {
    value: "openai",
    label: "OpenAI",
    models: [
      {
        value: "gpt-4o",
        label: "GPT-4o",
        pricing: { input: 2.5, output: 10.0 },
        supportsImages: true,
      },
      {
        value: "o3-mini",
        label: "o3-mini",
        pricing: { input: 1.1, output: 4.4 },
        supportsImages: true,
      },
      {
        value: "gpt-4o-mini",
        label: "GPT-4o Mini",
        pricing: { input: 0.15, output: 0.6 },
        supportsImages: true,
      },
      // Placeholder pricing for unreleased/beta models
      {
        value: "gpt-5.1-instant",
        label: "GPT-5.1 Instant",
        pricing: { input: 5.0, output: 20.0 },
        supportsImages: true,
      },
      {
        value: "gpt-5.1-thinking",
        label: "GPT-5.1 Thinking",
        pricing: { input: 10.0, output: 40.0 },
        supportsImages: true,
      },
    ],
  },
  anthropic: {
    value: "anthropic",
    label: "Anthropic",
    models: [
      {
        value: "claude-3-5-sonnet-20241022",
        label: "Claude 3.5 Sonnet",
        pricing: { input: 3.0, output: 15.0 },
        supportsImages: true,
      },
      {
        value: "claude-3-5-haiku-latest",
        label: "Claude 3.5 Haiku",
        pricing: { input: 0.8, output: 4.0 },
        supportsImages: true,
      },
      {
        value: "claude-3-opus-20240229",
        label: "Claude 3 Opus",
        pricing: { input: 15.0, output: 75.0 },
        supportsImages: true,
      },
      {
        value: "claude-3-sonnet-20240229",
        label: "Claude 3 Sonnet",
        pricing: { input: 3.0, output: 15.0 },
        supportsImages: true,
      },
      {
        value: "claude-3-haiku-20240307",
        label: "Claude 3 Haiku",
        pricing: { input: 0.25, output: 1.25 },
        supportsImages: true,
      },
      // Future models
      {
        value: "claude-opus-4-5",
        label: "Claude 4.5 Opus",
        pricing: { input: 20.0, output: 100.0 },
        supportsImages: true,
      },
      {
        value: "claude-sonnet-4-5",
        label: "Claude 4.5 Sonnet",
        pricing: { input: 6.0, output: 30.0 },
        supportsImages: true,
      },
      {
        value: "claude-haiku-4-5",
        label: "Claude 4.5 Haiku",
        pricing: { input: 1.5, output: 7.5 },
        supportsImages: true,
      },
    ],
  },
  google: {
    value: "google",
    label: "Google",
    models: [
      {
        value: "gemini-1.5-pro",
        label: "Gemini 1.5 Pro",
        pricing: { input: 1.25, output: 5.0 },
        supportsImages: true,
      },
      {
        value: "gemini-1.5-flash",
        label: "Gemini 1.5 Flash",
        pricing: { input: 0.075, output: 0.3 },
        supportsImages: true,
      },
      // Future models
      {
        value: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash",
        pricing: { input: 0.1, output: 0.4 },
        supportsImages: true,
      },
      {
        value: "gemini-3-pro",
        label: "Gemini 3 Pro",
        pricing: { input: 2.0, output: 8.0 },
        supportsImages: true,
      },
    ],
  },
  xai: {
    value: "xai",
    label: "xAI (Grok)",
    models: [
      {
        value: "grok-beta",
        label: "Grok Beta",
        pricing: { input: 5.0, output: 15.0 },
        supportsImages: true,
      },
      {
        value: "grok-vision-beta",
        label: "Grok Vision Beta",
        pricing: { input: 5.0, output: 15.0 },
        supportsImages: true,
      },
    ],
  },
  openrouter: {
    value: "openrouter",
    label: "OpenRouter",
    models: [
      {
        value: "openai/gpt-4o",
        label: "GPT-4o",
        pricing: { input: 2.5, output: 10.0 },
        supportsImages: true,
      },
      {
        value: "anthropic/claude-3.5-sonnet",
        label: "Claude 3.5 Sonnet",
        pricing: { input: 3.0, output: 15.0 },
        supportsImages: true,
      },
      {
        value: "google/gemini-pro-1.5",
        label: "Gemini Pro 1.5",
        pricing: { input: 1.25, output: 5.0 },
        supportsImages: true,
      },
      {
        value: "deepseek/deepseek-coder",
        label: "DeepSeek Coder",
        pricing: { input: 0.14, output: 0.28 },
        supportsImages: false,
      },
      {
        value: "meta-llama/llama-3.1-70b-instruct",
        label: "Llama 3.1 70B",
        pricing: { input: 0.35, output: 0.4 },
        supportsImages: false,
      },
    ],
  },
  custom: {
    value: "custom",
    label: "Custom",
    models: [
      {
        value: "custom",
        label: "Custom Model",
        pricing: { input: 0, output: 0 },
        supportsImages: true,
      },
    ],
  },
};

export function getModelInfo(
  provider: string,
  modelValue: string,
): Model | undefined {
  const providerData = PROVIDERS[provider];
  if (!providerData) return undefined;

  if (provider === "custom") {
    return {
      value: modelValue,
      label: modelValue,
      pricing: { input: 0, output: 0 },
      supportsImages: true,
    };
  }

  return providerData.models.find((m) => m.value === modelValue);
}

export function calculateCost(
  model: Model,
  inputTokens: number,
  outputTokens: number,
): number {
  const inputCost = (inputTokens / 1_000_000) * model.pricing.input;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.output;
  return inputCost + outputCost;
}
