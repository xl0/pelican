<script lang="ts">
  import CodeMirror from "svelte-codemirror-editor";
  import { markdown } from "@codemirror/lang-markdown";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { EditorView } from "@codemirror/view";
  import { AlertCircle, CheckCircle2 } from "@lucide/svelte";
  import { cn } from "$lib/utils";

  import dbg from 'debug';
  import nunjucks from 'nunjucks';
  import { linter, type Diagnostic } from '@codemirror/lint';

  const debug = dbg('app:components:PromptEditor');

  // Configure nunjucks to be minimal
  const env = new nunjucks.Environment(null, { autoescape: false });

  let {
    value = $bindable(),
    requiredVariables = [],
    class: className
  }: {
    value: string;
    requiredVariables?: string[];
    class?: string;
  } = $props();

  // Linter function for CodeMirror
  const syntaxLinter = linter((view) => {
    const content = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];

    // 1. Regex-based checks for specific issues
    const strictRegex = /\{\{(?!\s*[a-zA-Z0-9_.]+\s*\}\})/g;
    let match;
    let loopCount = 0;

    while ((match = strictRegex.exec(content)) !== null) {
        loopCount++;
        if (loopCount > 100) break;

        const start = match.index;
        // Try to find where the tag "should" end or where the error is
        // We'll highlight from {{ up to the next whitespace or } or end of line
        let end = content.indexOf('}}', start);
        if (end === -1) end = Math.min(content.length, start + 20);
        else end += 2; // Include }} if found but invalid content

        const snippet = content.substring(start, end);
        let message = "Invalid tag syntax";

        // Try to be more specific
        if (!snippet.includes('}}')) {
             message = "Missing closing brackets '}}'";
        } else if (/[^a-zA-Z0-9_.\s]/.test(snippet.slice(2, -2))) {
             message = "Tag contains invalid characters (only letters, numbers, underscores, and dots allowed)";
        }

        diagnostics.push({
            from: start,
            to: end,
            severity: 'error',
            message: message,
            actions: []
        });
    }

    // 2. Nunjucks compilation check (for structural issues)
    // Note: Nunjucks doesn't give line/col easily for all errors in a way that maps perfectly,
    // but we can try to use it if the regex didn't catch anything, or as a general check.
    // However, Nunjucks errors often point to the start of the file or are generic.
    // We'll rely on the regex for the visual highlighting of *specific* tags,
    // and use Nunjucks to catch anything else that might be wrong globally.

    if (diagnostics.length === 0) {
        try {
            nunjucks.compile(content, env);
        } catch (e: any) {
             // If Nunjucks fails but our regex didn't catch it, mark the whole line or just show a general error
             // Parsing the error message for line/col would be ideal but Nunjucks is inconsistent.
             // For now, we won't add a global diagnostic to avoid cluttering if we can't pinpoint it,
             // relying on the text error below.
        }
    }

    return diagnostics;
  });

  // Validation for the "Missing Variables" warning (global state)
  let missingVariables = $derived.by(() => {
    const missing: string[] = [];
    if (requiredVariables.includes('prompt') && !value.includes('{{prompt}}')) {
      missing.push('prompt');
    }
    return missing;
  });

  // We still want to show the text error summary below, so we derive it similarly but
  // we can reuse the logic or just let the linter handle the visual part.
  // Let's keep a simple derived state for the *text* summary of errors to show below.
  let syntaxErrorSummary = $derived.by(() => {
     const errors: string[] = [];
     // Re-run regex for summary (fast enough)
     const strictRegex = /\{\{(?!\s*[a-zA-Z0-9_.]+\s*\}\})/g;
     if (strictRegex.test(value)) {
         errors.push("Invalid syntax detected (see red highlights)");
     } else {
         try {
            nunjucks.compile(value, env);
         } catch (e: any) {
            let msg = e.message || "Syntax error";
            msg = msg.replace('(unknown path)', '').trim();
            errors.push(msg);
         }
     }
     return errors;
  });

  const theme = EditorView.theme({
    "&": {
      fontSize: "12px",
      borderRadius: "0.375rem",
      border: "1px solid hsl(var(--border))",
      backgroundColor: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
    },
    ".cm-content": {
      fontFamily: "monospace",
    },
    ".cm-gutters": {
      backgroundColor: "hsl(var(--muted))",
      color: "hsl(var(--muted-foreground))",
      borderRight: "none",
    },
    "&.cm-focused": {
      outline: "2px solid hsl(var(--ring))",
      outlineOffset: "2px",
    }
  });

</script>

<div class={cn("space-y-2", className)}>
  <div class="relative overflow-hidden rounded-md border border-input shadow-sm focus-within:ring-1 focus-within:ring-ring">
    <CodeMirror
      bind:value
      lang={markdown()}
      theme={oneDark}
      lineNumbers={false}
      styles={{
        "&": {
            height: "150px",
            maxWidth: "100%",
        }
      }}
      extensions={[EditorView.lineWrapping, syntaxLinter]}
    />
  </div>

  <div class="flex flex-col gap-1 text-xs">
    {#if syntaxErrorSummary.length > 0}
        {#each syntaxErrorSummary as error}
            <span class="flex items-center text-destructive font-medium">
                <AlertCircle class="mr-1 h-3 w-3" />
                {error}
            </span>
        {/each}
    {/if}

    {#if missingVariables.length > 0}
      <span class="flex items-center text-amber-500 font-medium">
        <AlertCircle class="mr-1 h-3 w-3" />
        Warning: Missing required variable {missingVariables.map(v => `{{${v}}}`).join(", ")}
      </span>
    {:else if syntaxErrorSummary.length === 0}
      <span class="flex items-center text-green-600 dark:text-green-500">
        <CheckCircle2 class="mr-1 h-3 w-3" />
        Valid template
      </span>
    {/if}

    {#if requiredVariables.length > 0}
        <span class="text-muted-foreground">
            Available variables: {requiredVariables.map(v => `{{${v}}}`).join(", ")}
        </span>
    {/if}
  </div>
</div>
