<script lang="ts">
	import { resolve } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { approveGeneration, getAdminStats, getPendingModerationGenerations, rejectGeneration } from '$lib/data.remote';
	import { getRenderedArtifactUrl } from '$lib/utils';
	import { Check, Clock, Image, Loader2, Users, X } from '@lucide/svelte';

	let statsQuery = getAdminStats();
	let pendingQuery = getPendingModerationGenerations({ limit: 50 });

	type Stats = NonNullable<typeof statsQuery.current>;
	type Pending = NonNullable<typeof pendingQuery.current>;
	type PendingItem = Pending['items'][number] & { processing?: boolean };

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

	const pendingMarkProcessing = (p: Pending, id: string) => ({
		...p,
		items: p.items.map((g): PendingItem => (g.id === id ? { ...g, processing: true } : g))
	});

	async function approve(id: string) {
		await approveGeneration({ id }).updates(
			statsQuery.withOverride((s) => (s ? statsApprove(s) : s)),
			pendingQuery.withOverride((p) => (p ? pendingMarkProcessing(p, id) : p))
		);
	}

	async function reject(id: string) {
		await rejectGeneration({ id }).updates(
			statsQuery.withOverride((s) => (s ? statsReject(s) : s)),
			pendingQuery.withOverride((p) => (p ? pendingMarkProcessing(p, id) : p))
		);
	}
</script>

<svelte:head>
	<title>Admin - Pelican</title>
</svelte:head>
<div class="min-h-screen bg-background">
	<div class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="mx-auto max-w-7xl px-3 py-3">
			<Header isAdmin={true}></Header>
		</div>
	</div>

	<!-- <pre>{JSON.stringify(statsQuery.current, null, 2)}</pre> -->
	<main class="mx-auto max-w-7xl px-3 py-6 space-y-6">
		<!-- Stats Cards -->
		{#if statsQuery.loading}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				{#each Array(3) as _}
					<Card class="p-4 animate-pulse">
						<div class="h-6 bg-muted rounded w-1/3 mb-2"></div>
						<div class="h-10 bg-muted rounded w-1/2"></div>
					</Card>
				{/each}
			</div>
		{:else if statsQuery.error}
			<div class="text-destructive">Error loading stats: {statsQuery.error.message}</div>
		{:else if statsQuery.current}
			<!-- {#if !statsQuery.current}
				{@debug}
			{/if} -->
			{@const stats = statsQuery.current!}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card class="p-4 gap-2 h-full">
					<div class="flex items-center gap-2 text-muted-foreground mb-2">
						<Users class="h-4 w-4" />
						<span class="text-sm font-medium">Users</span>
					</div>
					<div class="text-3xl font-bold">{stats.users.total}</div>
					<div class="text-sm text-muted-foreground mt-1">
						{stats.users.anon} anonymous · {stats.users.registered} registered
					</div>
				</Card>

				<Card class="p-4 gap-2 h-full">
					<div class="flex items-center gap-2 text-muted-foreground mb-2">
						<Image class="h-4 w-4" />
						<span class="text-sm font-medium">Generations</span>
					</div>
					<div class="text-3xl font-bold">{stats.generations.total}</div>
					<div class="text-sm text-muted-foreground mt-1">
						{stats.generations.approved} approved · {stats.generations.rejected} rejected
					</div>
					<div class="text-xs text-muted-foreground/60 mt-0.5">
						{stats.generations.public} public · {stats.generations.shared} shared
					</div>
				</Card>

				<Card class="p-4 gap-2 h-full">
					<div class="flex items-center gap-2 text-muted-foreground mb-2">
						<Clock class="h-4 w-4" />
						<span class="text-sm font-medium">Pending Moderation</span>
					</div>
					<div class="text-3xl font-bold {stats.pendingModeration > 0 ? 'text-orange-500' : ''}">
						{stats.pendingModeration}
					</div>
					<div class="text-sm text-muted-foreground mt-1">submissions awaiting review</div>
				</Card>
			</div>
		{/if}

		<Separator />

		<!-- Moderation Queue -->
		<div>
			<h2 class="text-xl font-bold mb-4">Moderation Queue</h2>
			{#if pendingQuery.loading}
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{#each Array(4) as _}
						<Card class="p-2 animate-pulse">
							<div class="aspect-square bg-muted rounded"></div>
							<div class="h-4 bg-muted rounded w-2/3 mt-2"></div>
						</Card>
					{/each}
				</div>
			{:else if pendingQuery.error}
				<div class="text-destructive">Error loading queue: {pendingQuery.error.message}</div>
			{:else if pendingQuery.ready}
				{@const items = pendingQuery.current.items as PendingItem[]}
				{#if items.length === 0}
					<Card class="p-8 text-center text-muted-foreground">No pending submissions. All caught up! 🎉</Card>
				{:else}
					<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
						{#each items as gen (gen.id)}
							{@const lastStep = gen.steps?.[0]}
							{@const lastArtifact = lastStep?.artifacts?.[0]}
							<Card class="p-2 group relative {gen.processing ? 'opacity-60' : ''}">
								<a href={resolve(`/${gen.id}`)} class="block">
									{#if lastStep && lastArtifact}
										{@const imgUrl = getRenderedArtifactUrl(gen.id, lastStep.id, lastArtifact.id)}
										<img src={imgUrl} alt={gen.prompt} class="w-full aspect-square object-contain bg-muted rounded" loading="lazy" />
									{:else}
										<div class="w-full aspect-square bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
											No preview
										</div>
									{/if}
									<div class="mt-2">
										<div class="text-sm font-medium truncate">{gen.prompt}</div>
										<div class="text-xs text-muted-foreground/50">
											{new Date(gen.createdAt).toLocaleDateString()}
										</div>
									</div>
								</a>
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
							</Card>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</main>
	<!-- pending
	<pre>{JSON.stringify(pending, null, 2)}</pre> -->
</div>
