<script lang="ts">
	import { resolve } from '$app/paths';
	import { getPublicGenerations, updateGeneration, getAdminStats } from '$lib/data.remote';
	import { getArtifactUrl } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import * as Pagination from '$lib/components/ui/pagination';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Check, ImageOff, Loader2, RotateCcw, X } from '@lucide/svelte';

	// Track failed image URLs
	let failedImages = $state(new Set<string>());

	const PER_PAGE = 50;

	let statsQuery = getAdminStats();

	let pendingPage = $state(1);
	let approvedPage = $state(1);
	let rejectedPage = $state(1);

	let pendingQuery = $derived(getPublicGenerations({ limit: PER_PAGE, offset: (pendingPage - 1) * PER_PAGE, approval: 'pending' }));
	let approvedQuery = $derived(getPublicGenerations({ limit: PER_PAGE, offset: (approvedPage - 1) * PER_PAGE, approval: 'approved' }));
	let rejectedQuery = $derived(getPublicGenerations({ limit: PER_PAGE, offset: (rejectedPage - 1) * PER_PAGE, approval: 'rejected' }));

	type Stats = NonNullable<typeof statsQuery.current>;
	type Pending = NonNullable<typeof pendingQuery.current>;
	type Item = Pending['items'][number] & { processing?: boolean };

	const statsApprove = (s: Stats) => ({
		...s,
		generations: { ...s.generations, pending: s.generations.pending - 1, approved: s.generations.approved + 1 },
		pendingModeration: s.pendingModeration - 1
	});

	const statsReject = (s: Stats) => ({
		...s,
		generations: { ...s.generations, pending: s.generations.pending - 1, rejected: s.generations.rejected + 1 },
		pendingModeration: s.pendingModeration - 1
	});

	const markProcessing = <T extends { items: { id: string }[] }>(data: T, id: string): T => ({
		...data,
		items: data.items.map((g): any => (g.id === id ? { ...g, processing: true } : g))
	});

	async function approve(id: string) {
		await updateGeneration({ id, approval: 'approved' }).updates(
			statsQuery.withOverride((s) => (s ? statsApprove(s) : s)),
			pendingQuery.withOverride((p) => (p ? markProcessing(p, id) : p)),
			approvedQuery
		);
	}

	async function reject(id: string) {
		await updateGeneration({ id, approval: 'rejected' }).updates(
			statsQuery.withOverride((s) => (s ? statsReject(s) : s)),
			pendingQuery.withOverride((p) => (p ? markProcessing(p, id) : p)),
			rejectedQuery
		);
	}

	async function reset(id: string) {
		await updateGeneration({ id, approval: 'pending' }).updates(
			statsQuery,
			approvedQuery.withOverride((a) => (a ? markProcessing(a, id) : a)),
			rejectedQuery.withOverride((r) => (r ? markProcessing(r, id) : r)),
			pendingQuery
		);
	}
</script>

