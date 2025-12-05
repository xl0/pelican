<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Switch } from "$lib/components/ui/switch";
  import { Separator } from "$lib/components/ui/separator";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import PromptEditor from "$lib/components/PromptEditor.svelte";
  import ModelSettings from "$lib/components/ModelSettings.svelte";
  import OutputSettings from "$lib/components/OutputSettings.svelte";
  import CostDisplay from "$lib/components/CostDisplay.svelte";
  import { Image as ImageIcon, Wand2, Download, Copy, AlertCircle, ImagePlus } from "@lucide/svelte";

  import { getModel } from "$lib/ai";
  import { generateText, streamText } from "ai";
  import { onMount } from "svelte";
  import DOMPurify from "dompurify";
  import { getModelInfo, calculateCost } from "$lib/models";

  import {
    appState,
    DEFAULT_INITIAL_TEMPLATE,
    DEFAULT_REFINEMENT_TEMPLATE,
    DEFAULT_ASCII_INITIAL_TEMPLATE,
    DEFAULT_ASCII_REFINEMENT_TEMPLATE
  } from "$lib/state.svelte";

  // Raw output viewing
  let showRawOutput = $state(false);
  let currentRawOutput = $state("");

  // Helper to convert SVG string to PNG base64
  function svgToPngBase64(svgString: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800; // Standardize size
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };

      img.src = url;
    });
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      appState.referenceImageFile = input.files[0];
    }
  }



  async function handleGenerate() {
    if (!appState.apiKey) {
      alert("Please enter an API key");
      return;
    }

    if (appState.model === 'custom' && !appState.customModelId) {
      alert("Please enter a custom model ID");
      return;
    }

    const effectiveModel = appState.model === 'custom' ? appState.customModelId : appState.model;

    // Get model info for cost calculation
    const modelInfo = getModelInfo(appState.provider, effectiveModel);

    appState.isGenerating = true;
    appState.startNewGeneration(); // Reset per-generation cost tracking

    try {
      // 1. Create Project if not exists
      if (!appState.currentProjectId) {
        const res = await fetch('/api/projects', {
          method: 'POST',
          body: JSON.stringify({
            name: `Project ${new Date().toLocaleString()}`,
            prompt: appState.prompt,
            outputFormat: appState.outputFormat as 'svg' | 'ascii',
            isColor: true,
            width: appState.width,
            height: appState.height
          }),
        });
        const project = await res.json();
        appState.currentProjectId = project.id;
      }

      // 2. Save Reference Image if present (only once)
      let referenceImageBase64 = "";
      if (appState.referenceImageFile && appState.history.length === 0) {
        const reader = new FileReader();
        reader.readAsDataURL(appState.referenceImageFile);
        await new Promise((resolve) => {
          reader.onload = async () => {
            referenceImageBase64 = (reader.result as string).split(',')[1];
            const extension = appState.referenceImageFile!.name.split('.').pop() || 'png';

            await fetch('/api/artifacts/reference', {
              method: 'POST',
              body: JSON.stringify({
                projectId: appState.currentProjectId!,
                data: referenceImageBase64,
                extension,
              }),
            });
            resolve(null);
          };
        });
      }

      // Let's clear history if it's a new run.
      appState.history = [];
      appState.rawOutputs = [];
      appState.generatedImage = null;
      let lastContent = "";

      // Initialize conversation history
      const messages: any[] = [];

      // System prompt to enforce output format
      const systemPrompt = appState.outputFormat === 'svg'
        ? `You are an expert SVG artist. You should first think about the design and describe it, then provide the SVG code in a markdown code block starting with \`\`\`xml or \`\`\`svg. The SVG MUST have width="${appState.width}" height="${appState.height}" and viewBox="0 0 ${appState.width} ${appState.height}".`
        : `You are an expert ASCII artist. You must generate ASCII art for the requested image. The output should fit within a ${appState.asciiWidth}x${appState.asciiHeight} character grid. Do not include any conversational text or explanations. Return ONLY the ASCII art.`;

      messages.push({ role: 'system', content: systemPrompt });

      for (let step = 1; step <= appState.maxSteps; step++) {
        const isRefinement = step > 1;

        // Select template based on output format
        const currentTemplate = appState.outputFormat === 'svg'
          ? (isRefinement ? appState.refinementTemplate : appState.initialTemplate)
          : (isRefinement ? appState.asciiRefinementTemplate : appState.asciiInitialTemplate);

        // Prepare prompt text
        let promptText = currentTemplate
          .replace('{{prompt}}', appState.prompt)
          .replace('{{format}}', appState.outputFormat === 'svg' ? 'SVG vector' : 'ASCII')
          .replace(/{{width}}/g, (appState.outputFormat === 'svg' ? appState.width : appState.asciiWidth).toString())
          .replace(/{{height}}/g, (appState.outputFormat === 'svg' ? appState.height : appState.asciiHeight).toString());

        promptText += appState.outputFormat === 'svg'
          ? ""
          : `\n\nIMPORTANT: Output ONLY the ASCII art. Target size: ${appState.asciiWidth} characters wide by ${appState.asciiHeight} lines tall.`;

        const userContent: any[] = [{ type: 'text', text: promptText }];

        // Add inputs
        if (isRefinement) {
          // Add rendered image of previous step
          let previousImageBase64 = "";
          let renderError = "";

          try {
            if (appState.outputFormat === 'svg') {
               previousImageBase64 = await svgToPngBase64(lastContent);
            } else {
               // For ASCII, render as SVG text elements (not foreignObject to avoid canvas tainting)
               const lines = lastContent.split('\n');
               const textElements = lines.map((line, i) =>
                 `<text x="10" y="${20 + i * 14}" font-family="monospace" font-size="12" fill="black">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')}</text>`
               ).join('\n');

               const wrapperWidth = appState.asciiWidth * 10;
               const wrapperHeight = appState.asciiHeight * 16;

               const svgWrapper = `<svg xmlns="http://www.w3.org/2000/svg" width="${wrapperWidth}" height="${wrapperHeight}" viewBox="0 0 ${wrapperWidth} ${wrapperHeight}">
                <rect width="100%" height="100%" fill="white"/>
                ${textElements}
              </svg>`;
               previousImageBase64 = await svgToPngBase64(svgWrapper);
            }

            userContent.push({ type: 'text', text: "\n\nHere is how your previous code rendered:" });
            userContent.push({
              type: 'image',
              image: previousImageBase64
            });
          } catch (error) {
            // PNG conversion failed - tell the model about it
            renderError = (error as Error).message;

            // Try to parse SVG to get more specific error information
            let errorDetails = renderError;
            let errorContext = "";

            if (appState.outputFormat === 'svg') {
              try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(lastContent, 'image/svg+xml');
                const parserError = doc.querySelector('parsererror');

                if (parserError) {
                  const errorText = parserError.textContent || "";
                  errorDetails = errorText;

                  // Try to extract line and column information from the error message
                  // DOMParser error format varies by browser but often includes line/column info
                  const lineMatch = errorText.match(/line (\d+)/i);
                  const colMatch = errorText.match(/column (\d+)/i);

                  if (lineMatch) {
                    const lineNum = parseInt(lineMatch[1]);
                    const colNum = colMatch ? parseInt(colMatch[1]) : 0;

                    // Get context around the error
                    const lines = lastContent.split('\n');
                    const startLine = Math.max(0, lineNum - 3);
                    const endLine = Math.min(lines.length, lineNum + 2);

                    const contextLines = [];
                    for (let i = startLine; i < endLine; i++) {
                      const lineNumber = i + 1;
                      const marker = lineNumber === lineNum ? '>>> ' : '    ';
                      const colMarker = lineNumber === lineNum && colNum > 0
                        ? '\n    ' + ' '.repeat(colNum - 1) + '^--- Error here'
                        : '';
                      contextLines.push(`${marker}${lineNumber}: ${lines[i]}${colMarker}`);
                    }

                    errorContext = `\n\nError location (Line ${lineNum}, Column ${colNum}):\n\`\`\`\n${contextLines.join('\n')}\n\`\`\``;
                  }
                }
              } catch (e) {
                // If parsing fails, use the original error
              }
            }

            userContent.push({
              type: 'text',
              text: `\n\n⚠️ WARNING: The previous SVG failed to render to PNG with error: "${errorDetails}"${errorContext}\n\nThis usually means there's a syntax error in the SVG. Common issues:\n- Duplicate or conflicting attributes (e.g., two 'd' attributes on a path)\n- Invalid attribute combinations (e.g., 'y1' on a <path> instead of <line>)\n- Unclosed tags or malformed paths\n- Invalid XML syntax\n- Missing closing tags\n\nPlease review and fix the SVG code. The SVG code is in your previous message.`
            });
          }

        } else {
          // Step 1: Include reference image if exists
          if (referenceImageBase64) {
            userContent.push({
              type: 'image',
              image: referenceImageBase64,
            });
          }
        }

        // Add user message to history
        messages.push({ role: 'user', content: userContent });

        // 3. Create Generation Record
        const genRes = await fetch('/api/generations', {
          method: 'POST',
          body: JSON.stringify({
            projectId: appState.currentProjectId!,
            stepNumber: step,
            provider: appState.provider as any,
            model: effectiveModel,
            endpoint: appState.endpoint || null,
            promptTemplate: currentTemplate,
            renderedPrompt: promptText,
            artifactPath: '',
            status: 'generating',
          }),
        });
        const generation = await genRes.json();

        // 4. Client-side Generation
        const modelInstance = getModel(appState.provider, effectiveModel, appState.apiKey, appState.endpoint);

        // Create a placeholder in history for streaming updates
        const streamingIndex = appState.history.length;
        appState.history = [...appState.history, ""]; // Add empty placeholder
        appState.rawOutputs = [...appState.rawOutputs, ""]; // Add empty placeholder

        let content = "";
        let svgContent = "";

        // Prepare messages for this generation
        // If sendFullHistory is false and this is a refinement, only send system + last user message
        const messagesToSend = appState.sendFullHistory || !isRefinement
          ? messages // Send full history
          : [messages[0], messages[messages.length - 1]]; // Send only system + last user message

        // Use Promise to wait for stream completion
        await new Promise<void>((resolve, reject) => {
          const streamResult = streamText({
            model: modelInstance,
            messages: messagesToSend, // Use conditional messages
            onChunk({ chunk }) {
              if (chunk.type === 'text-delta') {
                content += chunk.text;

                // Update raw output real-time
                appState.rawOutputs[streamingIndex] = content;
                if (appState.generatedImage === appState.history[streamingIndex]) {
                    currentRawOutput = content;
                }

                // Update the streaming placeholder with partial SVG
                let partialDataUri = '';
                if (appState.outputFormat === 'svg') {
                  // Check for thinking tokens vs SVG
                  const parts = content.split(/```(?:xml|svg)?\n<svg/);

                  if (parts.length > 1) {
                    // We have an SVG block started
                    let partialSvg = '<svg' + (parts[1].split('```')[0] || parts[1]);

                    // Add closing </svg> tag if missing
                    if (!partialSvg.includes('</svg>')) {
                      partialSvg = partialSvg + '</svg>';
                    }

                    // Sanitize with DOMPurify
                    const cleanSvg = DOMPurify.sanitize(partialSvg, {
                      USE_PROFILES: { svg: true, svgFilters: true },
                      ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'ellipse', 'polygon', 'polyline', 'g', 'defs', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'stop', 'text', 'tspan', 'foreignObject'],
                      ADD_ATTR: ['viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'transform', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx', 'ry', 'points', 'x1', 'y1', 'x2', 'y2', 'offset', 'stop-color', 'stop-opacity', 'opacity', 'font-family', 'font-size', 'text-anchor']
                    });

                    partialDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg)}`;

                    // Update history array only if we have SVG content
                    appState.history = [...appState.history.slice(0, streamingIndex), partialDataUri, ...appState.history.slice(streamingIndex + 1)];
                    appState.generatedImage = partialDataUri;
                  }
                } else {
                  // ASCII streaming update
                  const asciiContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${appState.width}" height="${appState.height}">
                    <style>text { font-family: monospace; white-space: pre; }</style>
                    <foreignObject width="100%" height="100%">
                      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: monospace; white-space: pre; background: white; color: black; height: 100%; overflow: auto;">
                        ${asciiContent}
                      </div>
                    </foreignObject>
                  </svg>`;
                  partialDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

                  appState.history = [...appState.history.slice(0, streamingIndex), partialDataUri, ...appState.history.slice(streamingIndex + 1)];
                  appState.generatedImage = partialDataUri;
                }
              }
            },
            onFinish({ text, usage }) {
              content = text;
              appState.rawOutputs[streamingIndex] = text;

              // Track token usage and cost
              if (usage && modelInfo) {
                const inputTokens = usage.inputTokens || 0;
                const outputTokens = usage.outputTokens || 0;
                const cost = calculateCost(modelInfo, inputTokens, outputTokens);
                appState.addGenerationCost(step, inputTokens, outputTokens, cost);
              }

              resolve();
            },
            onError(error) {
              reject(error);
            },
          });

          // Consume the stream to trigger callbacks
          (async () => {
            try {
              for await (const _ of streamResult.textStream);
            } catch (e) {
              reject(e);
            }
          })();
        });

        // Extract final SVG content - take LAST occurrence if multiple
        if (appState.outputFormat === 'svg') {
            const parts = content.split(/```(?:xml|svg)?\n<svg/);
            if (parts.length > 1) {
                // Take the LAST SVG block
                const lastPart = parts[parts.length - 1];
                svgContent = '<svg' + lastPart.split('```')[0];
            } else {
                // Fallback if no code block found (unlikely with new prompt)
                svgContent = content.includes('<svg') ? content.substring(content.indexOf('<svg')) : content;
                if (svgContent.includes('```')) svgContent = svgContent.split('```')[0];
            }
        } else {
            svgContent = content;
        }

        lastContent = svgContent; // Store for next iteration

        // Add assistant response to history
        messages.push({ role: 'assistant', content: content });

        // 5. Save Artifact (SVG only)
        const artifactRes = await fetch('/api/artifacts/generation', {
          method: 'POST',
          body: JSON.stringify({
            projectId: appState.currentProjectId!,
            stepNumber: step,
            content: svgContent,
            format: appState.outputFormat as 'svg' | 'ascii',
          }),
        });
        const { path } = await artifactRes.json();

        // 6. Update Generation Record (with raw output)
        await fetch(`/api/generations/${generation.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'completed',
            artifactPath: path,
            completedAt: new Date(),
            rawOutput: content
          }),
        });

        // 7. Update UI with final clean version
        let dataUri = '';
        if (appState.outputFormat === 'svg') {
            let cleanContent = svgContent;
            dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanContent)}`;

            // Save rendered PNG
            try {
                const pngBase64 = await svgToPngBase64(cleanContent);

                // Save PNG artifact
                const pngArtifactRes = await fetch('/api/artifacts/generation', {
                  method: 'POST',
                  body: JSON.stringify({
                    projectId: appState.currentProjectId!,
                    stepNumber: step,
                    content: pngBase64,
                    format: 'png', // We'll need to handle this in the API
                    isBase64: true
                  }),
                });
                const { path: pngPath } = await pngArtifactRes.json();

                // Update generation with rendered image path
                await fetch(`/api/generations/${generation.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    renderedImagePath: pngPath
                  }),
                });
            } catch (e) {
                console.error("Failed to save rendered PNG:", e);
            }

        } else {
            const asciiContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${appState.width}" height="${appState.height}">
              <style>text { font-family: monospace; white-space: pre; }</style>
              <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: monospace; white-space: pre; background: white; color: black; height: 100%; overflow: auto;">
                  ${asciiContent}
                </div>
              </foreignObject>
            </svg>`;
            dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        }

        // Update final history item
        appState.history = [...appState.history.slice(0, streamingIndex), dataUri, ...appState.history.slice(streamingIndex + 1)];
        appState.generatedImage = dataUri;

        // Update raw output one last time
        appState.rawOutputs[streamingIndex] = content;
        if (appState.generatedImage === dataUri) {
            currentRawOutput = content;
        }

        // Small delay between steps?
        await new Promise(r => setTimeout(r, 500));
      }

    } catch (error) {
      console.error("Generation failed:", error);
      alert("Generation failed: " + (error as Error).message);
    } finally {
      appState.isGenerating = false;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 font-sans">
  <div class="mx-auto max-w-7xl space-y-3">
    <header class="flex items-center justify-between pb-3 border-b border-slate-300 dark:border-slate-700">
      <div>
        <h1 class="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">Pelican</h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">AI-powered SVG and ASCII art generator</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
          <AlertCircle class="h-3 w-3 text-amber-600 dark:text-amber-500" />
          <span class="text-xs font-medium text-amber-800 dark:text-amber-400">All generations are public</span>
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-0 lg:grid-cols-12">
      <!-- Controls -->
      <div class="lg:col-span-5 lg:border-r border-slate-300 dark:border-slate-700 lg:pr-3">
        <div class="space-y-3 p-3">

          <!-- Prompt Section -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <Label for="prompt" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Prompt</Label>
              <input type="file" id="ref-image-input" class="hidden" onchange={handleFileSelect} accept="image/*" />
              <Button variant="ghost" size="sm" class="h-6 px-2 gap-1" onclick={() => document.getElementById('ref-image-input')?.click()}>
                <ImagePlus class="h-3 w-3" />
                <span class="text-xs">{appState.referenceImageFile ? appState.referenceImageFile.name : 'Add reference'}</span>
              </Button>
            </div>
            <Textarea
              id="prompt"
              placeholder="Describe what you want to see..."
              class="min-h-[60px] resize-none border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500 text-sm"
              bind:value={appState.prompt}
            />
          </div>

          <Separator class="bg-slate-300 dark:bg-slate-700" />

          <!-- Output Settings -->
          <OutputSettings />

          <Separator class="bg-slate-300 dark:bg-slate-700" />

          <!-- ModelSettings -->
          <ModelSettings />

          <Separator class="bg-slate-300 dark:bg-slate-700" />

          <!-- Prompt Templates (Collapsible) -->
          <Collapsible.Root bind:open={appState.promptTemplatesOpen}>
            <Collapsible.Trigger class="flex items-center justify-between w-full py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Prompt Templates (Advanced)</span>
              <svg
                class="h-3 w-3 transition-transform {appState.promptTemplatesOpen ? 'rotate-180' : ''}"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </Collapsible.Trigger>
            <Collapsible.Content class="pt-3 space-y-3">
              <!-- SVG Templates -->
              <div class="text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-slate-700 pb-1">SVG Templates</div>

              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <Label for="initial-template" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Initial Prompt</Label>
                  <Button variant="ghost" size="sm" class="h-5 px-2 text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onclick={() => appState.initialTemplate = DEFAULT_INITIAL_TEMPLATE}>Reset</Button>
                </div>
                <PromptEditor
                  bind:value={appState.initialTemplate}
                  requiredVariables={['prompt', 'format', 'width', 'height']}
                />
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <Label for="refinement-template" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Refinement Prompt</Label>
                  <Button variant="ghost" size="sm" class="h-5 px-2 text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onclick={() => appState.refinementTemplate = DEFAULT_REFINEMENT_TEMPLATE}>Reset</Button>
                </div>
                <PromptEditor
                  bind:value={appState.refinementTemplate}
                  requiredVariables={['prompt', 'width', 'height']}
                />
              </div>

              <!-- ASCII Templates -->
              <div class="text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-slate-700 pb-1 pt-2">ASCII Templates</div>

              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <Label for="ascii-initial-template" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Initial Prompt</Label>
                  <Button variant="ghost" size="sm" class="h-5 px-2 text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onclick={() => appState.asciiInitialTemplate = DEFAULT_ASCII_INITIAL_TEMPLATE}>Reset</Button>
                </div>
                <PromptEditor
                  bind:value={appState.asciiInitialTemplate}
                  requiredVariables={['prompt', 'width', 'height']}
                />
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <Label for="ascii-refinement-template" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Refinement Prompt</Label>
                  <Button variant="ghost" size="sm" class="h-5 px-2 text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onclick={() => appState.asciiRefinementTemplate = DEFAULT_ASCII_REFINEMENT_TEMPLATE}>Reset</Button>
                </div>
                <PromptEditor
                  bind:value={appState.asciiRefinementTemplate}
                  requiredVariables={['prompt', 'width', 'height']}
                />
              </div>
            </Collapsible.Content>
          </Collapsible.Root>

          <div class="pt-3 border-t border-slate-300 dark:border-slate-700">
            <Button class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold h-9 text-sm" onclick={handleGenerate} disabled={appState.isGenerating}>
              {#if appState.isGenerating}
                <Wand2 class="mr-2 h-4 w-4 animate-spin" />
                Generating...
              {:else}
                <Wand2 class="mr-2 h-4 w-4" />
                Generate Art
              {/if}
            </Button>
          </div>

          <!-- Cost Display -->
          <CostDisplay />
        </div>
      </div>

      <!-- Preview -->
      <div class="lg:col-span-7">
        <div class="h-full flex flex-col p-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-slate-700">
            <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100">Preview</h2>
            <div class="flex items-center gap-2">
                <Label for="show-raw" class="text-xs font-medium text-slate-700 dark:text-slate-300">Show Raw</Label>
                <Switch id="show-raw" bind:checked={showRawOutput} />
            </div>
          </div>
          <div class="flex-1 flex flex-col min-h-[400px] gap-3 pt-3">
            <div class="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 relative overflow-hidden">
              {#if appState.generatedImage}
                <img src={appState.generatedImage} alt="Generated Art" class="max-w-full max-h-full object-contain" />
              {:else}
                <div class="text-center space-y-2 text-slate-400 dark:text-slate-500">
                  <ImageIcon class="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p class="text-sm font-medium">No image generated yet</p>
              </div>
            {/if}
          </div>

          {#if appState.history.length > 0}
            <div class="h-20 flex gap-1.5 overflow-x-auto pb-2 border-t border-slate-300 dark:border-slate-700 pt-2">
               {#each appState.history as item, i}
                 <button
                   class="relative aspect-square h-full border overflow-hidden transition-all hover:ring-1 hover:ring-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 {appState.generatedImage === item ? 'ring-2 ring-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-700'}"
                   onclick={() => {
                      appState.generatedImage = item;
                      currentRawOutput = appState.rawOutputs[i] || "";
                   }}
                 >
                   <img src={item} alt="Version {i + 1}" class="h-full w-full object-cover" />
                   <span class="absolute bottom-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] px-1 py-0.5 font-bold">v{i + 1}</span>
                 </button>
               {/each}
            </div>
          {/if}

          {#if appState.generatedImage}
            <div class="flex justify-between items-center gap-2 border-t border-slate-300 dark:border-slate-700 pt-2 mt-2">
             <div class="text-xs font-medium text-slate-600 dark:text-slate-400">
               {#if appState.isGenerating}
                  Refining... (Step {appState.history.length + 1})
               {:else}
                  Generation complete
               {/if}
             </div>
             <div class="flex gap-1">
              <Button variant="outline" size="sm" class="border-slate-300 dark:border-slate-700 h-7 text-xs">
                  <Copy class="mr-1 h-3 w-3" />
                  Copy
              </Button>
              <Button size="sm" class="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white h-7 text-xs">
                  <Download class="mr-1 h-3 w-3" />
                  Download
              </Button>
             </div>
            </div>
          {/if}
        </div>

        {#if showRawOutput && currentRawOutput}
          <div class="mt-3 p-3 border border-slate-300 dark:border-slate-700">
            <div class="pb-2 border-b border-slate-300 dark:border-slate-700">
              <h3 class="text-xs font-bold text-slate-900 dark:text-slate-100">Raw Model Output</h3>
            </div>
            <div class="pt-2">
              <div class="p-3 bg-slate-950 text-emerald-400 font-mono text-xs whitespace-pre-wrap overflow-auto max-h-96 border border-slate-800">
                {currentRawOutput}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
    </div>
  </div>
</div>

