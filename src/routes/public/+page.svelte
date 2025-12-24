<script lang="ts">
	import { getPublicGenerations } from '$lib/data.remote';
	import { PUBLIC_CLOUDFRONT_URL } from '$env/static/public';
	import { formatDistanceToNow } from 'date-fns';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { AspectRatio } from '$lib/components/ui/aspect-ratio';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from '@lucide/svelte';

	const generations = getPublicGenerations({ limit: 50 });

	// Get preview URL for a generation's latest artifact
	function getPreviewUrl(gen: Awaited<typeof generations>[number]): string | null {
		const lastStep = gen.steps?.[0];
		const artifact = lastStep?.artifacts?.[0];
		if (!artifact) return null;

		const ext = gen.format === 'svg' ? 'svg' : 'txt';
		return `https://${PUBLIC_CLOUDFRONT_URL}/${gen.id}/${lastStep.id}_${artifact.id}.${ext}`;
	}
</script>

<svelte:head>
	<title>Public Gallery - Pelican</title>
	<meta name="description" content="Browse AI-generated SVG and ASCII artwork created with Pelican" />
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-black tracking-tight bg-linear-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
					Gallery
				</h1>
				<p class="text-sm text-muted-foreground">AI-generated SVG and ASCII artwork</p>
			</div>
			<Button variant="outline" href="/">
				<ArrowLeft class="h-4 w-4 mr-2" />
				Create
			</Button>
		</div>
	</header>

	<main class="mx-auto max-w-7xl p-6">
		{#await generations}
			<!-- Loading skeleton grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{#each Array(8) as _}
					<Card.Root class="overflow-hidden">
						<div class="p-4">
							<AspectRatio ratio={1}>
								<Skeleton class="w-full h-full" />
							</AspectRatio>
						</div>
						<Card.Header class="pb-2">
							<Skeleton class="h-4 w-3/4" />
							<Skeleton class="h-3 w-full mt-2" />
						</Card.Header>
						<Card.Footer class="pt-0">
							<Skeleton class="h-3 w-1/2" />
						</Card.Footer>
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
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{#each gens as gen (gen.id)}
						{@const previewUrl = getPreviewUrl(gen)}
						<a href="/{gen.id}" class="group">
							<Card.Root
								class="overflow-hidden transition-all duration-200 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 group-hover:-translate-y-1">
								<!-- Preview image -->
								<div class="p-4 bg-muted/50">
									<AspectRatio ratio={1} class="rounded overflow-hidden bg-muted">
										{#if previewUrl && gen.format === 'svg'}
											<img
												src={previewUrl}
												alt={gen.title}
												class="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
												loading="lazy" />
										{:else if gen.format === 'ascii'}
											<div class="w-full h-full flex items-center justify-center bg-slate-950">
												<span class="text-emerald-400 font-mono text-xs">ASCII</span>
											</div>
										{:else}
											<div class="w-full h-full flex items-center justify-center">
												<span class="text-muted-foreground text-sm">No preview</span>
											</div>
										{/if}
									</AspectRatio>
								</div>

								<Card.Header class="pb-2">
									<div class="flex items-start justify-between gap-2">
										<Card.Title class="text-base truncate group-hover:text-orange-500 transition-colors">
											{gen.title}
										</Card.Title>
										<Badge variant={gen.format === 'svg' ? 'default' : 'secondary'} class="shrink-0">
											{gen.format.toUpperCase()}
										</Badge>
									</div>
									<Card.Description class="line-clamp-2 text-xs">
										{gen.prompt}
									</Card.Description>
								</Card.Header>

								<Card.Footer class="pt-0 text-xs text-muted-foreground justify-between">
									<span>{gen.width}×{gen.height}</span>
									<span>{formatDistanceToNow(gen.createdAt, { addSuffix: true })}</span>
								</Card.Footer>
							</Card.Root>
						</a>
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
