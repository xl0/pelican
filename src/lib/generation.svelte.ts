
  
  async function handleGenerate() {
    const apiKey = apiKeys.current[provider.current];
    if (!apiKey) {
      toast.error("Please enter an API key");
      return;
    }

    if (selected_model.current === 'custom' && !customModelId.current) {
      toast.error("Please enter a custom model ID");
      return;
    }

    const effectiveModel = selected_model.current === 'custom' ? customModelId.current : selected_model.current;

    // Get model info for cost calculation
    const modelInfo = getModelInfo(provider.current, effectiveModel);

    uiState.isGenerating = true;

    try {
      // 1. Create Project if not exists
      if (!projectState.current) {
        const project = await createProject({
          name: `Project ${new Date().toLocaleString()}`,
          prompt: prompt.current,
          outputFormat: outputFormat.current as 'svg' | 'ascii',
          isColor: true,
          width: svgWidth.current,
          height: svgHeight.current,
        });
        if (!project || !project.id) {
            console.error("Project creation failed:", project);
            throw new Error("Failed to create project: No ID returned");
        }
        projectState.current = project;
        projectState.generations = [];
      }

      // 2. Save Reference Image if present (only once)
      let referenceImageBase64 = "";
      if (uiState.referenceImageFile && projectState.generations.length === 0) {
        const reader = new FileReader();
        reader.readAsDataURL(uiState.referenceImageFile);
        await new Promise((resolve) => {
          reader.onload = async () => {
            referenceImageBase64 = (reader.result as string).split(',')[1];
            const extension = uiState.referenceImageFile!.name.split('.').pop() || 'png';
            await saveReferenceImage({
              generationID: projectState.current!.id,
              data: referenceImageBase64,
              extension,
            });
            resolve(null);
          };
        });
      }

      // Clear generations for new run
      projectState.generations = [];
      uiState.selectedStepIndex = null;
      uiState.streamingContent = "";
      let lastContent = "";

      // Initialize conversation history
      const messages: any[] = [];

      // System prompt to enforce output format
      const systemPrompt = outputFormat.current === 'svg'
        ? `You are an expert SVG artist. You should first think about the design and describe it, then provide the SVG code in a markdown code block starting with \`\`\`xml or \`\`\`svg. The SVG MUST have width="${svgWidth.current}" height="${svgHeight.current}" and viewBox="0 0 ${svgWidth.current} ${svgHeight.current}".`
        : `You are an expert ASCII artist. You must generate ASCII art for the requested image. The output should fit within a ${asciiWidth.current}x${asciiHeight.current} character grid. Do not include any conversational text or explanations. Return ONLY the ASCII art.`;

      messages.push({ role: 'system', content: systemPrompt });

      for (let step = 1; step <= maxSteps.current; step++) {
        const isRefinement = step > 1;

        // Select template based on output format
        const currentTemplate = outputFormat.current === 'svg'
          ? (isRefinement ? refinementTemplate : initialTemplate)
          : (isRefinement ? asciiRefinementTemplate : asciiInitialTemplate);

        // Prepare prompt text
        let promptText = currentTemplate.current
          .replace('{{prompt}}', prompt.current)
          .replace('{{format}}', outputFormat.current === 'svg' ? 'SVG vector' : 'ASCII')
          .replace(/{{width}}/g, (outputFormat.current === 'svg' ? svgWidth.current : asciiWidth.current).toString())
          .replace(/{{height}}/g, (outputFormat.current === 'svg' ? svgHeight.current : asciiHeight.current).toString());

        promptText += outputFormat.current === 'svg'
          ? ""
          : `\n\nIMPORTANT: Output ONLY the ASCII art. Target size: ${asciiWidth.current} characters wide by ${asciiHeight.current} lines tall.`;

        const userContent: any[] = [{ type: 'text', text: promptText }];

        // Add inputs
        if (isRefinement) {
          // Add rendered image of previous step
          let previousImageBase64 = "";
          let renderError = "";

          try {
            if (outputFormat.current === 'svg') {
               previousImageBase64 = await svgToPngBase64(lastContent);
            } else {
               // For ASCII, render as SVG text elements (not foreignObject to avoid canvas tainting)
               const lines = lastContent.split('\n');
               const textElements = lines.map((line, i) =>
                 `<text x="10" y="${20 + i * 14}" font-family="monospace" font-size="12" fill="black">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')}</text>`
               ).join('\n');

               const wrapperWidth = asciiWidth.current * 10;
               const wrapperHeight = asciiHeight.current * 16;

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

            if (outputFormat.current === 'svg') {
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
        const generation = await createGeneration({
          projectId: projectState.current!.id,
          stepNumber: step,
          provider: provider.current,
          model: effectiveModel,
          endpoint: endpoint.current || null,
          promptTemplate: currentTemplate.current,
          renderedPrompt: promptText,
          artifactPath: '',
          status: 'generating',
        });

        // Add to local generations array (will be updated when complete)
        projectState.generations = [...projectState.generations, generation];
        const streamingIndex = projectState.generations.length - 1;

        // Auto-select the new generation being created
        uiState.selectedStepIndex = null; // null = latest
        uiState.streamingContent = "";

        // 4. Client-side Generation
        const modelInstance = getModel(provider.current, effectiveModel, apiKey, endpoint.current);

        let content = "";
        let svgContent = "";
        let stepInputTokens: number | undefined;
        let stepOutputTokens: number | undefined;
        let stepCost: number | undefined;

        // Prepare messages for this generation
        // If sendFullHistory is false and this is a refinement, only send system + last user message
        const messagesToSend = sendFullHistory.current || !isRefinement
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

                // Update streaming content for live preview
                uiState.streamingContent = content;
                currentRawOutput = content;

                // Update the streaming placeholder with partial SVG
                if (outputFormat.current === 'svg') {
                  const parts = content.split(/```(?:xml|svg)?\n<svg/);
                  if (parts.length > 1) {
                    let partialSvg = '<svg' + (parts[1].split('```')[0] || parts[1]);
                    if (!partialSvg.includes('</svg>')) {
                      partialSvg = partialSvg + '</svg>';
                    }
                    const cleanSvg = DOMPurify.sanitize(partialSvg, {
                      USE_PROFILES: { svg: true, svgFilters: true },
                      ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'ellipse', 'polygon', 'polyline', 'g', 'defs', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'stop', 'text', 'tspan', 'foreignObject'],
                      ADD_ATTR: ['viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'transform', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx', 'ry', 'points', 'x1', 'y1', 'x2', 'y2', 'offset', 'stop-color', 'stop-opacity', 'opacity', 'font-family', 'font-size', 'text-anchor']
                    });
                    svgContent = cleanSvg;
                  }
                } else {
                  // ASCII streaming update
                  const cleanContent = content.replace(/^```(?:ascii)?\n/, '');
                  svgContent = cleanContent;
                }
              }
            },
            onFinish({ text, usage }) {
              content = text;
              uiState.streamingContent = text;

              // Store token usage for later update to generation record
              if (usage && modelInfo) {
                stepInputTokens = usage.inputTokens || 0;
                stepOutputTokens = usage.outputTokens || 0;
                stepCost = calculateCost(modelInfo, stepInputTokens, stepOutputTokens);
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
        let dataUri = '';

        // Extract final SVG content - take LAST occurrence if multiple
        if (outputFormat.current === 'svg') {
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
            // ASCII cleaning: strip markdown code blocks if present
            let cleanContent = content;
            // Regex to match code blocks, capturing content inside
            // We ensure the closing backticks are on a new line to avoid matching backticks inside the art
            const codeBlockRegex = /```(?:ascii)?\n([\s\S]*?)\n```/g;
            const match = codeBlockRegex.exec(content);
            if (match && match[1]) {
                cleanContent = match[1];
            } else {
                // Also handle case where it might just start with ```
                 cleanContent = content.replace(/^```(?:ascii)?\n/, '').replace(/\n```$/, '');
            }

            svgContent = cleanContent; // Store clean content

            dataUri = cleanContent;
        }

        lastContent = svgContent; // Store for next iteration

        // Add assistant response to history
        messages.push({ role: 'assistant', content: content });

        // 5. Save Artifact
        const { path } = await saveGenerationArtifact({
          projectId: projectState.current!.id,
          stepNumber: step,
          content: svgContent,
          format: outputFormat.current as 'svg' | 'ascii',
        });

        // 6. Update Generation Record (with raw output and cost data)
        const updatedGeneration = await updateGeneration({
          id: generation.id,
          status: 'completed',
          artifactPath: path,
          rawOutput: content,
          inputTokens: stepInputTokens,
          outputTokens: stepOutputTokens,
          cost: stepCost
        });

        // Update local generations array with completed generation
        projectState.generations = projectState.generations.map((g, i) =>
          i === streamingIndex ? updatedGeneration : g
        );

        // 7. Update UI with final clean version
        if (outputFormat.current === 'svg') {
            let cleanContent = svgContent;
            dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanContent)}`;

            // Save rendered PNG
            try {
                const pngBase64 = await svgToPngBase64(cleanContent);

                // Save PNG artifact
                const { path: pngPath } = await saveGenerationArtifact({
                  projectId: projectState.current!.id,
                  stepNumber: step,
                  content: pngBase64,
                  format: 'png',
                  isBase64: true
                });

                // Update generation with rendered image path
                const genWithPng = await updateGeneration({
                  id: generation.id,
                  renderedImagePath: pngPath
                });
                projectState.generations = projectState.generations.map((g, i) =>
                  i === streamingIndex ? genWithPng : g
                );
            } catch (e) {
                console.error("Failed to save rendered PNG:", e);
            }
        }

        // Clear streaming content after completion
        uiState.streamingContent = "";
        currentRawOutput = content;

        // Small delay between steps?
        await new Promise(r => setTimeout(r, 500));
      }

    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("Generation failed", { description: (error as Error).message });
    } finally {
      uiState.isGenerating = false;
    }
  }
