import { mount, unmount } from 'svelte';
import { AsciiArt } from 'svelte-asciiart';
import { ASCII_STYLES, type AsciiStyleName } from './ascii-styles';

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

export interface RenderAsciiOpts {
	rows?: number;
	cols?: number;
	style?: AsciiStyleName;
}

/**
 * Render ASCII art to SVG string by mounting AsciiArt.svelte off-screen.
 * Styles are inlined directly into the SVG for export compatibility.
 */
export function renderAsciiToSvg(text: string, opts: RenderAsciiOpts = {}): string {
	const styleName = opts.style ?? 'crt';
	const style = ASCII_STYLES[styleName];

	// Create hidden container
	const container = document.createElement('div');
	document.body.appendChild(container);

	// Mount AsciiArt component
	let svgEl: SVGSVGElement | null = null;
	const component = mount(AsciiArt, {
		target: container,
		props: {
			text,
			rows: opts.rows,
			cols: opts.cols,
			frame: true,
			grid: style.grid,
			margin: ASCII_MARGIN,
			frameClass: 'ascii-frame',
			gridClass: style.grid ? 'ascii-grid' : undefined,
			style: `color: ${style.fg}; background: ${style.bg}; font-family: ${style.fontFamily};`,
			get svg() {
				return svgEl;
			},
			set svg(el: SVGSVGElement | null) {
				svgEl = el;
			}
		}
	});

	const svg = container.querySelector('svg');
	if (!svg) {
		unmount(component);
		container.remove();
		throw new Error('Failed to render AsciiArt SVG');
	}

	// Add background rect as first child for export
	const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	bgRect.setAttribute('width', '100%');
	bgRect.setAttribute('height', '100%');
	bgRect.setAttribute('fill', style.bg);
	svg.insertBefore(bgRect, svg.firstChild);

	// Inline frame/grid styles directly (CSS classes won't work in isolated SVG)
	for (const el of svg.querySelectorAll('.ascii-frame')) {
		(el as SVGElement).style.stroke = style.frame;
		(el as SVGElement).style.strokeWidth = '0.05';
	}
	if (style.grid) {
		for (const el of svg.querySelectorAll('.ascii-grid')) {
			(el as SVGElement).style.stroke = style.gridColor;
			(el as SVGElement).style.strokeWidth = '0.03';
			(el as SVGElement).style.opacity = '0.5';
		}
	}

	// Inline text color
	for (const el of svg.querySelectorAll('text')) {
		el.setAttribute('fill', style.fg);
	}

	const svgString = svg.outerHTML;

	unmount(component);
	container.remove();

	return svgString;
}

/**
 * Convert ASCII art text to PNG Blob using off-screen rendering.
 */
export function asciiToPngBlob(text: string, opts: RenderAsciiOpts & { width?: number; height?: number } = {}): Promise<Blob> {
	const { width = 800, height, style = 'crt' } = opts;
	const svg = renderAsciiToSvg(text, { rows: opts.rows, cols: opts.cols, style });
	const styleObj = ASCII_STYLES[style];

	// Derive height from width based on aspect ratio
	const lines = text.split('\n');
	const contentCols = Math.max(1, ...lines.map((l) => l.length));
	const contentRows = lines.length;
	const cols = opts.cols ?? contentCols;
	const rows = opts.rows ?? contentRows;
	const cellAspect = 0.6;
	const totalCols = cols + ASCII_MARGIN * 2;
	const totalRows = rows + ASCII_MARGIN * 2;
	const aspect = totalRows / (totalCols * cellAspect);
	const h = height ?? Math.round(width * aspect);
	return svgToPngBlob(svg, width, h, styleObj.bg);
}
