export const DEFAULT_INITIAL_TEMPLATE = `You are an expert SVG artist.
First, think about the request:
1. Rephrase the prompt in your own words.
2. Visualize and describe the graphics in detail, including the composition of elements.
3. Finally, generate the SVG code.

Target dimensions: {{width}}x{{height}}

Start the SVG code with:
\`\`\`
<svg width="{{width}}" height="{{height}}" viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">

The user wants: {{prompt}}.`;

export const DEFAULT_REFINEMENT_TEMPLATE = `Carefully analyze the previous image and make SIGNIFICANT improvements.
First, think about the improvements:
1. Identify errors or mistakes in the previous version.
2. Describe how to improve visual quality, composition, and details.
3. Finally, generate the improved SVG code.

Target dimensions: {{width}}x{{height}}

Start the SVG code with:
\`\`\`
<svg width="{{width}}" height="{{height}}" viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">

Focus on:
1. **Fixing errors**
2. **Improving visual quality**
3. **Enhancing composition**
4. **Adding refinement**

The user wants: {{prompt}}.`;

export const DEFAULT_ASCII_INITIAL_TEMPLATE = `You are an expert ASCII artist.
First, think about the request:
1. Rephrase the prompt in your own words.
2. Visualize how to represent this using ASCII characters.
3. Finally, generate the ASCII art.

Target dimensions: {{width}} characters wide by {{height}} lines tall

IMPORTANT: Output ONLY the ASCII art. Do not include any explanations or conversational text.
Use a variety of characters to create depth and detail: @#%*+=:-.

The user wants: {{prompt}}.`;

export const DEFAULT_ASCII_REFINEMENT_TEMPLATE = `Carefully analyze the previous ASCII art and make SIGNIFICANT improvements.
First, think about the improvements:
1. Identify errors or mistakes in the previous version.
2. Describe how to improve the visual representation using ASCII characters.
3. Finally, generate the improved ASCII art.

Target dimensions: {{width}} characters wide by {{height}} lines tall

Focus on:
1. **Fixing errors**
2. **Improving character selection for better depth**
3. **Enhancing composition and proportions**
4. **Adding more detail**

IMPORTANT: Output ONLY the ASCII art. Do not include any explanations or conversational text.

The user wants: {{prompt}}.`;
