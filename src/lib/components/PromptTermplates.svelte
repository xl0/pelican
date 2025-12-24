<script lang="ts">
	import PromptEditor from '$lib/components/PromptEditor.svelte';
	import * as p from '$lib/persisted.svelte'
	import {app} from '$lib/appstate.svelte'
</script>

<div class="space-y-3">
	<PromptEditor template={p.initialTemplate} bind:rendered={app.renderedPrompt}
	title="Initial template (SVG)"
	context={{
		prompt: p.prompt.current,
		width: p.svgWidth.current,
		height: p.svgHeight.current
	}}/>
	<PromptEditor template={p.refinementTemplate} bind:rendered={app.renderedRefinementPrompt}
	title="Refinement template (SVG)"
	context={{
		prompt: p.prompt.current,
		width: p.svgWidth.current,
		height: p.svgHeight.current
	}}/>
</div>
