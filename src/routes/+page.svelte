<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import { Slider } from "$lib/components/ui/slider";
  import { Switch } from "$lib/components/ui/switch";
  import { Separator } from "$lib/components/ui/separator";
  import * as Tabs from "$lib/components/ui/tabs";
  import PromptEditor from "$lib/components/PromptEditor.svelte";
  import { Upload, Image as ImageIcon, Wand2, Download, Copy } from "@lucide/svelte";

  let prompt = $state("");
  let outputFormat = $state("svg");
  let isColor = $state(true);

  // Model settings
  let provider = $state("openai");
  let model = $state("gpt-4o");
  let endpoint = $state("");
  let apiKey = $state("");

  const models = {
    openai: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "o3-mini", label: "o3-mini" },
      { value: "o3-pro", label: "o3-pro" },
      { value: "gpt-5.1-instant", label: "GPT-5.1 Instant" },
      { value: "gpt-5.1-thinking", label: "GPT-5.1 Thinking" },
    ],
    anthropic: [
      { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
      { value: "claude-opus-4.5", label: "Claude Opus 4.5" },
    ],
    google: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-3-pro", label: "Gemini 3 Pro" },
    ],
    xai: [
      { value: "grok-beta", label: "Grok Beta" },
      { value: "grok-4.1", label: "Grok 4.1" },
      { value: "grok-4.1-fast", label: "Grok 4.1 Fast" },
    ],
    openrouter: [
      { value: "openai/gpt-4o", label: "GPT-4o" },
      { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
      { value: "deepseek/deepseek-coder", label: "DeepSeek Coder" },
      { value: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B" },
    ],
    custom: [
      { value: "custom", label: "Custom" },
    ]
  };

  const providerLabel = $derived(
    provider === 'openai' ? 'OpenAI' :
    provider === 'anthropic' ? 'Anthropic' :
    provider === 'google' ? 'Google' :
    provider === 'xai' ? 'xAI (Grok)' :
    provider === 'openrouter' ? 'OpenRouter' :
    'Custom'
  );

  // Templates
  let initialTemplate = $state("Create a {{format}} art of {{prompt}}. Make it {{color}}.");
  let refinementTemplate = $state("Refine the previous image. The user wants: {{prompt}}.");

  let generatedImage: string | null = $state(null);
  let history: string[] = $state([]);
  let isGenerating = $state(false);

  function handleGenerate() {
    isGenerating = true;
    history = [];
    generatedImage = null;

    // Mock progressive generation
    let step = 0;
    const maxSteps = 4;

    const interval = setInterval(() => {
      step++;
      const newImage = `https://placehold.co/600x400/png?text=Step+${step}`;
      history = [...history, newImage];
      generatedImage = newImage;

      if (step >= maxSteps) {
        clearInterval(interval);
        isGenerating = false;
      }
    }, 1500);
  }

  const formatLabel = $derived(outputFormat === 'svg' ? 'SVG Vector' : 'ASCII Art');
</script>

<div class="min-h-screen bg-background p-8 font-sans">
  <div class="mx-auto max-w-6xl space-y-8">
    <header class="flex items-center justify-between pb-6 border-b border-border">
      <div class="space-y-1">
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">ArtConverter</h1>
        <p class="text-muted-foreground">Transform your ideas into SVG or ASCII art.</p>
      </div>
      <Button variant="outline" size="icon">
        <div class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"></div>
        <span class="sr-only">Toggle theme</span>
      </Button>
    </header>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <!-- Controls -->
      <div class="lg:col-span-4 space-y-6">
        <Card class="border-border/50 shadow-lg">
          <CardHeader class="pb-4">
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Customize your generation settings.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <Tabs.Root value="generation" class="w-full">
              <Tabs.List class="grid w-full grid-cols-3 mb-4">
                <Tabs.Trigger value="generation">Gen</Tabs.Trigger>
                <Tabs.Trigger value="model">Model</Tabs.Trigger>
                <Tabs.Trigger value="templates">Prompt</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="generation" class="space-y-6">
                <div class="space-y-2">
                  <Label for="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe what you want to see..."
                    class="min-h-[100px] resize-none"
                    bind:value={prompt}
                  />
                </div>

                <div class="space-y-2">
                  <Label>Reference Image</Label>
                  <div class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 relative">
                    <Upload class="h-8 w-8 text-muted-foreground" />
                    <p class="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                    <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                <Separator />

                <div class="space-y-4">
                  <div class="space-y-2">
                    <Label>Output Format</Label>
                    <Select type="single" bind:value={outputFormat}>
                      <SelectTrigger>
                        {formatLabel}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="svg">SVG Vector</SelectItem>
                        <SelectItem value="ascii">ASCII Art</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div class="flex items-center justify-between">
                    <Label for="color-mode">Color Output</Label>
                    <Switch id="color-mode" bind:checked={isColor} />
                  </div>
                </div>
              </Tabs.Content>

              <Tabs.Content value="model" class="space-y-4">
                <div class="space-y-2">
                  <Label for="provider-select">Provider</Label>
                  <Select type="single" bind:value={provider} onValueChange={() => model = models[provider as keyof typeof models][0].value}>
                    <SelectTrigger>
                      {providerLabel}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="xai">xAI (Grok)</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="custom">Custom (OpenAI Compatible)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <Label for="model-select">Model</Label>
                  {#if provider === 'custom'}
                     <Input id="model-select" bind:value={model} placeholder="Model ID (e.g. my-custom-model)" />
                  {:else}
                    <Select type="single" bind:value={model}>
                      <SelectTrigger>
                        {model}
                      </SelectTrigger>
                      <SelectContent>
                        {#each models[provider as keyof typeof models] as modelOption}
                          <SelectItem value={modelOption.value}>{modelOption.label}</SelectItem>
                        {/each}
                      </SelectContent>
                    </Select>
                  {/if}
                </div>

                {#if provider === 'custom'}
                  <div class="space-y-2">
                    <Label for="endpoint">API Endpoint</Label>
                    <Input id="endpoint" bind:value={endpoint} placeholder="https://api.openai.com/v1" />
                  </div>
                {/if}

                <div class="space-y-2">
                  <Label for="api-key">API Key</Label>
                  <Input id="api-key" type="password" bind:value={apiKey} placeholder="sk-..." />
                </div>
              </Tabs.Content>

              <Tabs.Content value="templates" class="space-y-4">
                <div class="space-y-2">
                  <Label for="initial-template">Initial Prompt Template</Label>
                  <PromptEditor
                    bind:value={initialTemplate}
                    requiredVariables={['prompt', 'format', 'color']}
                  />
                </div>

                <div class="space-y-2">
                  <Label for="refinement-template">Refinement Prompt Template</Label>
                  <PromptEditor
                    bind:value={refinementTemplate}
                    requiredVariables={['prompt']}
                  />
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </CardContent>
          <CardFooter>
            <Button class="w-full" size="lg" onclick={handleGenerate} disabled={isGenerating}>
              {#if isGenerating}
                <Wand2 class="mr-2 h-4 w-4 animate-spin" />
                Generating...
              {:else}
                <Wand2 class="mr-2 h-4 w-4" />
                Generate Art
              {/if}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <!-- Preview -->
      <div class="lg:col-span-8">
        <Card class="h-full border-border/50 shadow-lg flex flex-col">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Your generated artwork will appear here.</CardDescription>
          </CardHeader>
          <CardContent class="flex-1 flex flex-col min-h-[400px] gap-4">
            <div class="flex-1 flex items-center justify-center bg-muted/20 rounded-md border border-border/50 relative overflow-hidden">
              {#if generatedImage}
                <img src={generatedImage} alt="Generated Art" class="max-w-full max-h-full object-contain shadow-2xl" />
              {:else}
                <div class="text-center space-y-2 text-muted-foreground/50">
                  <ImageIcon class="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>No image generated yet</p>
                </div>
              {/if}
            </div>

            {#if history.length > 0}
              <div class="h-24 flex gap-2 overflow-x-auto pb-2">
                 {#each history as item, i}
                   <button
                     class="relative aspect-square h-full rounded-md border overflow-hidden transition-all hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary {generatedImage === item ? 'ring-2 ring-primary' : 'border-border/50'}"
                     onclick={() => generatedImage = item}
                   >
                     <img src={item} alt="Version {i + 1}" class="h-full w-full object-cover" />
                     <span class="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-1">v{i + 1}</span>
                   </button>
                 {/each}
              </div>
            {/if}
          </CardContent>
          {#if generatedImage}
            <CardFooter class="justify-between gap-2 border-t border-border p-4 bg-muted/10">
               <div class="text-xs text-muted-foreground">
                 {#if isGenerating}
                    Refining... (Step {history.length + 1})
                 {:else}
                    Generation complete
                 {/if}
               </div>
               <div class="flex gap-2">
                <Button variant="outline" size="sm">
                    <Copy class="mr-2 h-4 w-4" />
                    Copy
                </Button>
                <Button size="sm">
                    <Download class="mr-2 h-4 w-4" />
                    Download
                </Button>
               </div>
            </CardFooter>
          {/if}
        </Card>
      </div>
    </div>
  </div>
</div>
