<script lang="ts">
  import { appState } from "$lib/state.svelte";
  import { DollarSign, Zap, TrendingUp } from "@lucide/svelte";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import { Button } from "$lib/components/ui/button";

  let showDetails = $state(false);

  function formatCost(cost: number): string {
    if (cost === 0) return "$0.00";
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(3)}`;
  }

  function formatTokens(tokens: number): string {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  }
</script>

{#if appState.totalCost > 0 || appState.generationCosts.length > 0}
  <div class="border-t border-slate-300 dark:border-slate-700 pt-3 mt-3">
    <Collapsible.Root bind:open={showDetails}>
      <Collapsible.Trigger class="flex items-center justify-between w-full py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
        <div class="flex items-center gap-2">
          <DollarSign class="h-3 w-3 text-green-600 dark:text-green-500" />
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Cost Tracking</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-green-600 dark:text-green-500">{formatCost(appState.totalCost)}</span>
          <svg
            class="h-3 w-3 transition-transform {showDetails ? 'rotate-180' : ''}"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </Collapsible.Trigger>
      <Collapsible.Content class="pt-3 space-y-2">
        <!-- Session Summary -->
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-1">
              <Zap class="h-3 w-3" />
              <span>Session Total</span>
            </div>
            <div class="font-bold text-slate-900 dark:text-slate-100">{formatCost(appState.totalCost)}</div>
          </div>
          <div class="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-1">
              <TrendingUp class="h-3 w-3" />
              <span>Last Generation</span>
            </div>
            <div class="font-bold text-slate-900 dark:text-slate-100">{formatCost(appState.lastGenerationCost)}</div>
          </div>
        </div>

        <!-- Token Usage -->
        <div class="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">Token Usage</div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-slate-600 dark:text-slate-400">Input:</span>
              <span class="font-mono font-semibold text-slate-900 dark:text-slate-100 ml-1">{formatTokens(appState.sessionInputTokens)}</span>
            </div>
            <div>
              <span class="text-slate-600 dark:text-slate-400">Output:</span>
              <span class="font-mono font-semibold text-slate-900 dark:text-slate-100 ml-1">{formatTokens(appState.sessionOutputTokens)}</span>
            </div>
          </div>
        </div>

        <!-- Per-Step Breakdown -->
        {#if appState.generationCosts.length > 0}
          <div class="space-y-1">
            <div class="text-xs font-semibold text-slate-700 dark:text-slate-300">Step Breakdown</div>
            <div class="max-h-32 overflow-y-auto space-y-1">
              {#each appState.generationCosts as stepCost}
                <div class="flex items-center justify-between text-xs p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span class="text-slate-600 dark:text-slate-400">Step {stepCost.step}</span>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[10px] text-slate-500">
                      {formatTokens(stepCost.inputTokens)}→{formatTokens(stepCost.outputTokens)}
                    </span>
                    <span class="font-semibold text-green-600 dark:text-green-500">{formatCost(stepCost.cost)}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Reset Button -->
        <Button
          variant="outline"
          size="sm"
          class="w-full h-7 text-xs"
          onclick={() => appState.resetCostTracking()}
        >
          Reset Session Costs
        </Button>
      </Collapsible.Content>
    </Collapsible.Root>
  </div>
{/if}
