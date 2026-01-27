<script lang="ts">
	import {
		getProvidersWithModels,
		insertProvider,
		updateProvider,
		deleteProvider,
		insertModel,
		updateModel,
		deleteModel
	} from '$lib/data.remote';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Check, ChevronDown, Pencil, Plus, Save, X } from '@lucide/svelte';

	let providersQuery = getProvidersWithModels();

	type ProvidersData = NonNullable<typeof providersQuery.current>;
	type ProviderItem = ProvidersData[number];
	type ModelItem = ProviderItem['models'][number];

	// Editing state
	let editingModel = $state<number | null>(null);
	let editingProvider = $state<string | null>(null);
	let newProviderForm = $state({ id: '', label: '', sortOrder: 0, apiKeyUrl: '' });
	let showNewProviderForm = $state(false);
	let newModelForms = $state<
		Record<
			string,
			{ value: string; label: string; inputPrice: number; outputPrice: number; supportsImages: boolean; rating: number; comment: string }
		>
	>({});
	let showNewModelForm = $state<string | null>(null);
	let modelEdits = $state<Record<number, Partial<ModelItem>>>({});
	let providerEdits = $state<Record<string, Partial<ProviderItem>>>({});

	function startEditModel(model: ModelItem) {
		editingModel = model.id;
		modelEdits[model.id] = { ...model };
	}

	function cancelEditModel() {
		if (editingModel !== null) delete modelEdits[editingModel];
		editingModel = null;
	}

	async function saveModel(model: ModelItem) {
		const edits = modelEdits[model.id];
		if (!edits) return;
		await updateModel({
			id: model.id,
			value: edits.value,
			label: edits.label,
			inputPrice: edits.inputPrice,
			outputPrice: edits.outputPrice,
			supportsImages: edits.supportsImages,
			rating: edits.rating,
			comment: edits.comment || null
		}).updates(providersQuery);
		delete modelEdits[model.id];
		editingModel = null;
	}

	async function handleDeleteModel(id: number) {
		await deleteModel({ id }).updates(providersQuery);
	}

	function startEditProvider(provider: ProviderItem) {
		editingProvider = provider.id;
		providerEdits[provider.id] = { ...provider };
	}

	function cancelEditProvider() {
		if (editingProvider !== null) delete providerEdits[editingProvider];
		editingProvider = null;
	}

	async function saveProvider(provider: ProviderItem) {
		const edits = providerEdits[provider.id];
		if (!edits) return;
		await updateProvider({
			id: provider.id,
			label: edits.label,
			sortOrder: edits.sortOrder,
			apiKeyUrl: edits.apiKeyUrl || null
		}).updates(providersQuery);
		delete providerEdits[provider.id];
		editingProvider = null;
	}

	async function handleDeleteProvider(id: string) {
		await deleteProvider({ id }).updates(providersQuery);
	}

	async function handleAddProvider() {
		if (!newProviderForm.id || !newProviderForm.label) return;
		await insertProvider({ ...newProviderForm, apiKeyUrl: newProviderForm.apiKeyUrl || null }).updates(providersQuery);
		newProviderForm = { id: '', label: '', sortOrder: 0, apiKeyUrl: '' };
		showNewProviderForm = false;
	}

	function initNewModelForm(providerId: string) {
		newModelForms[providerId] = { value: '', label: '', inputPrice: 0, outputPrice: 0, supportsImages: true, rating: 0, comment: '' };
		showNewModelForm = providerId;
	}

	async function handleAddModel(providerId: string) {
		const form = newModelForms[providerId];
		if (!form?.value || !form?.label) return;
		await insertModel({ providerId, ...form, comment: form.comment || null }).updates(providersQuery);
		delete newModelForms[providerId];
		showNewModelForm = null;
	}

	function cancelNewModel(providerId: string) {
		delete newModelForms[providerId];
		showNewModelForm = null;
	}
</script>

