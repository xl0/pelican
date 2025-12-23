<script>
  let {
    art = '',
    gridWidth = 100,
    gridHeight = 60,
    frameWidth = 80,
    frameHeight = 40,
    frameColor = '#666',
    textColor = '#fff',
    bgColor = '#1a1a1a'
  } = $props();

  const charWidth = 1;
  const charHeight = 1.6;

  let lines = $derived(art.split('\n'));
  let viewBoxWidth = $derived(gridWidth * charWidth);
  let viewBoxHeight = $derived(gridHeight * charHeight);
  let frameX = $derived((gridWidth - frameWidth) / 2 * charWidth);
  let frameY = $derived((gridHeight - frameHeight) / 2 * charHeight);
</script>

<svg
  viewBox="0 0 {viewBoxWidth} {viewBoxHeight}"
  xmlns="http://www.w3.org/2000/svg"
  class="w-full h-auto block"
>
  <rect x="0" y="0" width={viewBoxWidth} height={viewBoxHeight} class="fill-neutral-900" />

  <rect
    x={frameX}
    y={frameY}
    width={frameWidth * charWidth}
    height={frameHeight * charHeight}
    class="fill-none stroke-neutral-500"
    stroke-width="0.05"
  />

  <text
    class="fill-neutral-100"
    font-family="monospace"
    font-size={charHeight}
    xml:space="preserve"
  >
    {#each lines as line, y}
      <tspan x="0" y={(y + 0.8) * charHeight}>{line}</tspan>
    {/each}
  </text>
</svg>