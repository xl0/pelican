import { mount, unmount } from 'svelte';
import AsciiRenderer from './components/AsciiRenderer.svelte';

/**
 * Convert SVG string to PNG Blob.
 */
export function svgToPngBlob(svgString: string, width: number, height: number, bgColor = 'white'): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Could not get canvas context'));
				return;
			}
			ctx.fillStyle = bgColor;
			ctx.fillRect(0, 0, width, height);
			ctx.drawImage(img, 0, 0, width, height);
			URL.revokeObjectURL(url);
			canvas.toBlob(
				(blob) => {
					if (blob) resolve(blob);
					else reject(new Error('Failed to create PNG blob'));
				},
				'image/png',
				1.0
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load SVG image'));
		};

		img.src = url;
	});
}

const ASCII_MARGIN = 1;

/** Style properties we care about for SVG export (excludes strokeWidth - computed values are in px which breaks SVG) */
const SVG_STYLE_PROPS = ['fill', 'stroke', 'opacity', 'fontFamily', 'fontWeight', 'fontSize'] as const;

/** Inline computed styles into an SVG element for standalone export */
function inlineComputedStyles(el: Element) {
	const cs = getComputedStyle(el);
	const style = el as HTMLElement | SVGElement;
	for (const prop of SVG_STYLE_PROPS) {
		const val = cs[prop as keyof CSSStyleDeclaration];
		if (val && typeof val === 'string' && val !== 'none' && val !== 'normal' && val !== '0px') {
			style.style[prop as any] = val;
		}
	}
	// Recurse
	for (const child of el.children) inlineComputedStyles(child);
}

/**
 * Render ASCII art to SVG string by mounting AsciiRenderer off-screen.
 * CSS classes apply styles, then we walk the DOM to inline computed styles for export.
 */
export function renderAsciiToSvg(text: string, cols?: number, rows?: number): string {
	// Create container attached to body so CSS applies
	const container = document.createElement('div');
	container.style.position = 'absolute';
	container.style.left = '-9999px';
	container.style.top = '-9999px';
	document.body.appendChild(container);

	// Mount AsciiRenderer - it reads style from persisted state
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

	// Get computed background color from container
	const wrapperDiv = container.querySelector('div');
	const bgColor = wrapperDiv ? getComputedStyle(wrapperDiv).backgroundColor : '#1a1a1a';

	// Add background rect as first child
	const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	bgRect.setAttribute('width', '100%');
	bgRect.setAttribute('height', '100%');
	bgRect.setAttribute('fill', bgColor);
	svg.insertBefore(bgRect, svg.firstChild);

	// Inline computed styles into all elements
	inlineComputedStyles(svg);

	// Serialize
	const serializer = new XMLSerializer();
	const svgString = serializer.serializeToString(svg);

	unmount(component);
	container.remove();

	return svgString;
}

/**
 * Convert ASCII art text to PNG Blob using off-screen rendering.
 * Dimensions are derived from the SVG viewBox.
 */
export function asciiToPngBlob(text: string, cols?: number, rows?: number): Promise<Blob> {
	const svg = renderAsciiToSvg(text, cols, rows);

	// Parse SVG to get dimensions and bg color
	const parser = new DOMParser();
	const doc = parser.parseFromString(svg, 'image/svg+xml');
	const svgEl = doc.querySelector('svg');
	const bgRect = doc.querySelector('rect');
	const bgColor = bgRect?.getAttribute('fill') ?? '#1a1a1a';

	// Get dimensions from viewBox or attributes
	const viewBox = svgEl?.getAttribute('viewBox')?.split(' ').map(Number);
	const svgWidth = viewBox?.[2] ?? parseFloat(svgEl?.getAttribute('width') ?? '800');
	const svgHeight = viewBox?.[3] ?? parseFloat(svgEl?.getAttribute('height') ?? '600');

	// Scale to reasonable PNG size (800px wide, maintain aspect)
	const pngWidth = 800;
	const pngHeight = Math.round(pngWidth * (svgHeight / svgWidth));

	return svgToPngBlob(svg, pngWidth, pngHeight, bgColor);
}
