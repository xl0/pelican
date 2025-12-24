<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { cn } from '$lib/utils';
	import { markdown } from '@codemirror/lang-markdown';
	import { linter, type Diagnostic } from '@codemirror/lint';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorView } from '@codemirror/view';
	import { CircleAlert } from '@lucide/svelte';
	import CodeMirror from 'svelte-codemirror-editor';

	import dbg from 'debug';
	import nunjucks from 'nunjucks';
	import type { PersistedState } from 'runed';
	const debug = dbg('app:components:PromptEditor');

	// Configure nunjucks to be minimal and throw on undefined variables as requested
	const env = new nunjucks.Environment(null, { autoescape: false, throwOnUndefined: true });

	let {
		template,
		rendered = $bindable(),
		title,
		context,
		class: className
	}: {
		template: PersistedState<string>;
		rendered: string;
		title: string;
		context: Record<string, string | number>;
		class?: string;
	} = $props();

	let syntaxError = $state<string | null>(null);

	let requiredVariables = ['prompt'];
	let showPreview = $state(false);

	$effect(() => {
		try {
			rendered = env.renderString(template.current, context);
		} catch (e: any) {
			rendered = `Error rendering preview: ${e.message.replace('(unknown path) ', '').trim()}`;
		}
	});

	// // Linter function for CodeMirror
	const syntaxLinter = linter((view) => {
		const diagnostics: Diagnostic[] = [];
		const content = view.state.doc.toString();

		try {
			env.renderString(content, context);
			syntaxError = null;
		} catch (e: any) {
			let message = e.message || 'Syntax error';
			message = message.replace('(unknown path) ', '').trim();
			syntaxError = message;

			debug('e %O', e);

			let line = e.lineno;
			let col = e.colno;

			// Try to extract from message if missing or 0 (Nunjucks sometimes puts it only in message)
			if (!line || line === 1) {
				const match = message.match(/\[Line (\d+), Column (\d+)\]/);
				if (match) {
					line = parseInt(match[1]);
					col = parseInt(match[2]);
				}
			}

			const lineNum = line || 1;
			const colNum = col || 0;

			try {
				const linePos = view.state.doc.line(lineNum);
				diagnostics.push({
					from: Math.min(linePos.from + Math.max(0, colNum - 1), linePos.to),
					to: Math.min(linePos.from + colNum, linePos.to),
					severity: 'error',
					message: message
				});
			} catch (err) {
				// Fallback to start of document if line count is off
				diagnostics.push({
					from: 0,
					to: view.state.doc.length,
					severity: 'error',
					message: message
				});
			}
		}

		return diagnostics;
	});

	// Validation for the "Missing Variables" warning (global state)
	let missingVariables = $derived.by(() => {
		const missing: string[] = [];
		for (const v of requiredVariables) {
			const pattern = new RegExp(`\\{\\{\\s*${v}\\b[\\s\\S]*?\\}\\}`);
			if (!pattern.test(template.current)) {
				missing.push(v);
			}
		}
		return missing;
	});

	const errorTheme = EditorView.theme({
		'.cm-lintRange-error': {
			backgroundColor: 'rgba(239, 68, 68, 0.3)',
			borderBottom: '2px solid rgba(239, 68, 68, 0.6)'
		}
	});
</script>

<div class={cn('space-y-1.5 prompt-editor', className)}>
	<div class="flex items-center justify-between">
		<Label class="text-xs font-semibold text-foreground">{title}</Label>
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-1.5">
				<Label class="text-[10px] uppercase font-bold text-muted-foreground">Preview</Label>
				<Switch bind:checked={showPreview} />
			</div>
			<Button variant="ghost" size="sm" onclick={() => template.reset()}>Reset</Button>
		</div>
	</div>

	{#if showPreview}
		<div class="relative overflow-hidden rounded-md border border-border shadow-sm">
			<CodeMirror
				value={rendered}
				lang={markdown()}
				theme={oneDark}
				lineNumbers={false}
				editable={false}
				extensions={[EditorView.lineWrapping]} />
		</div>
	{:else}
		<div class={'relative overflow-hidden rounded-md border border-border shadow-sm focus-within:ring-1 focus-within:ring-ring'}>
			<CodeMirror
				bind:value={template.current}
				lang={markdown()}
				theme={oneDark}
				lineNumbers={false}
				extensions={[EditorView.lineWrapping, syntaxLinter, errorTheme]} />
		</div>
	{/if}

	<div class="flex flex-col gap-1 text-xs">
		{#if syntaxError}
			<span class="flex items-center text-destructive font-medium">
				<CircleAlert class="mr-1 h-3 w-3" />
				{syntaxError}
			</span>
		{/if}

		{#if missingVariables.length > 0}
			<span class="flex items-center text-orange-600 dark:text-orange-400 font-medium">
				<CircleAlert class="mr-1 h-3 w-3" />
				Warning: Missing required variable {missingVariables.map((v) => `{{${v}}}`).join(', ')}
			</span>
		{/if}

		{#if Object.keys(context).length > 0}
			<span class="text-muted-foreground">
				Available variables: {Object.keys(context)
					.map((v) => `{{${v}}}`)
					.join(', ')}
			</span>
		{/if}
	</div>
</div>

<style>
	.prompt-editor :global(.cm-editor) {
		min-height: 100px;
		height: auto !important;
		max-width: 100%;
		font-size: 0.75rem;
	}
	.prompt-editor :global(.cm-scroller) {
		overflow: visible !important;
	}
</style>
