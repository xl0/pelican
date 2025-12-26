<script lang="ts">
	import { DollarSign } from '@lucide/svelte';
	import type { Step } from '$lib/server/db/schema';

	interface Props {
		generations?: Partial<Step>[];
	}

	let { generations = [] }: Props = $props();

	function formatCost(cost: number): string {
		if (cost === 0) return '$0.00';
		if (cost < 0.01) return `$${cost.toFixed(4)}`;
		return `$${cost.toFixed(3)}`;
	}

	function formatTokens(tokens: number): string {
		if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
		if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
		return tokens.toString();
	}

	const totalCost = $derived(
		generations.reduce((sum, g) => sum + (Number((g as any).cost) || Number(g.inputCost || 0) + Number(g.outputCost || 0)), 0)
	);
	const totalInputTokens = $derived(generations.reduce((sum, g) => sum + (Number(g.inputTokens) || 0), 0));
	const totalOutputTokens = $derived(generations.reduce((sum, g) => sum + (Number(g.outputTokens) || 0), 0));
</script>

{#if totalCost > 0}
	<div class="border-t border-border pt-3 mt-3">
		<div class="flex items-center justify-between py-1.5 px-2 bg-muted">
			<div class="flex items-center gap-2">
				<DollarSign class="h-3 w-3 text-success" />
				<span class="text-xs font-semibold text-foreground">Project Cost</span>
			</div>
			<div class="flex items-center gap-3 text-xs">
				<span class="text-muted-foreground">{formatTokens(totalInputTokens)}→{formatTokens(totalOutputTokens)}</span>
				<span class="font-bold text-success">{formatCost(totalCost)}</span>
			</div>
		</div>
	</div>
{/if}
