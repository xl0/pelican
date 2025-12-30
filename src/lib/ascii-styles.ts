// ASCII art display styles - affects both preview and PNG export

export type AsciiStyleName = 'teletype' | 'crt';

export interface AsciiStyle {
	name: AsciiStyleName;
	label: string;
	bg: string; // Background color
	fg: string; // Text color (currentColor)
	frame: string; // Frame stroke color
	grid: boolean; // Show grid lines
	gridColor: string; // Grid line color (if shown)
	fontFamily: string; // Font family
	fontWeight?: string; // Font weight
}

export const ASCII_STYLES: Record<AsciiStyleName, AsciiStyle> = {
	teletype: {
		name: 'teletype',
		label: 'Teletype',
		bg: 'var(--ascii-teletype-bg)', // Off-white paper
		fg: 'var(--ascii-teletype-fg)', // Dark gray text
		frame: 'var(--ascii-teletype-frame)', // Light gray frame
		grid: false,
		gridColor: 'var(--ascii-teletype-grid)',
		// Options: "Special Elite", "Courier Prime", "Cutive Mono"
		fontFamily: '"Fira Code", monospace',
		fontWeight: '700'
	},
	crt: {
		name: 'crt',
		label: 'CRT Terminal',
		bg: 'var(--ascii-crt-bg)', // Dark gray background
		fg: 'var(--ascii-crt-fg)', // Green-500 text
		frame: 'var(--ascii-crt-frame)', // Subtle gray frame
		grid: false,
		gridColor: 'var(--ascii-crt-grid)',
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
	}
};

export const DEFAULT_ASCII_STYLE: AsciiStyleName = 'crt';
