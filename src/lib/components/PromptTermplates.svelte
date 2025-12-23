<script lang="ts">
	import PromptEditor from '$lib/components/PromptEditor.svelte';
</script>

<div class="space-y-3">
	<PromptEditor isInitialPrompt={true} />
	<PromptEditor isInitialPrompt={false} />
</div>
