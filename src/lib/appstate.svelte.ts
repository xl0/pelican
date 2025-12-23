class App {
	referenceImageFile = $state<File>();
	renderedPrompt = $state('');
	renderedRefinementPrompt = $state('');
	isGenerating = $state(false);
}
export const app = new App();
