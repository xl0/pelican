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
}

export const ASCII_STYLES: Record<AsciiStyleName, AsciiStyle> = {
	teletype: {
		name: 'teletype',
		label: 'Teletype',
		bg: '#f5f0e6', // Off-white paper
		fg: '#333333', // Dark gray text
		frame: '#cccccc', // Light gray frame
		grid: false,
		gridColor: '#e0e0e0',
		fontFamily: '"Courier New", Courier, monospace'
	},
	crt: {
		name: 'crt',
		label: 'CRT Terminal',
		bg: '#1a1a1a', // Dark gray background
		fg: '#22c55e', // Green-500 text
		frame: '#3f3f3f', // Subtle gray frame
		grid: false,
		gridColor: '#2a2a2a',
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
	}
};

export const DEFAULT_ASCII_STYLE: AsciiStyleName = 'crt';
