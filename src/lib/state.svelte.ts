import { browser } from "$app/environment";
import { PROVIDERS, type Model } from "./models";

// Constants for defaults
export const DEFAULT_ASCII_WIDTH = 80;
export const DEFAULT_ASCII_HEIGHT = 40;
export const DEFAULT_INITIAL_TEMPLATE = `You are an expert SVG artist.
First, think about the request:
1. Rephrase the prompt in your own words.
2. Visualize and describe the graphics in detail, including the composition of elements.
3. Finally, generate the SVG code.

Target dimensions: {{width}}x{{height}}

Start the SVG code with:
\`\`\`
<svg width="{{width}}" height="{{height}}" viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">

The user wants: {{prompt}}.`;

export const DEFAULT_REFINEMENT_TEMPLATE = `Carefully analyze the previous image and make SIGNIFICANT improvements.
First, think about the improvements:
1. Identify errors or mistakes in the previous version.
2. Describe how to improve visual quality, composition, and details.
3. Finally, generate the improved SVG code.

Target dimensions: {{width}}x{{height}}

Start the SVG code with:
\`\`\`
<svg width="{{width}}" height="{{height}}" viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">

Focus on:
1. **Fixing errors**
2. **Improving visual quality**
3. **Enhancing composition**
4. **Adding refinement**

The user wants: {{prompt}}.`;

export const DEFAULT_ASCII_INITIAL_TEMPLATE = `You are an expert ASCII artist.
First, think about the request:
1. Rephrase the prompt in your own words.
2. Visualize how to represent this using ASCII characters.
3. Finally, generate the ASCII art.

Target dimensions: {{width}} characters wide by {{height}} lines tall

IMPORTANT: Output ONLY the ASCII art. Do not include any explanations or conversational text.
Use a variety of characters to create depth and detail: @#%*+=:-.

The user wants: {{prompt}}.`;

export const DEFAULT_ASCII_REFINEMENT_TEMPLATE = `Carefully analyze the previous ASCII art and make SIGNIFICANT improvements.
First, think about the improvements:
1. Identify errors or mistakes in the previous version.
2. Describe how to improve the visual representation using ASCII characters.
3. Finally, generate the improved ASCII art.

Target dimensions: {{width}} characters wide by {{height}} lines tall

Focus on:
1. **Fixing errors**
2. **Improving character selection for better depth**
3. **Enhancing composition and proportions**
4. **Adding more detail**

IMPORTANT: Output ONLY the ASCII art. Do not include any explanations or conversational text.

The user wants: {{prompt}}.`;

class AppState {
  // Model Settings
  provider = $state("anthropic");
  model = $state("claude-3-5-sonnet-20241022");
  customModelId = $state("");
  endpoint = $state("");
  apiKey = $state("");
  showApiKey = $state(false);

  // Output Settings
  outputFormat = $state("svg");
  width = $state(800);
  height = $state(600);
  asciiWidth = $state(DEFAULT_ASCII_WIDTH);
  asciiHeight = $state(DEFAULT_ASCII_HEIGHT);
  aspectRatio = $state("4:3");
  maxStepsArray = $state([5]);
  sendFullHistory = $state(true);

  // Templates
  initialTemplate = $state(DEFAULT_INITIAL_TEMPLATE);
  refinementTemplate = $state(DEFAULT_REFINEMENT_TEMPLATE);
  asciiInitialTemplate = $state(DEFAULT_ASCII_INITIAL_TEMPLATE);
  asciiRefinementTemplate = $state(DEFAULT_ASCII_REFINEMENT_TEMPLATE);
  promptTemplatesOpen = $state(false);

  // Generation State
  prompt = $state("Pelican riding a bicycle");
  isGenerating = $state(false);
  generatedImage: string | null = $state(null);
  history: string[] = $state([]);
  rawOutputs: string[] = $state([]);
  currentProjectId: number | null = $state(null);
  referenceImageFile: File | null = $state(null);

  // Cost Tracking
  totalCost = $state(0);
  lastGenerationCost = $state(0);
  sessionInputTokens = $state(0);
  sessionOutputTokens = $state(0);
  generationCosts: Array<{
    step: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }> = $state([]);

  // Derived
  maxSteps = $derived(this.maxStepsArray[0]);
  providerLabel = $derived(PROVIDERS[this.provider]?.label || "Custom");

