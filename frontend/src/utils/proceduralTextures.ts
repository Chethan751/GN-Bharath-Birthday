import * as THREE from 'three';

let chocoBumpCache: THREE.CanvasTexture | null = null;
let goldBumpCache: THREE.CanvasTexture | null = null;
let marbleMapCache: THREE.CanvasTexture | null = null;
let marbleRoughCache: THREE.CanvasTexture | null = null;
let plaqueTexCache: THREE.CanvasTexture | null = null;
let lunarTexturesCache: {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} | null = null;

function pseudoNoise(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Subtle cocoa sponge micro-grain bump/roughness texture.
 */
export function getChocolateBumpTexture(): THREE.CanvasTexture {
  if (chocoBumpCache) return chocoBumpCache;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = Math.floor(110 + pseudoNoise(i) * 90);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  chocoBumpCache = tex;
  return tex;
}

/**
 * Brushed & hammered gold-leaf micro-surface texture.
 */
export function getGoldLeafBumpTexture(): THREE.CanvasTexture {
  if (goldBumpCache) return goldBumpCache;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      const shade = Math.floor(118 + pseudoNoise(y * 7) * 32);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, size, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  goldBumpCache = tex;
  return tex;
}

/**
 * Dark obsidian marble stage floor texture with subtle warm gold veining.
 */
export function getObsidianMarbleTextures(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  if (marbleMapCache && marbleRoughCache) {
    return { map: marbleMapCache, roughnessMap: marbleRoughCache };
  }

  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');

  if (cCtx && rCtx) {
    cCtx.fillStyle = '#07070b';
    cCtx.fillRect(0, 0, size, size);

    rCtx.fillStyle = '#383838';
    rCtx.fillRect(0, 0, size, size);

    // Subtle dark slate patches
    for (let i = 0; i < 40; i++) {
      const x = pseudoNoise(i * 3 + 1) * size;
      const y = pseudoNoise(i * 3 + 2) * size;
      const r = 40 + pseudoNoise(i * 3 + 3) * 90;
      const g = cCtx.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, 'rgba(22, 19, 26, 0.35)');
      g.addColorStop(1, 'rgba(7, 7, 11, 0)');
      cCtx.fillStyle = g;
      cCtx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Delicate gold-amber mineral veins
    for (let v = 0; v < 14; v++) {
      let px = pseudoNoise(v * 11 + 1) * size;
      let py = pseudoNoise(v * 11 + 2) * size;
      cCtx.beginPath();
      rCtx.beginPath();
      cCtx.moveTo(px, py);
      rCtx.moveTo(px, py);
      for (let s = 0; s < 14; s++) {
        px += (pseudoNoise(v * 50 + s * 2) - 0.35) * 44;
        py += (pseudoNoise(v * 50 + s * 2 + 1) - 0.5) * 34;
        cCtx.lineTo(px, py);
        rCtx.lineTo(px, py);
      }
      cCtx.strokeStyle = v % 3 === 0 ? 'rgba(212, 175, 55, 0.18)' : 'rgba(130, 120, 145, 0.1)';
      cCtx.lineWidth = v % 3 === 0 ? 1.2 : 0.8;
      cCtx.stroke();

      rCtx.strokeStyle = 'rgba(25, 25, 25, 0.6)';
      rCtx.lineWidth = 1.6;
      rCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);

  marbleMapCache = map;
  marbleRoughCache = roughnessMap;
  return { map, roughnessMap };
}

/**
 * Engraved gold plaque texture reading "GN BHARATH" for the cake topper crest.
 */
export function getEngravedPlaqueTexture(): THREE.CanvasTexture {
  if (plaqueTexCache) return plaqueTexCache;

  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#fff3c4');
    grad.addColorStop(0.35, '#e8c15a');
    grad.addColorStop(0.7, '#c79726');
    grad.addColorStop(1, '#f7df8e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Recessed dark-gold border
    ctx.strokeStyle = '#4a3106';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = 'rgba(255, 248, 220, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtle dark engraved shadow + warm gold face
    ctx.fillStyle = '#3a2504';
    ctx.font = '600 22px Georgia, serif';
    ctx.fillText('HAPPY BIRTHDAY', w / 2, 82);

    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillStyle = '#291903';
    ctx.fillText('GN BHARATH', w / 2 + 2, 146 + 2);
    ctx.fillStyle = '#4a2f05';
    ctx.fillText('GN BHARATH', w / 2, 146);

    ctx.font = '600 18px Georgia, serif';
    ctx.fillStyle = '#5c3c09';
    ctx.fillText('★  ROYAL EDITION  ★', w / 2, 198);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  plaqueTexCache = tex;
  return tex;
}

/**
 * Procedural lunar albedo, crater bump, and roughness CanvasTextures
 * with maria dark patches, multi-scale crater rings, and warm silver-gold moonlight tint.
 */
export function getLunarTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  if (lunarTexturesCache) return lunarTexturesCache;

  const w = 512;
  const h = 256;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const cCtx = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bCtx = bumpCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rCtx = roughCanvas.getContext('2d');

  if (cCtx && bCtx && rCtx) {
    // Base warm silver-gold regolith
    cCtx.fillStyle = '#ddd3bc';
    cCtx.fillRect(0, 0, w, h);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, w, h);

    rCtx.fillStyle = '#c8c8c8';
    rCtx.fillRect(0, 0, w, h);

    // Subtle regolith grain
    for (let i = 0; i < 1800; i++) {
      const gx = pseudoNoise(i * 5 + 1) * w;
      const gy = pseudoNoise(i * 5 + 2) * h;
      const gr = 1 + pseudoNoise(i * 5 + 3) * 3;
      const shade = pseudoNoise(i * 5 + 4);
      cCtx.fillStyle = shade > 0.5 ? 'rgba(250, 242, 222, 0.16)' : 'rgba(130, 118, 96, 0.14)';
      cCtx.beginPath();
      cCtx.arc(gx, gy, gr, 0, Math.PI * 2);
      cCtx.fill();

      const bVal = Math.floor(110 + shade * 45);
      bCtx.fillStyle = `rgba(${bVal},${bVal},${bVal},0.35)`;
      bCtx.beginPath();
      bCtx.arc(gx, gy, gr, 0, Math.PI * 2);
      bCtx.fill();
    }

    // Realistic Lunar Maria (dark basaltic plains)
    for (let m = 0; m < 16; m++) {
      const mx = pseudoNoise(m * 17 + 10) * w;
      const my = 30 + pseudoNoise(m * 17 + 11) * (h - 60);
      const mr = 26 + pseudoNoise(m * 17 + 12) * 58;
      const mGrad = cCtx.createRadialGradient(mx, my, 4, mx, my, mr);
      mGrad.addColorStop(0, 'rgba(92, 84, 70, 0.56)');
      mGrad.addColorStop(0.6, 'rgba(116, 106, 88, 0.34)');
      mGrad.addColorStop(1, 'rgba(221, 211, 188, 0)');
      cCtx.fillStyle = mGrad;
      cCtx.beginPath();
      cCtx.arc(mx, my, mr, 0, Math.PI * 2);
      cCtx.fill();

      // Maria smoother roughness
      const rGrad = rCtx.createRadialGradient(mx, my, 4, mx, my, mr);
      rGrad.addColorStop(0, 'rgba(155, 155, 155, 0.45)');
      rGrad.addColorStop(1, 'rgba(200, 200, 200, 0)');
      rCtx.fillStyle = rGrad;
      rCtx.beginPath();
      rCtx.arc(mx, my, mr, 0, Math.PI * 2);
      rCtx.fill();
    }

    // Multi-scale lunar craters with shaded basins & bright raised rims
    for (let c = 0; c < 140; c++) {
      const cx = pseudoNoise(c * 23 + 31) * w;
      const cy = 12 + pseudoNoise(c * 23 + 32) * (h - 24);
      const cr = 3 + Math.pow(pseudoNoise(c * 23 + 33), 2) * 20;

      // Crater floor depression in albedo & bump
      const floorGrad = cCtx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      floorGrad.addColorStop(0, 'rgba(128, 118, 98, 0.48)');
      floorGrad.addColorStop(0.75, 'rgba(165, 154, 132, 0.3)');
      floorGrad.addColorStop(0.92, 'rgba(255, 246, 224, 0.45)');
      floorGrad.addColorStop(1, 'rgba(221, 211, 188, 0)');
      cCtx.fillStyle = floorGrad;
      cCtx.beginPath();
      cCtx.arc(cx, cy, cr, 0, Math.PI * 2);
      cCtx.fill();

      const bumpGrad = bCtx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      bumpGrad.addColorStop(0, 'rgba(42, 42, 42, 0.72)');
      bumpGrad.addColorStop(0.72, 'rgba(92, 92, 92, 0.5)');
      bumpGrad.addColorStop(0.9, 'rgba(225, 225, 225, 0.75)');
      bumpGrad.addColorStop(1, 'rgba(128, 128, 128, 0)');
      bCtx.fillStyle = bumpGrad;
      bCtx.beginPath();
      bCtx.arc(cx, cy, cr, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

  lunarTexturesCache = { map, bumpMap, roughnessMap };
  return lunarTexturesCache;
}
