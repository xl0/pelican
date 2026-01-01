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
	import { LucideGithub } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<header class="flex items-center justify-between">
	<nav class="flex items-center gap-4 justify-between grow">
		<div>
			<a href={resolve('/')}>
				<h1 class="text-2xl md:text-3xl font-black tracking-tight text-primary">Pelican</h1>
			</a>
		</div>
		<div class="flex gap-4">
			<a
				href={resolve('/')}
				class="font-medium {page.route.id === '/' || page.route.id === '/[id]'
					? 'text-primary'
					: 'text-muted-foreground hover:text-primary transition-colors'}">
				Create
			</a>
			<a
				href={resolve('/history')}
				class="font-medium {page.route.id === '/history' ? 'text-primary' : 'text-muted-foreground hover:text-primary transition-colors'}">
				History
			</a>
			<a
				href={resolve('/gallery')}
				class="font-medium {page.route.id === '/gallery' ? 'text-primary' : 'text-muted-foreground hover:text-primary transition-colors'}">
				Gallery
			</a>
		</div>
		<div class="flex items-center gap-4">
			{#if isAdmin}
				<a
					href={resolve('/admin')}
					class="font-medium {page.route.id === '/admin' ? 'text-primary' : 'text-muted-foreground hover:text-primary transition-colors'}">
					Admin
				</a>
			{/if}
			<Button
				variant="ghost"
				size="icon"
				href="https://github.com/xl0/pelican"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="GitHub">
				<LucideGithub class="size-5" />
			</Button>
		</div>
	</nav>
</header>
