  // Helper to convert SVG string to PNG base64 - extracts dimensions from SVG or uses provided values
  function svgToPngBase64(svgString: string, width?: number, height?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Parse SVG to extract dimensions if not provided
      let w = width, h = height;
      if (!w || !h) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (svgEl) {
          const vb = svgEl.getAttribute('viewBox');
          if (vb) {
            const [, , vbW, vbH] = vb.split(/\s+/).map(Number);
            w = w || vbW;
            h = h || vbH;
          }
          w = w || parseFloat(svgEl.getAttribute('width') || '800');
          h = h || parseFloat(svgEl.getAttribute('height') || '600');
        }
      }
      w = w || 800;
      h = h || 600;

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };

      img.src = url;
    });
  }