  constructor() {
    if (browser) {
      this.loadSettings();
    }
  }

  loadSettings() {
    // API Key
    const savedKey = localStorage.getItem(`apikey_${this.provider}`);
    if (savedKey) this.apiKey = savedKey;

    // General Settings
    const savedSettings = localStorage.getItem("pelican_settings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.provider) this.provider = settings.provider;
        if (settings.model) this.model = settings.model;
        if (settings.customModelId) this.customModelId = settings.customModelId;
        if (settings.endpoint) this.endpoint = settings.endpoint;
        if (settings.outputFormat) this.outputFormat = settings.outputFormat;
        if (settings.width) this.width = settings.width;
        if (settings.height) this.height = settings.height;
        if (settings.asciiWidth) this.asciiWidth = settings.asciiWidth;
        if (settings.asciiHeight) this.asciiHeight = settings.asciiHeight;
        if (settings.maxStepsArray) this.maxStepsArray = settings.maxStepsArray;
        if (settings.sendFullHistory !== undefined)
          this.sendFullHistory = settings.sendFullHistory;
        if (settings.initialTemplate)
          this.initialTemplate = settings.initialTemplate;
        if (settings.refinementTemplate)
          this.refinementTemplate = settings.refinementTemplate;
        if (settings.asciiInitialTemplate)
          this.asciiInitialTemplate = settings.asciiInitialTemplate;
        if (settings.asciiRefinementTemplate)
          this.asciiRefinementTemplate = settings.asciiRefinementTemplate;
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }

    // Last Prompt
    const savedPrompt = localStorage.getItem("pelican_last_prompt");
    if (savedPrompt) this.prompt = savedPrompt;
  }

  saveSettings() {
    if (!browser) return;

    const settings = {
      provider: this.provider,
      model: this.model,
      customModelId: this.customModelId,
      endpoint: this.endpoint,
      outputFormat: this.outputFormat,
      width: this.width,
      height: this.height,
      asciiWidth: this.asciiWidth,
      asciiHeight: this.asciiHeight,
      maxStepsArray: this.maxStepsArray,
      sendFullHistory: this.sendFullHistory,
      initialTemplate: this.initialTemplate,
      refinementTemplate: this.refinementTemplate,
      asciiInitialTemplate: this.asciiInitialTemplate,
      asciiRefinementTemplate: this.asciiRefinementTemplate,
    };
    localStorage.setItem("pelican_settings", JSON.stringify(settings));
    localStorage.setItem("pelican_last_prompt", this.prompt);

    if (this.apiKey) {
      localStorage.setItem(`apikey_${this.provider}`, this.apiKey);
    }
  }

  updateDimensions(ratio: string) {
    this.aspectRatio = ratio;
    if (ratio === "1:1") {
      this.width = 800;
      this.height = 800;
    } else if (ratio === "4:3") {
      this.width = 800;
      this.height = 600;
    } else if (ratio === "16:9") {
      this.width = 960;
      this.height = 540;
    } else if (ratio === "3:4") {
      this.width = 600;
      this.height = 800;
    } else if (ratio === "9:16") {
      this.width = 540;
      this.height = 960;
    }
    this.saveSettings();
  }

  clearCurrentApiKey() {
    if (!browser) return;
    localStorage.removeItem(`apikey_${this.provider}`);
    this.apiKey = "";
  }

  clearAllApiKeys() {
    if (!browser) return;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("apikey_")) {
        localStorage.removeItem(key);
      }
    });
    this.apiKey = "";
    alert("All API keys cleared from local storage.");
  }

  addGenerationCost(
    step: number,
    inputTokens: number,
    outputTokens: number,
    cost: number,
  ) {
    this.generationCosts.push({ step, inputTokens, outputTokens, cost });
    this.sessionInputTokens += inputTokens;
    this.sessionOutputTokens += outputTokens;
    this.lastGenerationCost = cost;
    this.totalCost += cost;
  }

  resetCostTracking() {
    this.totalCost = 0;
    this.lastGenerationCost = 0;
    this.sessionInputTokens = 0;
    this.sessionOutputTokens = 0;
    this.generationCosts = [];
  }

  startNewGeneration() {
    this.lastGenerationCost = 0;
    this.generationCosts = [];
  }
}

export const appState = new AppState();
