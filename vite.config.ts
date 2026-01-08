import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss(), devtoolsJson()],
	server: {
		allowedHosts: true
	}
	// optimizeDeps: {
	// 	exclude: [
	// 		'svelte-codemirror-editor',
	// 		'codemirror',
	// 		'@codemirror/commands',
	// 		'@codemirror/lang-jinja',
	// 		'@codemirror/language',
	// 		'@codemirror/lint',
	// 		'@codemirror/state',
	// 		'@codemirror/theme-one-dark',
	// 		'@codemirror/view'
	// 	]
	// }
});
