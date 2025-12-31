<script lang="ts">
import dbg from 'debug';
	const debug = dbg('app:page');
	import GalleryGrid from '$lib/components/GalleryGrid.svelte';
	import Header from '$lib/components/Header.svelte';
	import { getPublicGenerations } from '$lib/data.remote';

	let { data } = $props();

	const PER_PAGE = 20;
	let currentPage = $state(1);
	const offset = $derived((currentPage - 1) * PER_PAGE);

	const query = $derived(getPublicGenerations({ limit: PER_PAGE, offset, approval: 'approved' }));
</script>

<svelte:head>
	<title>Gallery - Pelican</title>
	<meta name="description" content="Browse AI-generated SVG and ASCII artwork created with Pelican" />
</svelte:head>

<div class="min-h-screen bg-background">
	<div class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="mx-auto max-w-7xl px-3 py-3">
			<Header isAdmin={data.user.isAdmin} />
		</div>
	</div>

	<main class="mx-auto max-w-7xl px-3 py-4">
		<GalleryGrid {query} perPage={PER_PAGE} {currentPage} onPageChange={(p) => (currentPage = p)} dateField="createdAt" />
	</main>
</div>
