<script lang="ts">
	import dbg from 'debug';
	const debug = dbg('app:GalleryGrid');
	import * as Card from '$lib/components/ui/card';
	import * as Pagination from '$lib/components/ui/pagination';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { getPublicGenerations } from '$lib/data.remote';
	import { getArtifactUrl } from '$lib/utils';
	import { formatDistanceToNow } from 'date-fns';
	import { MediaQuery } from 'svelte/reactivity';
	import { ImageOff } from '@lucide/svelte';

	type Query = ReturnType<typeof getPublicGenerations>;
	type Data = NonNullable<Query['current']>;
	type Item = Data['items'][number];

	interface Props {
		query: Query;
		perPage?: number;
		currentPage: number;
		onPageChange: (page: number) => void;
		dateField?: 'createdAt' | 'updatedAt';
	}

	let { query, perPage = 20, currentPage, onPageChange, dateField = 'createdAt' }: Props = $props();

	function getPreviewUrl(gen: Item): string | null {
		const step = gen.steps?.[0];
		const artifact = step?.artifacts?.[0];
		if (!step || !artifact) return null;
		return getArtifactUrl(gen.id, step.id, artifact.id);
	}

	function distributeToColumns<T>(items: T[], numColumns: number): T[][] {
		const columns: T[][] = Array.from({ length: numColumns }, () => []);
		items.forEach((item, i) => columns[i % numColumns].push(item));
		return columns;
	}

	const xl = new MediaQuery('min-width: 1280px');
	const lg = new MediaQuery('min-width: 1024px');
	const sm = new MediaQuery('min-width: 640px');
	const columnCount = $derived(xl.current ? 5 : lg.current ? 4 : sm.current ? 3 : 2);

	const columns = $derived(query.current ? distributeToColumns(query.current.items, columnCount) : []);

	// Track failed image URLs
	let failedImages = $state(new Set<string>());
</script>

{#if query.loading}
	<div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
		{#each Array(8) as _}
			<Card.Root class="overflow-hidden">
				<div class="aspect-square bg-muted">
					<Skeleton class="w-full h-full" />
				</div>
				<div class="p-2">
					<Skeleton class="h-4 w-3/4 mb-2" />
					<Skeleton class="h-3 w-full" />
				</div>
			</Card.Root>
		{/each}
	</div>
{:else if query.error}
	<div class="flex items-center justify-center py-20">
		<Card.Root class="max-w-sm border-destructive">
			<Card.Header class="text-center py-3">
				<Card.Title class="text-destructive text-base">Failed to load</Card.Title>
				<Card.Description class="text-xs">{query.error.message}</Card.Description>
			</Card.Header>
			<Card.Footer class="justify-center py-2">
				<button onclick={() => query.refresh?.()} class="text-sm text-primary hover:underline">Retry</button>
			</Card.Footer>
		</Card.Root>
	</div>
{:else if query.current}
	{@const data = query.current}
	<div class="flex flex-col pb-20">
		<div class="flex gap-4">
			{#each columns as column}
				<div class="flex-1 flex flex-col gap-4 w-20">
					{#each column as gen (gen.id)}
						{@const previewUrl = getPreviewUrl(gen)}
						{@const date = dateField === 'updatedAt' ? gen.updatedAt : gen.createdAt}
						<a href="/{gen.id}" class="group block">
							<Card.Root
								class="overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg group-hover:-translate-y-0.5 py-0 gap-2">
								{#if previewUrl && !failedImages.has(previewUrl)}
									<img
										src={previewUrl}
										alt={gen.prompt}
										class="w-full h-auto"
										loading="lazy"
										onerror={() => {
											debug('failed to load', previewUrl);
											failedImages = new Set([...failedImages, previewUrl]);
										}} />
								{:else if previewUrl && failedImages.has(previewUrl)}
									<div class="w-full aspect-square flex flex-col items-center justify-center bg-destructive/10 text-destructive/60">
										<ImageOff class="h-8 w-8 mb-1" />
										<span class="text-xs">Image error</span>
									</div>
								{:else}
									<div class="w-full aspect-square flex items-center justify-center bg-muted">
										<span class="text-muted-foreground text-sm">No preview</span>
									</div>
								{/if}
								<div class="p-2">
									<p class="text-sm font-medium truncate group-hover:text-primary">{gen.prompt}</p>
									{#if date}
										<p class="text-xs text-muted-foreground mt-1">{formatDistanceToNow(date, { addSuffix: true })}</p>
									{/if}
								</div>
							</Card.Root>
						</a>
					{/each}
				</div>
			{/each}
		</div>

		<!-- Pagination - fixed at bottom -->
		{#if data.count > perPage}
			<div class="fixed bottom-0 left-0 right-0 py-4 bg-background/95 backdrop-blur-sm z-10">
				<div class="flex justify-center">
					<Pagination.Root count={data.count} {perPage} page={currentPage} onPageChange={(p) => onPageChange(p)}>
						{#snippet children({ pages, currentPage: cp })}
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
											<Pagination.Link {page} isActive={cp === page.value}>
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
			</div>
		{/if}
	</div>
{/if}
