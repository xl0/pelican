<script lang="ts">
	import { getAdminStats } from '$lib/data.remote';
	import { Card } from '$lib/components/ui/card';
	import { Clock, Image, Users } from '@lucide/svelte';

	let statsQuery = getAdminStats();
</script>

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
	{@const stats = statsQuery.current}
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
				{stats.generations.gallery} gallery · {stats.generations.shared} shared
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
