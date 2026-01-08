<script lang="ts">
	import { getArtifactUrl } from '$lib/utils';

	let { data } = $props();

	const gen = $derived(data.generation);
	const lastStep = $derived(gen.steps?.at(-1));
	const lastArtifact = $derived(lastStep?.artifacts?.at(-1));

	// Get SVG URL for social cards
	const imageUrl = $derived(lastStep && lastArtifact ? getArtifactUrl(gen.id, lastStep.id, lastArtifact.id) : '');

	// Truncate prompt for meta description (max 160 chars)
	const description = $derived(gen.prompt.length > 160 ? gen.prompt.slice(0, 157) + '...' : gen.prompt);
</script>

<svelte:head>
	<title>{gen.prompt} | Pelican</title>
	<meta name="description" content={description} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={gen.prompt} />
	<meta property="og:image" content={imageUrl} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={gen.prompt} />
	<meta name="twitter:image" content={imageUrl} />
</svelte:head>
