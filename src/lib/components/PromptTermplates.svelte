<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import PromptEditor from '$lib/components/PromptEditor.svelte';

	const gen = $derived(app.currentGeneration);
</script>

{#if gen}
	<div class="space-y-3">
		<PromptEditor
			bind:template={gen.initialTemplate}
			bind:rendered={app.renderedPrompt}
			title="Initial template ({gen.format.toUpperCase()})"
			context={{
				prompt: gen.prompt,
				width: gen.width,
				height: gen.height
			}} />
		<PromptEditor
			bind:template={gen.refinementTemplate}
			bind:rendered={app.renderedRefinementPrompt}
			title="Refinement template ({gen.format.toUpperCase()})"
			context={{
				prompt: gen.prompt,
				width: gen.width,
				height: gen.height
			}} />
	</div>
{/if}
