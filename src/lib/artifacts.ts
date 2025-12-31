/**
 * Artifact extraction from raw model output.
 * Works incrementally during streaming - call on each chunk to update artifacts.
 */
import DOMPurify from 'dompurify';
import dbg from 'debug';
import type { Format } from './types';

const debug = dbg('app:artifacts');

export type ExtractedArtifact = { body: string };

// SVG code block pattern: ```svg or ```xml followed by <svg...
const SVG_BLOCK_RE = /```(?:svg|xml)\s*\n(<svg[\s\S]*?)(?:```|$)/gi;

// ASCII code block pattern: ``` or ```ascii (we'll take content that's not recognizably code)
const ASCII_BLOCK_RE = /```(?:ascii)?\s*\n([\s\S]*?)(?:\n```|$)/gi;

/**
 * Extract SVG artifacts from raw output.
 * Returns all complete or partial SVGs found.
 */
function extractSvgs(raw: string): ExtractedArtifact[] {
	const artifacts: ExtractedArtifact[] = [];
	for (const match of raw.matchAll(SVG_BLOCK_RE)) {
		let svg = match[1];
		// Auto-close incomplete SVG for streaming preview
		if (!svg.includes('</svg>')) svg += '</svg>';
		// Sanitize for safe DOM injection
		const clean = DOMPurify.sanitize(svg, {
			USE_PROFILES: { svg: true, svgFilters: true },
			ADD_TAGS: [
				'svg',
				'path',
				'circle',
				'rect',
				'line',
				'ellipse',
				'polygon',
				'polyline',
				'g',
				'defs',
				'clipPath',
				'mask',
				'pattern',
				'linearGradient',
				'radialGradient',
				'stop',
				'text',
				'tspan',
				'foreignObject',
				'use',
				'symbol',
				'marker',
				'filter',
				'feGaussianBlur',
				'feOffset',
				'feMerge',
				'feMergeNode',
				'feBlend',
				'feColorMatrix',
				'feComposite',
				'feFlood',
				'feImage',
				'feMorphology',
				'feDisplacementMap',
				'feTurbulence'
			],
			ADD_ATTR: [
				'viewBox',
				'xmlns',
				'xmlns:xlink',
				'fill',
				'stroke',
				'stroke-width',
				'stroke-linecap',
				'stroke-linejoin',
				'stroke-dasharray',
				'stroke-opacity',
				'fill-opacity',
				'transform',
				'd',
				'cx',
				'cy',
				'r',
				'x',
				'y',
				'width',
				'height',
				'rx',
				'ry',
				'points',
				'x1',
				'y1',
				'x2',
				'y2',
				'offset',
				'stop-color',
				'stop-opacity',
				'opacity',
				'font-family',
				'font-size',
				'font-weight',
				'text-anchor',
				'dominant-baseline',
				'id',
				'href',
				'xlink:href',
				'clip-path',
				'mask',
				'filter',
				'gradientUnits',
				'patternUnits',
				'spreadMethod',
				'markerWidth',
				'markerHeight',
				'refX',
				'refY',
				'orient',
				'preserveAspectRatio'
			]
		});
		if (clean.trim()) artifacts.push({ body: clean });
	}
	return artifacts;
}

/**
 * Extract ASCII artifacts from raw output.
 * Returns all code blocks that aren't recognizable as svg/xml.
 */
function extractAscii(raw: string): ExtractedArtifact[] {
	const artifacts: ExtractedArtifact[] = [];
	// Reset lastIndex for global regex
	ASCII_BLOCK_RE.lastIndex = 0;
	for (const match of raw.matchAll(ASCII_BLOCK_RE)) {
		const content = match[1];
		// Skip if it looks like SVG/XML
		if (content.trim().startsWith('<svg') || content.trim().startsWith('<?xml')) continue;
		// Skip empty blocks
		if (!content.trim()) continue;
		artifacts.push({ body: content });
	}
	return artifacts;
}

/**
 * Extract artifacts from raw output based on format.
 * Call this on each streaming chunk - it will return all artifacts found so far.
 */
export function extractArtifacts(raw: string, format: Format): ExtractedArtifact[] {
	return format === 'svg' ? extractSvgs(raw) : extractAscii(raw);
}
