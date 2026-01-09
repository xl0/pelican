<script lang="ts">
	import { parseSvg } from '$lib/svg';

	interface Props {
		body: string;
		isGenerating?: boolean;
	}

	let { body, isGenerating = false }: Props = $props();

	// SVG parse state (debounced during generation)
	let displaySvg = $state<string | null>(null);

	// Debounced parsing effect
	$effect(() => {
		if (!body) {
			displaySvg = null;
			return;
		}

		// Debounce during generation (100ms), immediate when complete
		const delay = isGenerating ? 100 : 0;
		const timeout = setTimeout(() => {
			const result = parseSvg(body);
			displaySvg = result.svg ?? null;
		}, delay);

		return () => clearTimeout(timeout);
	});
</script>

{#if displaySvg}
	<div class="w-full h-full [&>svg]:w-full [&>svg]:h-full bg-card pointer-events-none">
		{@html displaySvg}
	</div>
{/if}
