<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import AdminStats from '$lib/components/admin/AdminStats.svelte';
	import ModerationQueue from '$lib/components/admin/ModerationQueue.svelte';
	import ProvidersEditor from '$lib/components/admin/ProvidersEditor.svelte';
	import { Separator } from '$lib/components/ui/separator';
</script>

<svelte:head>
	<title>Admin - Pelican</title>
</svelte:head>
<div class="min-h-screen bg-background pb-20">
	<div class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="mx-auto max-w-7xl px-3 py-3">
			<Header isAdmin={true}></Header>
		</div>
	</div>

	<main class="mx-auto max-w-7xl px-3 py-6 space-y-6">
		<AdminStats />

		<Separator />

		<ModerationQueue />

		<Separator />

		<ProvidersEditor />
	</main>
</div>
