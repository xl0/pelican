import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";

export function getModel(
  provider: string,
  modelId: string,
  apiKey: string,
  endpoint?: string,
) {
  switch (provider) {
    case "openai":
      const openai = createOpenAI({ apiKey }); // OpenAI SDK handles browser usage automatically in recent versions or requires explicit opt-in via other means if needed.
      // Actually, for Vercel AI SDK, `dangerouslyAllowBrowser` is not a property of `createOpenAI` settings directly in some versions,
      // but it is often needed. Let's check if we can pass it or if it's implicit.
      // If it errors, we might need to cast it or it's not supported there.
      // The error says it doesn't exist. Let's remove it and see if it works, or cast to any.
      // It seems `dangerouslyAllowBrowser` is for the `OpenAI` class constructor in the official SDK, not necessarily the Vercel wrapper.
      // However, Vercel AI SDK usually works in browser.
      return openai(modelId);
    case "anthropic":
      const anthropic = createAnthropic({
        apiKey,
        headers: {
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });
      return anthropic(modelId);
    case "google":
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    case "xai":
      const xai = createXai({ apiKey });
      return xai(modelId);
    case "openrouter":
      const openrouter = createOpenAICompatible({
        name: "openrouter",
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });
      return openrouter(modelId);
    case "custom":
      if (!endpoint) throw new Error("Endpoint required for custom provider");
      const custom = createOpenAICompatible({
        name: "custom",
        apiKey,
        baseURL: endpoint,
      });
      return custom(modelId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Check if a model supports image input based on provider and model ID
 * Note: This is based on known capabilities and may not be exhaustive
 */
export function supportsImageInput(provider: string, modelId: string): boolean {
  switch (provider) {
    case "openai":
      // GPT-4o, GPT-4 Turbo with Vision, o1, o3 models support images
      return (
        modelId.includes("gpt-4o") ||
        modelId.includes("gpt-4-turbo") ||
        modelId.includes("gpt-4-vision") ||
        modelId.startsWith("o1") ||
        modelId.startsWith("o3") ||
        modelId.includes("gpt-5")
      );

    case "anthropic":
      // All Claude 3+ models support images
      return (
        modelId.includes("claude-3") ||
        modelId.includes("claude-4") ||
        modelId.includes("claude-opus") ||
        modelId.includes("claude-sonnet") ||
        modelId.includes("claude-haiku")
      );

    case "google":
      // Gemini models support images
      return modelId.includes("gemini");

    case "xai":
      // Grok models support images
      return modelId.includes("grok");

    case "openrouter":
      // Check the underlying model - most vision models have "vision" in the name
      // or are known multimodal models
      return (
        modelId.includes("vision") ||
        modelId.includes("gpt-4o") ||
        modelId.includes("claude-3") ||
        modelId.includes("claude-4") ||
        modelId.includes("gemini")
      );

    case "custom":
      // For custom endpoints, we can't know for sure
      // Default to true and let the user handle errors
      return true;

    default:
      return false;
  }
}
