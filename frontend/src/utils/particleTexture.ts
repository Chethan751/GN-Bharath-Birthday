import * as THREE from 'three';

let cachedGlowTexture: THREE.CanvasTexture | null = null;

/**
 * Generates a soft radial-gradient circular orb CanvasTexture so Three.js
 * PointsMaterial renders glowing round embers instead of flat square pixels.
 */
export function getRadialGlowTexture(): THREE.CanvasTexture {
  if (cachedGlowTexture) return cachedGlowTexture;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.22, 'rgba(255, 246, 214, 0.92)');
    grad.addColorStop(0.5, 'rgba(255, 215, 120, 0.42)');
    grad.addColorStop(0.8, 'rgba(255, 180, 60, 0.12)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedGlowTexture = tex;
  return tex;
}
