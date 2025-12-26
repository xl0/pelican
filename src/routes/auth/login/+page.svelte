<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-background p-4">
	<div class="w-full max-w-sm space-y-6">
		<div class="text-center">
			<h1 class="text-2xl font-bold">Login / Register</h1>
			{#if data.isAnonymous}
				<p class="text-sm text-muted-foreground mt-2">You're currently anonymous. Register to save your account permanently.</p>
			{/if}
		</div>

		<form method="post" action="?/login" use:enhance class="space-y-4">
			<div class="space-y-2">
				<Label for="username">Username</Label>
				<Input id="username" name="username" placeholder="username" required />
			</div>
			<div class="space-y-2">
				<Label for="password">Password</Label>
				<Input id="password" name="password" type="password" placeholder="••••••" required />
			</div>

			{#if form?.message}
				<p class="text-sm text-destructive">{form.message}</p>
			{/if}

			<div class="flex gap-2">
				<Button type="submit" class="flex-1">Login</Button>
				<Button type="submit" formaction="?/register" variant="outline" class="flex-1">
					{data.isAnonymous ? 'Register (keep data)' : 'Register'}
				</Button>
			</div>
		</form>

		<div class="text-center">
			<a href="/" class="text-sm text-muted-foreground hover:text-foreground">← Back to app</a>
		</div>
	</div>
</div>