<section class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-bold">Providers & Models</h2>
		{#if !showNewProviderForm}
			<Button size="sm" variant="outline" onclick={() => (showNewProviderForm = true)}>
				<Plus class="h-4 w-4 mr-1" />
				Add Provider
			</Button>
		{/if}
	</div>

	{#if showNewProviderForm}
		<Card class="p-4 gap-2">
			<div class="text-sm font-medium mb-3">New Provider</div>
			<div class="grid grid-cols-1 md:grid-cols-5 gap-3">
				<Input bind:value={newProviderForm.id} placeholder="ID (e.g. openai)" class="font-mono text-sm" />
				<Input bind:value={newProviderForm.label} placeholder="Display Label" />
				<Input type="number" bind:value={newProviderForm.sortOrder} placeholder="Sort Order" />
				<Input bind:value={newProviderForm.apiKeyUrl} placeholder="API Key URL" class="text-sm" />
				<div class="flex gap-2 ml-auto">
					<Button size="sm" onclick={handleAddProvider} disabled={!newProviderForm.id || !newProviderForm.label}>
						<Check class="h-4 w-4 mr-1" />
						Add
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onclick={() => {
							showNewProviderForm = false;
							newProviderForm = { id: '', label: '', sortOrder: 0, apiKeyUrl: '' };
						}}>
						Cancel
					</Button>
				</div>
			</div>
		</Card>
	{/if}

	{#if providersQuery.loading}
		<div class="space-y-3">
			{#each Array(3) as _}
				<Card class="p-4 animate-pulse">
					<div class="h-6 bg-muted rounded w-1/4"></div>
				</Card>
			{/each}
		</div>
	{:else if providersQuery.error}
		<div class="text-destructive">Error loading providers: {providersQuery.error.message}</div>
	{:else if providersQuery.ready}
		<div class="space-y-3">
			{#each providersQuery.current as provider (provider.id)}
				<Card class="overflow-hidden gap-2 p-0">
					<Collapsible.Root>
						<!-- Provider Header -->
						<div class="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
							<Collapsible.Trigger class="flex items-center gap-3 flex-1 group text-left">
								<ChevronDown class="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
								{#if editingProvider === provider.id}
									<Input
										class="w-32 h-8"
										bind:value={providerEdits[provider.id].label}
										onclick={(e) => e.stopPropagation()}
										placeholder="Label" />
								{:else}
									<span class="font-semibold">{provider.label}</span>
								{/if}
								<span class="text-xs text-muted-foreground font-mono">({provider.id})</span>
								<span class="text-xs text-muted-foreground">{provider.models.length} models</span>
							</Collapsible.Trigger>
							<div class="flex items-center gap-2">
								{#if editingProvider === provider.id}
									<Input
										type="number"
										class="w-16 h-8"
										bind:value={providerEdits[provider.id].sortOrder}
										placeholder="#"
										title="Sort order" />
									<Input class="w-48 h-8 text-xs" bind:value={providerEdits[provider.id].apiKeyUrl} placeholder="API Key URL" />
									<Button size="icon" variant="ghost" class="h-8 w-8" onclick={() => saveProvider(provider)}>
										<Save class="h-4 w-4" />
									</Button>
									<Button size="icon" variant="ghost" class="h-8 w-8" onclick={cancelEditProvider}>
										<X class="h-4 w-4" />
									</Button>
								{:else}
									<Button size="icon" variant="ghost" class="h-8 w-8" onclick={() => startEditProvider(provider)}>
										<Pencil class="h-4 w-4" />
									</Button>
									<DeleteButton onConfirm={() => handleDeleteProvider(provider.id)} title="Delete provider" />
								{/if}
							</div>
						</div>

						<!-- Expanded Models -->
						<Collapsible.Content>
							<div class="border-t border-border">
								<!-- Model Table Header -->
								<div
									class="grid grid-cols-[1fr_1fr_80px_80px_50px_60px_60px] gap-2 px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
									<div>Model ID</div>
									<div>Label</div>
									<div class="text-right">In $/1M</div>
									<div class="text-right">Out $/1M</div>
									<div class="text-center">Img</div>
									<div class="text-center">Rating</div>
									<div></div>
								</div>

								<!-- Model Rows -->
								{#each provider.models as model (model.id)}
									<div class="border-t border-border/50">
										{#if editingModel === model.id}
											<div class="grid grid-cols-[1fr_1fr_80px_80px_50px_60px_60px] gap-2 px-4 py-2 items-center text-sm">
												<div>
													<Input class="h-8 font-mono text-xs" bind:value={modelEdits[model.id].value} />
												</div>
												<div>
													<Input class="h-8" bind:value={modelEdits[model.id].label} />
												</div>
												<div>
													<Input type="number" step="0.01" class="h-8 text-right" bind:value={modelEdits[model.id].inputPrice} />
												</div>
												<div>
													<Input type="number" step="0.01" class="h-8 text-right" bind:value={modelEdits[model.id].outputPrice} />
												</div>
												<div class="flex justify-center">
													<Switch bind:checked={modelEdits[model.id].supportsImages} />
												</div>
												<div>
													<Select
														type="single"
														value={String(modelEdits[model.id].rating ?? 0)}
														onValueChange={(v) => (modelEdits[model.id].rating = Number(v))}>
														<SelectTrigger class="h-8 w-full text-center">
															{modelEdits[model.id].rating === -1
																? '👎'
																: modelEdits[model.id].rating === 0
																	? '—'
																	: '👍'.repeat(modelEdits[model.id].rating ?? 0)}
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="-1">👎</SelectItem>
															<SelectItem value="0">—</SelectItem>
															<SelectItem value="1">👍</SelectItem>
															<SelectItem value="2">👍👍</SelectItem>
															<SelectItem value="3">👍👍👍</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div class="flex justify-end gap-1">
													<Button size="icon" variant="ghost" class="h-7 w-7" onclick={() => saveModel(model)}>
														<Save class="h-3 w-3" />
													</Button>
													<Button size="icon" variant="ghost" class="h-7 w-7" onclick={cancelEditModel}>
														<X class="h-3 w-3" />
													</Button>
												</div>
											</div>
											<!-- Comment row -->
											<div class="px-4 pb-2">
												<Input class="h-8 text-sm" bind:value={modelEdits[model.id].comment} placeholder="Comment (optional)" />
											</div>
										{:else}
											<div class="grid grid-cols-[1fr_1fr_80px_80px_50px_60px_60px] gap-2 px-4 py-2 items-center text-sm">
												<div class="font-mono text-xs truncate" title={model.value}>{model.value}</div>
												<div class="truncate">{model.label}</div>
												<div class="text-right text-muted-foreground">${model.inputPrice.toFixed(2)}</div>
												<div class="text-right text-muted-foreground">${model.outputPrice.toFixed(2)}</div>
												<div class="text-center">{model.supportsImages ? '✓' : '—'}</div>
												<div class="text-center">{model.rating < 0 ? '👎' : model.rating > 0 ? '👍'.repeat(model.rating) : '—'}</div>
												<div class="flex justify-end gap-1">
													<Button size="icon" variant="ghost" class="h-7 w-7" onclick={() => startEditModel(model)}>
														<Pencil class="h-3 w-3" />
													</Button>
													<DeleteButton onConfirm={() => handleDeleteModel(model.id)} title="Delete model" />
												</div>
											</div>
											{#if model.comment}
												<div class="px-4 pb-2 text-xs text-muted-foreground italic">{model.comment}</div>
											{/if}
										{/if}
									</div>
								{/each}

								<!-- Add Model Form -->
								{#if showNewModelForm === provider.id}
									<div class="border-t border-border/50 bg-muted/20">
										<div class="grid grid-cols-[1fr_1fr_80px_80px_50px_60px_60px] gap-2 px-4 py-2 items-center">
											<div>
												<Input class="h-8 font-mono text-xs" bind:value={newModelForms[provider.id].value} placeholder="model-id" />
											</div>
											<div>
												<Input class="h-8" bind:value={newModelForms[provider.id].label} placeholder="Display Name" />
											</div>
											<div>
												<Input type="number" step="0.01" class="h-8 text-right" bind:value={newModelForms[provider.id].inputPrice} />
											</div>
											<div>
												<Input type="number" step="0.01" class="h-8 text-right" bind:value={newModelForms[provider.id].outputPrice} />
											</div>
											<div class="flex justify-center">
												<Switch bind:checked={newModelForms[provider.id].supportsImages} />
											</div>
											<div>
												<Select
													type="single"
													value={String(newModelForms[provider.id].rating)}
													onValueChange={(v) => (newModelForms[provider.id].rating = Number(v))}>
													<SelectTrigger class="h-8 w-full text-center">
														{newModelForms[provider.id].rating === -1
															? '👎'
															: newModelForms[provider.id].rating === 0
																? '—'
																: '👍'.repeat(newModelForms[provider.id].rating)}
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="-1">👎</SelectItem>
														<SelectItem value="0">—</SelectItem>
														<SelectItem value="1">👍</SelectItem>
														<SelectItem value="2">👍👍</SelectItem>
														<SelectItem value="3">👍👍👍</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div class="flex justify-end gap-1">
												<Button size="icon" variant="ghost" class="h-7 w-7" onclick={() => handleAddModel(provider.id)}>
													<Check class="h-3 w-3" />
												</Button>
												<Button size="icon" variant="ghost" class="h-7 w-7" onclick={() => cancelNewModel(provider.id)}>
													<X class="h-3 w-3" />
												</Button>
											</div>
										</div>
										<!-- Comment row -->
										<div class="px-4 pb-2">
											<Input class="h-8 text-sm" bind:value={newModelForms[provider.id].comment} placeholder="Comment (optional)" />
										</div>
									</div>
								{:else}
									<button
										class="w-full px-4 py-2 border-t border-border/50 text-sm text-muted-foreground hover:bg-muted/30 flex items-center gap-2"
										onclick={() => initNewModelForm(provider.id)}>
										<Plus class="h-4 w-4" />
										Add model
									</button>
								{/if}
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				</Card>
			{/each}
		</div>
	{/if}
</section>
