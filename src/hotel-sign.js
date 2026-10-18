import * as THREE from 'three';

const textureCache = new Map();

export function clearSignTextureCache() {
  for (const tex of textureCache.values()) {
    tex.dispose();
  }
  textureCache.clear();
}

export function hotelSignTexture(lines, { width = 512, height = 192 } = {}) {
  const cacheKey = `${width}x${height}:${lines.join('\n')}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const scaleX = width / 1024;
  const scaleY = height / 384;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#e5dfd1';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#b4a487';
    ctx.lineWidth = Math.max(1, 2 * Math.min(scaleX, scaleY));
    ctx.strokeRect(18 * scaleX, 18 * scaleY, 988 * scaleX, 348 * scaleY);

    ctx.textAlign = 'center';
    const gap = (lines.length > 2 ? 86 : 110) * scaleY;
    const start = (lines.length > 2 ? 106 : 149) * scaleY;

    lines.forEach((text, i) => {
      ctx.fillStyle = i === 0 ? '#393c38' : '#676b63';
      const fontSize = Math.round((i === 0 ? 76 : 44) * scaleY);
      ctx.font = `${i === 0 ? 500 : 400} ${fontSize}px sans-serif`;
      ctx.fillText(text, width / 2, start + i * gap, 930 * scaleX);
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, tex);
  return tex;
}