<Tabs value="pending" class="w-full">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-xl font-bold">Moderation Queue</h2>
		<TabsList>
			<TabsTrigger value="pending">Pending</TabsTrigger>
			<TabsTrigger value="approved">Approved</TabsTrigger>
			<TabsTrigger value="rejected">Rejected</TabsTrigger>
		</TabsList>
	</div>

	<TabsContent value="pending">
		{#if pendingQuery.loading}
			{@render loadingSkeleton()}
		{:else if pendingQuery.error}
			<div class="text-destructive">Error loading queue: {pendingQuery.error.message}</div>
		{:else if pendingQuery.ready}
			{@const items = pendingQuery.current.items as Item[]}
			{#if items.length === 0}
				<Card class="p-8 text-center text-muted-foreground">No pending submissions. All caught up! 🎉</Card>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{#each items as gen (gen.id)}
						{@render generationCard(gen, true, false)}
					{/each}
				</div>
				{@render paginationControls(pendingQuery.current.count, pendingPage, (p) => (pendingPage = p))}
			{/if}
		{/if}
	</TabsContent>

	<TabsContent value="approved">
		{#if approvedQuery.loading}
			{@render loadingSkeleton()}
		{:else if approvedQuery.error}
			<div class="text-destructive">Error loading approved: {approvedQuery.error.message}</div>
		{:else if approvedQuery.ready}
			{@const items = approvedQuery.current.items as Item[]}
			{#if items.length === 0}
				<Card class="p-8 text-center text-muted-foreground">No approved submissions found.</Card>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{#each items as gen (gen.id)}
						{@render generationCard(gen, false, true)}
					{/each}
				</div>
				{@render paginationControls(approvedQuery.current.count, approvedPage, (p) => (approvedPage = p))}
			{/if}
		{/if}
	</TabsContent>

	<TabsContent value="rejected">
		{#if rejectedQuery.loading}
			{@render loadingSkeleton()}
		{:else if rejectedQuery.error}
			<div class="text-destructive">Error loading rejected: {rejectedQuery.error.message}</div>
		{:else if rejectedQuery.ready}
			{@const items = rejectedQuery.current.items as Item[]}
			{#if items.length === 0}
				<Card class="p-8 text-center text-muted-foreground">No rejected submissions found.</Card>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{#each items as gen (gen.id)}
						{@render generationCard(gen, false, true)}
					{/each}
				</div>
				{@render paginationControls(rejectedQuery.current.count, rejectedPage, (p) => (rejectedPage = p))}
			{/if}
		{/if}
	</TabsContent>
</Tabs>

{#snippet loadingSkeleton()}
	<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
		{#each Array(4) as _}
			<Card class="p-2 animate-pulse">
				<div class="aspect-square bg-muted rounded"></div>
				<div class="h-4 bg-muted rounded w-2/3 mt-2"></div>
			</Card>
		{/each}
	</div>
{/snippet}

{#snippet paginationControls(count: number, page: number, setPage: (p: number) => void)}
	{#if count > PER_PAGE}
		<div class="py-4">
			<Pagination.Root {count} perPage={PER_PAGE} {page} onPageChange={setPage}>
				{#snippet children({ pages, currentPage })}
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.PrevButton />
						</Pagination.Item>
						{#each pages as page (page.key)}
							{#if page.type === 'ellipsis'}
								<Pagination.Item>
									<Pagination.Ellipsis />
								</Pagination.Item>
							{:else}
								<Pagination.Item>
									<Pagination.Link {page} isActive={currentPage === page.value}>
										{page.value}
									</Pagination.Link>
								</Pagination.Item>
							{/if}
						{/each}
						<Pagination.Item>
							<Pagination.NextButton />
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>
	{/if}
{/snippet}

{#snippet generationCard(gen: Item, showActions: boolean, showReset: boolean)}
	{@const lastStep = gen.steps?.[0]}
	{@const lastArtifact = lastStep?.artifacts?.[0]}
	<Card class="p-2 group relative {gen.processing ? 'opacity-60' : ''} {gen.approval === 'rejected' ? 'opacity-75' : ''}">
		<a href={resolve(`/${gen.id}`)} class="block">
			{#if lastStep && lastArtifact}
				{@const imgUrl = getArtifactUrl(gen.id, lastStep.id, lastArtifact.id)}
				{#if !failedImages.has(imgUrl)}
					<img
						src={imgUrl}
						alt={gen.prompt}
						class="w-full aspect-square object-contain bg-muted rounded {gen.approval === 'rejected' ? 'grayscale' : ''}"
						loading="lazy"
						onerror={() => {
							failedImages = new Set([...failedImages, imgUrl]);
						}} />
				{:else}
					<div class="w-full aspect-square flex flex-col items-center justify-center bg-destructive/10 text-destructive/60 rounded">
						<ImageOff class="h-6 w-6 mb-1" />
						<span class="text-xs">Image error</span>
					</div>
				{/if}
			{:else}
				<div class="w-full aspect-square bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No preview</div>
			{/if}
			<div class="mt-2">
				<div class="text-sm font-medium truncate">{gen.prompt}</div>
				<div class="text-xs text-muted-foreground/50">
					{new Date(gen.createdAt).toLocaleDateString()}
				</div>
			</div>
		</a>
		{#if showActions}
			{#if gen.processing}
				<div class="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else}
				<div class="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<Button variant="default" size="icon" class="h-8 w-8 bg-green-600 hover:bg-green-700" onclick={() => approve(gen.id)}>
						<Check class="h-4 w-4" />
					</Button>
					<Button variant="destructive" size="icon" class="h-8 w-8" onclick={() => reject(gen.id)}>
						<X class="h-4 w-4" />
					</Button>
				</div>
			{/if}
		{/if}
		{#if showReset}
			{#if gen.processing}
				<div class="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else}
				<div class="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<Button variant="secondary" size="icon" class="h-8 w-8" onclick={() => reset(gen.id)}>
						<RotateCcw class="h-4 w-4" />
					</Button>
				</div>
			{/if}
		{/if}
	</Card>
{/snippet}
