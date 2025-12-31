<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Check, LoaderCircle, Trash2, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import dbg from 'debug';
	const debug = dbg('app:components:DeleteButton');

	let {
		onConfirm,
		onCancel,
		stopPropagation = true,
		disabled = false,
		title = 'Delete'
	}: {
		onConfirm: () => void | Promise<void>;
		onCancel?: () => void;
		stopPropagation?: boolean;
		disabled?: boolean;
		title?: string;
	} = $props();

	let confirming = $state(false);
	let pending = $state(false);

	function handleStart(e: MouseEvent) {
		if (stopPropagation) e.stopPropagation();
		if (disabled) return;
		confirming = true;
	}

	async function handleConfirm(e: MouseEvent) {
		if (stopPropagation) e.stopPropagation();
		if (disabled || pending) return;
		pending = true;
		try {
			await onConfirm();
			confirming = false;
		} catch (err) {
			debug('onConfirm failed', err);
			const message = err instanceof Error ? err.message : String(err);
			toast.error('Delete failed', { description: message });
		} finally {
			pending = false;
		}
	}

	function handleCancel(e: MouseEvent) {
		if (stopPropagation) e.stopPropagation();
		if (pending) return;
		confirming = false;
		onCancel?.();
	}
</script>

{#if confirming}
	<div class="inline-flex gap-1">
		<Button
			variant="ghost"
			size="icon"
			class="text-good ring-good/30 hover:bg-good/10 transition hover:ring-1"
			onclick={handleConfirm}
			disabled={disabled || pending}
			title="Confirm delete">
			{#if pending}
				<LoaderCircle class="h-4 w-4 animate-spin" />
			{:else}
				<Check class="h-4 w-4 transition-transform hover:scale-125" />
			{/if}
		</Button>

		<Button
			variant="ghost"
			size="icon"
			class="text-destructive ring-destructive/30 hover:bg-destructive/10 transition hover:ring-1"
			onclick={handleCancel}
			disabled={disabled || pending}
			title="Cancel">
			<X class="h-4 w-4 transition-transform hover:scale-125" />
		</Button>
	</div>
{:else}
	<Button variant="destructive" size="icon" class="group" onclick={handleStart} {disabled} {title}>
		<Trash2 class="h-4 w-4 transition-transform group-hover:scale-110" />
	</Button>
{/if}
