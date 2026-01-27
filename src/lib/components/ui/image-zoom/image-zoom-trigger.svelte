<script lang="ts">
	import { getImageZoomContext } from './ctx';
	import { cn } from '$lib/utils';
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { onMount } from 'svelte';

	type Props = HTMLImgAttributes & {
		class?: string;
	};

	let { src, alt, class: className, ...rest }: Props = $props();

	const { registerImage, updateImage, openImage } = getImageZoomContext();

	let myIndex: number | undefined = $state();
	let prevSrc: string | undefined;

	onMount(() => {
		if (!src) {
			console.warn("ImageZoom.Trigger requires a 'src' prop.");
			return;
		}
		myIndex = registerImage({ src, alt: alt || '' });
		prevSrc = src;
	});

	// Keep registered image in sync with current src (only when src changes)
	$effect(() => {
		if (myIndex !== undefined && src && src !== prevSrc) {
			prevSrc = src;
			updateImage(myIndex, { src, alt: alt || '' });
		}
	});

	function handleOpenZoom() {
		if (myIndex !== undefined) {
			openImage(myIndex);
		}
	}
</script>

<img
	src={src || ''}
	alt={alt || ''}
	class={cn('cursor-zoom-in transition-transform duration-200 hover:scale-[1.01] hover:brightness-90', className)}
	onclick={handleOpenZoom}
	{...rest} />
