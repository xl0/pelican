<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';

	interface Props {
		inputTokens: number;
		outputTokens: number;
		inputCost: number;
		outputCost: number;
	}

	let { inputTokens, outputTokens, inputCost, outputCost }: Props = $props();

	const totalCost = $derived(inputCost + outputCost);

	function formatCost(cost: number): string {
		if (cost === 0) return '$0.00';
		if (cost < 0.01) return `$${cost.toFixed(4)}`;
		if (cost < 0.1) return `$${cost.toFixed(3)}`;
		return `$${cost.toFixed(2)}`;
	}

	function formatTokens(tokens: number): string {
		if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
		if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
		return tokens.toLocaleString();
	}
</script>

{#if totalCost > 0 || inputTokens > 0 || outputTokens > 0}
	<Popover.Root>
		<Popover.Trigger class="text-xs font-semibold text-orange-500 hover:text-orange-600 cursor-pointer">
			{formatCost(totalCost)}
		</Popover.Trigger>
		<Popover.Content class="w-48 p-3" align="start">
			<div class="space-y-2 text-xs">
				<div class="flex justify-between">
					<span class="text-muted-foreground">Input tokens</span>
					<span class="font-medium">{formatTokens(inputTokens)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground">Output tokens</span>
					<span class="font-medium">{formatTokens(outputTokens)}</span>
				</div>
				<div class="border-t border-border pt-2 flex justify-between">
					<span class="text-muted-foreground">Input cost</span>
					<span class="font-medium">{formatCost(inputCost)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground">Output cost</span>
					<span class="font-medium">{formatCost(outputCost)}</span>
				</div>
				<div class="border-t border-border pt-2 flex justify-between font-semibold">
					<span>Total</span>
					<span class="text-orange-500">{formatCost(totalCost)}</span>
				</div>
			</div>
		</Popover.Content>
	</Popover.Root>
{/if}
