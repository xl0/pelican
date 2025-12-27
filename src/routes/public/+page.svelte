<script lang="ts">
	import { AspectRatio } from '$lib/components/ui/aspect-ratio';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getPublicGenerations } from '$lib/data.remote';
	import { ArrowLeft } from '@lucide/svelte';
import { formatDistanceToNow } from 'date-fns';
	import { AsciiArt } from 'svelte-asciiart';
	import { MediaQuery } from 'svelte/reactivity';

	const generations = getPublicGenerations({ limit: 50 });

	// Get artifact body for a generation's latest artifact
	function getArtifactBody(gen: Awaited<typeof generations>[number]): string | null {
		return gen.steps?.[0]?.artifacts?.[0]?.body;
	}

	// Distribute items into N columns round-robin for left-to-right ordering
	function distributeToColumns<T>(items: T[], numColumns: number): T[][] {
		const columns: T[][] = Array.from({ length: numColumns }, () => []);
		items.forEach((item, i) => columns[i % numColumns].push(item));
		return columns;
	}

	// Track column count based on viewport using Svelte's MediaQuery
	const xl = new MediaQuery('min-width: 1280px');
	const lg = new MediaQuery('min-width: 1024px');
	const sm = new MediaQuery('min-width: 640px');
	const columnCount = $derived(xl.current ? 5 : lg.current ? 4 : sm.current ? 3 : 2);
</script>

<svelte:head>
	<title>Public Gallery - Pelican</title>
	<meta name="description" content="Browse AI-generated SVG and ASCII artwork created with Pelican" />
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="mx-auto max-w-7xl px-3 py-3 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-black tracking-tight text-primary">Gallery</h1>
				<p class="text-xs text-muted-foreground">AI-generated SVG and ASCII artwork</p>
			</div>
			<Button variant="outline" href="/">
				<ArrowLeft class="h-4 w-4 mr-2" />
				Create
			</Button>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-3 py-4">
		{#await generations}
			<!-- Loading skeleton -->
			<div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
				{#each Array(8) as _}
					<Card.Root class="overflow-hidden">
						<AspectRatio ratio={1} class="bg-muted">
							<Skeleton class="w-full h-full" />
						</AspectRatio>
						<div class="p-2">
							<Skeleton class="h-4 w-3/4 mb-2" />
							<Skeleton class="h-3 w-full" />
						</div>
					</Card.Root>
				{/each}
			</div>
		{:then gens}
			{#if gens.length === 0}
				<Card.Root class="max-w-md mx-auto mt-20">
					<Card.Header class="text-center">
						<Card.Title>No Generations Yet</Card.Title>
						<Card.Description>Be the first to create some AI artwork!</Card.Description>
					</Card.Header>
					<Card.Footer class="justify-center">
						<Button href="/">Create Artwork</Button>
					</Card.Footer>
				</Card.Root>
			{:else}
				{@const columns = distributeToColumns(gens, columnCount)}
				<div class="flex gap-4">
					{#each columns as column}
						<div class="flex-1 flex flex-col gap-4 w-20">
							{#each column as gen (gen.id)}
								{@const body = getArtifactBody(gen)}
								<a href="/{gen.id}" class="group block">
									<Card.Root
										class="overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg group-hover:-translate-y-0.5 py-0 gap-2">
										{#if body && gen.format === 'svg'}
											<div class="w-full [&>svg]:w-full [&>svg]:h-auto">
												{@html body}
											</div>
										{:else if body && gen.format === 'ascii'}
											<div class="w-full bg-background text-foreground">
												<AsciiArt text={body} />
											</div>
										{:else}
											<div class="w-full aspect-square flex items-center justify-center bg-muted">
												<span class="text-muted-foreground text-sm">No preview</span>
											</div>
										{/if}
										<div class="p-2">
											<p class="text-sm font-medium truncate group-hover:text-primary">{gen.title}</p>
											<p class="text-xs text-muted-foreground truncate">{gen.prompt}</p>
											<p class="text-xs text-muted-foreground mt-1">{formatDistanceToNow(gen.createdAt, { addSuffix: true })}</p>
										</div>
									</Card.Root>
								</a>
							{/each}
						</div>
					{/each}
				</div>
			{/if}
		{:catch error}
			<Card.Root class="max-w-md mx-auto mt-20 border-destructive">
				<Card.Header class="text-center">
					<Card.Title class="text-destructive">Error Loading Gallery</Card.Title>
					<Card.Description>{error.message}</Card.Description>
				</Card.Header>
				<Card.Footer class="justify-center">
					<Button onclick={() => location.reload()}>Try Again</Button>
				</Card.Footer>
			</Card.Root>
		{/await}
	</main>
</div>
