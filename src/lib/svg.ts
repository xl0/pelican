import { mount, unmount } from 'svelte';
import { exportSvg, svgStringToPng } from 'svelte-asciiart';
import DOMPurify from 'dompurify';
import AsciiRenderer from './components/AsciiRenderer.svelte';

const ASCII_MARGIN = 1;

/** Result of SVG parsing */
export interface SvgParseResult {
	valid: boolean;
	svg?: string; // Sanitized and normalized SVG string (only when valid)
	error?: string;
	line?: number;
	column?: number;
}

/** Parse and sanitize SVG, return normalized version or error info */
export function parseSvg(svgString: string): SvgParseResult {
	// Sanitize SVG to prevent XSS
	const sanitized = DOMPurify.sanitize(svgString, {
		USE_PROFILES: { svg: true, svgFilters: true }
	});

	const parser = new DOMParser();
	const doc = parser.parseFromString(sanitized, 'image/svg+xml');
	const parseErrorEl = doc.querySelector('parsererror');

	if (!parseErrorEl) {
		const svgEl = doc.documentElement;
		if (svgEl.tagName.toLowerCase() !== 'svg') {
			return { valid: false, error: 'Root element is not <svg>' };
		}
		// Return normalized SVG via XMLSerializer
		const svg = new XMLSerializer().serializeToString(svgEl);
		return { valid: true, svg };
	}

	// Extract error text and parse line/column
	const errorText = parseErrorEl.textContent?.trim() ?? 'Unknown parse error';
	// Browser-specific formats:
	// Chrome/Safari: "error on line X at column Y: ..."
	// Firefox: "XML Parsing Error: ... Line Number X, Column Y"
	const lineMatch = errorText.match(/line\s*(?:number\s*)?(\d+)/i);
	const colMatch = errorText.match(/column\s*(\d+)/i);

	// Try to extract partial SVG content before the error
	// The DOMParser creates an SVG element with content up to the error point
	let partialSvg: string | undefined;
	const svgEl = doc.querySelector('svg');
	if (svgEl) {
		// Remove the parsererror from the SVG before serializing
		const errorInSvg = svgEl.querySelector('parsererror');
		if (errorInSvg) errorInSvg.remove();
		partialSvg = new XMLSerializer().serializeToString(svgEl);
	}

	return {
		valid: false,
		svg: partialSvg, // Partial SVG for display during generation
		error: errorText,
		line: lineMatch ? parseInt(lineMatch[1]) : undefined,
		column: colMatch ? parseInt(colMatch[1]) : undefined
	};
}

/** Get lines of SVG around the error position for LLM context */
export function getSvgErrorContext(svgString: string, errorLine: number, contextLines = 5): string {
	const lines = svgString.split('\n');
	const start = Math.max(0, errorLine - contextLines - 1);
	const end = Math.min(lines.length, errorLine + contextLines);

	return lines
		.slice(start, end)
		.map((line, i) => {
			const lineNum = start + i + 1;
			const marker = lineNum === errorLine ? '>>> ' : '    ';
			return `${marker}${lineNum.toString().padStart(4)}: ${line}`;
		})
		.join('\n');
}

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
