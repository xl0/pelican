<script lang="ts">
	import GalleryGrid from '$lib/components/GalleryGrid.svelte';
	import { getGenerations } from '$lib/data.remote';

	const PER_PAGE = 20;
	let currentPage = $state(1);
	const offset = $derived((currentPage - 1) * PER_PAGE);

	const query = $derived(getGenerations({ limit: PER_PAGE, offset }));
</script>

<svelte:head>
	<title>History - Pelican</title>
	<meta name="description" content="Your AI-generated SVG and ASCII artwork history" />
</svelte:head>

<div class="min-h-screen bg-background">
	<header class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="mx-auto max-w-7xl px-3 py-3 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-black tracking-tight text-primary">Pelican</h1>
			</div>
			<nav class="flex items-center gap-4">
				<a href="/" class="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Create</a>
				<a href="/history" class="text-sm font-medium text-primary">History</a>
				<a href="/gallery" class="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Gallery</a>
			</nav>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-3 pt-10">
		<GalleryGrid {query} perPage={PER_PAGE} {currentPage} onPageChange={(p) => (currentPage = p)} dateField="updatedAt" />
	</main>
</div>
