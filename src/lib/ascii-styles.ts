// ASCII style names and labels for UI - actual styles defined in app.css

export type AsciiStyleName = 'teletype' | 'crt';

export const ASCII_STYLE_LABELS: Record<AsciiStyleName, string> = {
	crt: 'CRT Terminal',
	teletype: 'Teletype'
};

export const ASCII_STYLE_NAMES = Object.keys(ASCII_STYLE_LABELS) as AsciiStyleName[];

export const DEFAULT_ASCII_STYLE: AsciiStyleName = 'crt';
