/**
 * Convert SVG string to PNG Blob.
 */
export function svgToPngBlob(svgString: string, width: number, height: number): Promise<Blob> {
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
			ctx.fillStyle = 'white';
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


/**
 * Render ASCII art text to an SVG string.
 * Uses monospace font with fixed cell dimensions for precise alignment.
 */
export function asciiToSvg(
	text: string,
	opts: { rows?: number; cols?: number; fg?: string; bg?: string; cellAspect?: number } = {}
): string {
	const { fg = '#ffffff', bg = '#000000', cellAspect = 0.6 } = opts;
	const lines = text.split('\n');
	const cols = opts.cols ?? Math.max(...lines.map((l) => l.length), 1);
	const rows = opts.rows ?? lines.length;

	// Cell dimensions (height = 1 unit, width = cellAspect)
	const cellW = cellAspect;
	const cellH = 1;
	const viewW = cols * cellW;
	const viewH = rows * cellH;

	// Build text elements
	const texts = lines
		.map((line, y) => {
			const escapedLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&#160;'); // Non-breaking space for alignment
			return `<text x="0" y="${y * cellH + cellH * 0.85}" font-size="${cellH * 0.9}">${escapedLine}</text>`;
		})
		.join('\n    ');

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}">
  <style>text { font-family: 'Courier New', monospace; fill: ${fg}; white-space: pre; }</style>
  <rect width="100%" height="100%" fill="${bg}"/>
  ${texts}
</svg>`;
}

/**
 * Convert ASCII art text to PNG Blob.
 */
export function asciiToPngBlob(
	text: string,
	opts: { rows?: number; cols?: number; fg?: string; bg?: string; cellAspect?: number; width?: number; height?: number } = {}
): Promise<Blob> {
	const { width = 800, height, ...svgOpts } = opts;
	const svg = asciiToSvg(text, svgOpts);
	// Derive height from width based on aspect ratio if not provided
	const lines = text.split('\n');
	const cols = svgOpts.cols ?? Math.max(...lines.map((l) => l.length), 1);
	const rows = svgOpts.rows ?? lines.length;
	const cellAspect = svgOpts.cellAspect ?? 0.6;
	const aspect = rows / (cols * cellAspect);
	const h = height ?? Math.round(width * aspect);
	return svgToPngBlob(svg, width, h);
}
