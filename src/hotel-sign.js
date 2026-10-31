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
    ctx.fillStyle = '#142028';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#d4b475';
    ctx.lineWidth = Math.max(2, Math.round(6 * Math.min(scaleX, scaleY)));
    ctx.strokeRect(14 * scaleX, 14 * scaleY, 996 * scaleX, 356 * scaleY);

    ctx.strokeStyle = 'rgba(212, 180, 117, 0.35)';
    ctx.lineWidth = Math.max(1, Math.round(2 * Math.min(scaleX, scaleY)));
    ctx.strokeRect(28 * scaleX, 28 * scaleY, 968 * scaleX, 328 * scaleY);

    ctx.textAlign = 'center';
    const count = lines.length;
    const gap = (count > 2 ? 92 : 118) * scaleY;
    const start = (count === 1 ? 224 : count > 2 ? 108 : 154) * scaleY;

    lines.forEach((text, i) => {
      ctx.fillStyle = i === 0 ? '#f8f6f0' : '#e5c687';
      const baseSize = count === 1 ? 104 : count > 2 ? (i === 0 ? 74 : 48) : i === 0 ? 88 : 50;
      const fontSize = Math.round(baseSize * scaleY);
      ctx.font = `${i === 0 ? 700 : 600} ${fontSize}px sans-serif`;
      ctx.fillText(text, width / 2, start + i * gap, 920 * scaleX);
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(cacheKey, tex);
  return tex;
}
