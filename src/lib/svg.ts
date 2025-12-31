import { mount, unmount } from 'svelte';
import { exportSvg, svgStringToPng } from 'svelte-asciiart';
import AsciiRenderer from './components/AsciiRenderer.svelte';

const ASCII_MARGIN = 1;

/**
 * Render ASCII art to SVG string by mounting AsciiRenderer off-screen.
 * Uses svelte-asciiart's exportSvg to extract computed styles properly.
 */
export function renderAsciiToSvg(text: string, cols?: number, rows?: number): string {
	const container = document.createElement('div');
	container.style.position = 'absolute';
	container.style.left = '-9999px';
	container.style.top = '-9999px';
	document.body.appendChild(container);

	const component = mount(AsciiRenderer, {
		target: container,
		props: { text, rows, cols, margin: ASCII_MARGIN }
	});

	const svg = container.querySelector('svg');
	if (!svg) {
		unmount(component);
		container.remove();
		throw new Error('Failed to render AsciiArt SVG');
	}

	// Get computed background color from wrapper
	const wrapperDiv = container.querySelector('div');
	const bgColor = wrapperDiv ? getComputedStyle(wrapperDiv).backgroundColor : '#1a1a1a';

	// Use library's exportSvg - it handles style extraction properly
	const svgString = exportSvg(svg, { includeBackground: true, backgroundColor: bgColor });

	unmount(component);
	container.remove();

	return svgString;
}

/**
 * Convert ASCII art text to PNG Blob using off-screen rendering.
 */
export function asciiToPngBlob(text: string, cols?: number, rows?: number): Promise<Blob> {
	const svg = renderAsciiToSvg(text, cols, rows);
	return svgStringToPng(svg, { output: 'blob' });
}
