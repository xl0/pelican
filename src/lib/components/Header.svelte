<script lang="ts">
import dbg from 'debug';
	const debug = dbg('app:Header');
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	interface Props {
		isAdmin?: boolean;
	}
	let { isAdmin = false }: Props = $props();
</script>

<header class="flex items-center justify-between">
	<div>
		<a href={resolve('/')}>
			<h1 class="text-2xl md:text-3xl font-black tracking-tight text-primary">Pelican</h1>
		</a>
	</div>
	<nav class="flex items-center gap-4">
		<a
			href={resolve('/')}
			class="text-sm font-medium {page.route.id === '/' || page.route.id === '/[id]'
				? 'text-primary'
				: 'text-muted-foreground hover:text-primary transition-colors'}">
			Create
		</a>
		<a
			href={resolve('/history')}
			class="text-sm font-medium {page.route.id === '/history'
				? 'text-primary'
				: 'text-muted-foreground hover:text-primary transition-colors'}">
			History
		</a>
		<a
			href={resolve('/gallery')}
			class="text-sm font-medium {page.route.id === '/gallery'
				? 'text-primary'
				: 'text-muted-foreground hover:text-primary transition-colors'}">
			Gallery
		</a>
		{#if isAdmin}
			<a
				href={resolve('/admin')}
				class="text-sm font-medium {page.route.id === '/admin'
					? 'text-primary'
					: 'text-muted-foreground hover:text-primary transition-colors'}">
				Admin
			</a>
		{/if}
	</nav>
</header>
