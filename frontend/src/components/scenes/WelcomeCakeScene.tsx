import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Float,
  Environment,
  Lightformer,
  ContactShadows,
  Stars,
  MeshReflectorMaterial,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Flame, Mic, MicOff, RotateCcw, ChevronDown } from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { audioService } from '../../services/audioService';
import { FireworksLayer, SparklerFountains } from './FireworksLayer';
import { LuxuryGiftBox3D } from './LuxuryGiftBox3D';
import { useAdaptiveQuality } from '../../hooks/useAdaptiveQuality';
import { getRadialGlowTexture } from '../../utils/particleTexture';
import {
  getChocolateBumpTexture,
  getEngravedPlaqueTexture,
  getGoldLeafBumpTexture,
  getObsidianMarbleTextures,
} from '../../utils/proceduralTextures';

interface WelcomeCakeSceneProps {
  mediaItems: MediaItem[];
  onScrollToMemories: () => void;
  fireworksEnabled?: boolean;
  globalBurstSignal?: number;
  onTriggerCelebrationBurst?: () => void;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 41.321 + 19.73) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Smooth GSAP entrance glide + gentle idle breathing motion (pauses while user orbits).
 */
function CameraChoreography({ isDraggingRef }: { isDraggingRef: React.RefObject<boolean> }) {
  const { camera } = useThree();
  const entranceDoneRef = useRef(false);

  useEffect(() => {
    camera.position.set(0, 2.85, 8.6);
    const tween = gsap.to(camera.position, {
      x: 0,
      y: 1.5,
      z: 6.1,
      duration: 2.0,
      ease: 'power3.out',
      onComplete: () => {
        entranceDoneRef.current = true;
      },
    });
    return () => {
      tween.kill();
    };
  }, [camera]);

  useFrame((state) => {
    if (!entranceDoneRef.current || isDraggingRef.current) return;
    const t = state.clock.getElapsedTime();
    const nextY = THREE.MathUtils.lerp(
      state.camera.position.y,
      1.5 + Math.sin(t * 0.45) * 0.08,
      0.03
    );
    state.camera.position.setY(nextY);
  });

  return null;
}

/**
 * Floating round glowing golden dust motes & volumetric atmosphere orbs.
 */
function GoldenDustOrbs({ particleMultiplier }: { particleMultiplier: number }) {
  const count = Math.max(40, Math.round(140 * particleMultiplier));
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material, baseCoords } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const base = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const x = (seededRandom(i * 4 + 1) - 0.5) * 12;
      const y = (seededRandom(i * 4 + 2) - 0.25) * 6.5;
      const z = (seededRandom(i * 4 + 3) - 0.5) * 7.5;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      base[i * 4] = x;
      base[i * 4 + 1] = y;
      base[i * 4 + 2] = z;
      base[i * 4 + 3] = seededRandom(i * 4 + 4) * Math.PI * 2;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.16,
      map: getRadialGlowTexture(),
      color: '#ffe599',
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geom, material: mat, baseCoords: base };
  }, [count]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const phase = baseCoords[i * 4 + 3];
      arr[i * 3] = baseCoords[i * 4] + Math.sin(t * 0.45 + phase) * 0.22;
      arr[i * 3 + 1] = baseCoords[i * 4 + 1] + Math.sin(t * 0.6 + phase * 1.3) * 0.28;
      arr[i * 3 + 2] = baseCoords[i * 4 + 2] + Math.cos(t * 0.4 + phase) * 0.18;
    }
    attr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

/**
 * Sculpted beveled cake tier using LatheGeometry for smooth chamfered edges.
 */
function createBeveledTierGeometry(radius: number, height: number): THREE.LatheGeometry {
  const bevel = 0.045;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(radius - bevel, 0),
    new THREE.Vector2(radius, bevel),
    new THREE.Vector2(radius, height - bevel),
    new THREE.Vector2(radius - bevel, height),
    new THREE.Vector2(0, height),
  ];
  return new THREE.LatheGeometry(pts, 64);
}

/**
 * Sculpted metallic helium balloon profile with knotted neck (LatheGeometry).
 */
function createTeardropBalloonGeometry(scale = 1): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = knot bottom, 1 = dome top
    if (t < 0.08) {
      // Flared knot neck
      const nt = t / 0.08;
      const r = (0.075 - nt * 0.045) * scale;
      pts.push(new THREE.Vector2(r, t * 1.18 * scale));
    } else {
      // Sculpted teardrop dome
      const bt = (t - 0.08) / 0.92;
      const y = (0.095 + bt * 1.05) * scale;
      const r = Math.sin(Math.pow(bt, 0.78) * Math.PI) * 0.46 * (0.72 + bt * 0.35) * scale;
      pts.push(new THREE.Vector2(Math.max(0.0001, r), y));
    }
  }
  const geom = new THREE.LatheGeometry(pts, 32);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Thin curved golden balloon string using TubeGeometry.
 */
function createBalloonStringGeometry(seed: number): THREE.TubeGeometry {
  const bend = (seededRandom(seed) - 0.5) * 0.16;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(bend, -0.45, 0.04),
    new THREE.Vector3(-bend * 0.8, -0.95, -0.03),
    new THREE.Vector3(bend * 0.4, -1.38, 0.02),
  ]);
  return new THREE.TubeGeometry(curve, 18, 0.006, 6, false);
}

/**
 * Teardrop candle flame LatheGeometry.
 */
function createTeardropFlameGeometry(scale = 1): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * 0.2 * scale;
    const r = Math.sin(Math.pow(t, 0.55) * Math.PI) * 0.048 * scale * (1 - t * 0.35);
    pts.push(new THREE.Vector2(Math.max(0.0001, r), y));
  }
  return new THREE.LatheGeometry(pts, 18);
}

/**
 * Beveled Shield Plaque ExtrudeGeometry for engraved "GN BHARATH" cake topper.
 */
function createTopperPlaqueGeometry(): THREE.ExtrudeGeometry {
  const w = 0.78;
  const h = 0.38;
  const r = 0.07;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
  });
  geom.center();
  return geom;
}

function CakeStage3D({
  candlesLit,
  burstSignal,
  particleMultiplier,
  reflectorResolution,
  reflectorBlur,
  composerMultisampling,
  fireworksEnabled,
  isDraggingRef,
  prefersReducedMotion,
}: {
  candlesLit: boolean;
  burstSignal: number;
  particleMultiplier: number;
  reflectorResolution: number;
  reflectorBlur: [number, number];
  composerMultisampling: number;
  fireworksEnabled: boolean;
  isDraggingRef: React.RefObject<boolean>;
  prefersReducedMotion: boolean;
}) {
  const flamesRef = useRef<THREE.Group[]>([]);
  const smokeRef = useRef<THREE.Points>(null);
  const cakeGroupRef = useRef<THREE.Group>(null);
  const flameLightRef = useRef<THREE.PointLight>(null);
  const smokeProgressRef = useRef(0);

  const marbleTextures = useMemo(() => getObsidianMarbleTextures(), []);

  // Specular metallic gold material with brushed gold-leaf bump map
  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f5cf6b',
        metalness: 0.92,
        roughness: 0.16,
        bumpMap: getGoldLeafBumpTexture(),
        bumpScale: 0.005,
        emissive: '#2d1c03',
        emissiveIntensity: 0.18,
      }),
    []
  );

  // Rich textured chocolate cake sponge
  const chocoCakeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2b140a',
        metalness: 0.04,
        roughness: 0.54,
        bumpMap: getChocolateBumpTexture(),
        bumpScale: 0.014,
      }),
    []
  );

  // Glossy melted dark-chocolate ganache drip glaze
  const ganacheMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#170903',
        metalness: 0.08,
        roughness: 0.14,
        clearcoat: 0.9,
        clearcoatRoughness: 0.08,
      }),
    []
  );

  // Translucent wax candle material with warm subsurface-style glow
  const waxMatLight = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#fff2cf',
        roughness: 0.24,
        transmission: 0.24,
        thickness: 0.35,
        emissive: '#ffaa33',
        emissiveIntensity: candlesLit ? 0.28 : 0,
      }),
    [candlesLit]
  );

  const waxMatGold = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#f4d06f',
        roughness: 0.22,
        metalness: 0.4,
        transmission: 0.15,
        thickness: 0.3,
        emissive: '#ff9d1c',
        emissiveIntensity: candlesLit ? 0.24 : 0,
      }),
    [candlesLit]
  );

  // Glossy metallic gold & champagne helium balloon clearcoat materials
  const balloonGoldMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#f4cf6a',
        metalness: 0.86,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
      }),
    []
  );

  const balloonChampagneMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#fff0c8',
        metalness: 0.8,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
      }),
    []
  );

  // Emissive turbulent teardrop flames (Bloom selectively illuminates values > 0.85)
  const outerFlameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ff9d1c',
        emissive: '#ffaa22',
        emissiveIntensity: 3.1,
        roughness: 0.2,
        toneMapped: false,
        transparent: true,
        opacity: 0.92,
      }),
    []
  );

  const innerFlameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fff8dc',
        emissive: '#fff6cc',
        emissiveIntensity: 4.0,
        roughness: 0.15,
        toneMapped: false,
      }),
    []
  );

  // Engraved "GN BHARATH" plaque face material
  const plaqueFaceMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: getEngravedPlaqueTexture(),
        metalness: 0.85,
        roughness: 0.2,
      }),
    []
  );

  // Sculpted procedural geometries
  const geometries = useMemo(() => {
    const tier1 = createBeveledTierGeometry(1.4, 0.64);
    const tier2 = createBeveledTierGeometry(1.04, 0.56);
    const tier3 = createBeveledTierGeometry(0.74, 0.44);
    const outerFlame = createTeardropFlameGeometry(1.0);
    const innerFlame = createTeardropFlameGeometry(0.62);
    const balloon = createTeardropBalloonGeometry(1.0);
    const plaque = createTopperPlaqueGeometry();
    const strings = [0, 1, 2, 3, 4, 5].map((i) => createBalloonStringGeometry(i * 19 + 3));
    return { tier1, tier2, tier3, outerFlame, innerFlame, balloon, plaque, strings };
  }, []);

  const candlePositions = useMemo(() => {
    const arr: [number, number, number][] = [];
    const count = 8;
    const radius = 0.54;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      arr.push([Math.cos(angle) * radius, 1.54, Math.sin(angle) * radius]);
    }
    return arr;
  }, []);

  const tierDecor = useMemo(() => {
    const tiers = [
      { radius: 1.4, topY: 0.63, baseY: 0.02, beadCount: 30, dripCount: 20 },
      { radius: 1.04, topY: 1.18, baseY: 0.65, beadCount: 24, dripCount: 16 },
      { radius: 0.74, topY: 1.61, baseY: 1.2, beadCount: 18, dripCount: 12 },
    ];
    return tiers.map((tier, tIdx) => {
      const beads: [number, number, number][] = [];
      for (let i = 0; i < tier.beadCount; i++) {
        const a = (i / tier.beadCount) * Math.PI * 2;
        beads.push([Math.cos(a) * tier.radius, tier.baseY, Math.sin(a) * tier.radius]);
      }
      const drips: { pos: [number, number, number]; len: number }[] = [];
      for (let j = 0; j < tier.dripCount; j++) {
        const a = (j / tier.dripCount) * Math.PI * 2 + tIdx * 0.2;
        const len = 0.1 + seededRandom(tIdx * 100 + j) * 0.19;
        drips.push({
          pos: [
            Math.cos(a) * (tier.radius + 0.004),
            tier.topY - len * 0.5,
            Math.sin(a) * (tier.radius + 0.004),
          ],
          len,
        });
      }
      return { ...tier, beads, drips };
    });
  }, []);

  const smokeSetup = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(candlePositions.length * 3 * 3);
    candlePositions.forEach(([cx, cy, cz], idx) => {
      for (let k = 0; k < 3; k++) {
        const pIdx = (idx * 3 + k) * 3;
        pos[pIdx] = cx + (k - 1) * 0.03;
        pos[pIdx + 1] = cy + 0.58 + k * 0.08;
        pos[pIdx + 2] = cz;
      }
    });
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.24,
      map: getRadialGlowTexture(),
      color: '#e6dcc8',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geom, mat };
  }, [candlePositions]);

  useEffect(() => {
    return () => {
      goldMat.dispose();
      chocoCakeMat.dispose();
      ganacheMat.dispose();
      waxMatLight.dispose();
      waxMatGold.dispose();
      balloonGoldMat.dispose();
      balloonChampagneMat.dispose();
      outerFlameMat.dispose();
      innerFlameMat.dispose();
      plaqueFaceMat.dispose();
      geometries.tier1.dispose();
      geometries.tier2.dispose();
      geometries.tier3.dispose();
      geometries.outerFlame.dispose();
      geometries.innerFlame.dispose();
      geometries.balloon.dispose();
      geometries.plaque.dispose();
      geometries.strings.forEach((s) => s.dispose());
      smokeSetup.geom.dispose();
      smokeSetup.mat.dispose();
    };
  }, [
    goldMat,
    chocoCakeMat,
    ganacheMat,
    waxMatLight,
    waxMatGold,
    balloonGoldMat,
    balloonChampagneMat,
    outerFlameMat,
    innerFlameMat,
    plaqueFaceMat,
    geometries,
    smokeSetup,
  ]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    flamesRef.current.forEach((flame, idx) => {
      if (!flame) return;
      if (candlesLit) {
        flame.visible = true;
        const swayX = Math.sin(t * 11.5 + idx * 1.9) * 0.15 + Math.sin(t * 21 + idx) * 0.04;
        const swayZ = Math.cos(t * 9.8 + idx * 1.3) * 0.12;
        const stretchY = 0.94 + Math.sin(t * 16 + idx * 2.1) * 0.17;
        const pulseXZ = 0.95 + Math.cos(t * 13.5 + idx) * 0.09;
        flame.scale.set(pulseXZ, stretchY, pulseXZ);
        flame.rotation.set(swayX, 0, swayZ);
      } else {
        flame.visible = false;
      }
    });

    if (flameLightRef.current) {
      flameLightRef.current.intensity = candlesLit
        ? 18 + Math.sin(t * 17) * 2.8 + Math.cos(t * 25) * 1.4
        : Math.max(0, flameLightRef.current.intensity - delta * 28);
    }

    if (!candlesLit && smokeRef.current) {
      smokeProgressRef.current = Math.min(1, smokeProgressRef.current + delta * 0.34);
      const p = smokeProgressRef.current;
      smokeRef.current.visible = p < 1;
      smokeRef.current.position.y = p * 1.35;
      smokeRef.current.rotation.y = p * 0.5;
      const mat = smokeRef.current.material as THREE.PointsMaterial;
      mat.opacity = p < 1 ? Math.sin(p * Math.PI) * 0.38 : 0;
    } else if (candlesLit && smokeRef.current) {
      smokeProgressRef.current = 0;
      smokeRef.current.visible = false;
      const mat = smokeRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0;
    }
  });

  const balloons: { pos: [number, number, number]; scale: number; phase: number; champagne: boolean }[] = [
    { pos: [-3.25, 1.35, -1.15], scale: 0.92, phase: 0.4, champagne: false },
    { pos: [-2.55, 2.05, -1.5], scale: 0.78, phase: 1.5, champagne: true },
    { pos: [-3.75, 0.72, -0.68], scale: 0.7, phase: 2.3, champagne: false },
    { pos: [3.25, 1.42, -1.08], scale: 0.92, phase: 0.9, champagne: false },
    { pos: [2.55, 2.1, -1.42], scale: 0.76, phase: 1.9, champagne: true },
    { pos: [3.7, 0.76, -0.62], scale: 0.7, phase: 2.8, champagne: false },
  ];

  const giftBoxes: { pos: [number, number, number]; size: [number, number, number]; rot: [number, number, number] }[] = [
    { pos: [-2.5, -0.93, 0.74], size: [0.72, 0.58, 0.72], rot: [0, 0.36, 0] },
    { pos: [-1.82, -1.03, 1.28], size: [0.46, 0.38, 0.46], rot: [0, -0.22, 0] },
    { pos: [2.5, -0.93, 0.7], size: [0.72, 0.58, 0.72], rot: [0, -0.32, 0] },
    { pos: [1.86, -1.03, 1.24], size: [0.48, 0.4, 0.48], rot: [0, 0.28, 0] },
  ];

  return (
    <>
      <fogExp2 attach="fog" args={['#05060d', 0.036]} />

      {/* Warm Studio HDR Environment Reflections for Gold & Ganache */}
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={3.0}
          color="#fff4d6"
          position={[0, 7, 2]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 4, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#ffb703"
          position={[-6, 2.5, 3]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[6, 3.5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#f4d06f"
          position={[6, 2.5, 3]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[6, 3.5, 1]}
        />
        <Lightformer
          form="ring"
          intensity={1.6}
          color="#fff8e3"
          position={[0, 1.5, -5]}
          scale={5}
        />
      </Environment>

      {/* Midnight Starry Sky */}
      <Stars radius={60} depth={40} count={2500} factor={3} fade />

      {/* Key Spotlight (castShadow), Rim Light, and Dynamic Candle Glow */}
      <ambientLight intensity={0.28} />
      <spotLight
        position={[3.5, 7.5, 4.5]}
        angle={0.55}
        penumbra={0.65}
        intensity={48}
        color="#ffe8b8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight
        position={[-4.5, 5.2, -3.5]}
        angle={0.65}
        penumbra={0.8}
        intensity={26}
        color="#f4d06f"
      />
      <pointLight
        ref={flameLightRef}
        position={[0, 2.35, 0.25]}
        intensity={18}
        color="#ffae34"
        distance={10}
      />

      {/* Subtle Golden Volumetric Light Rays */}
      <mesh position={[0, 1.9, -0.4]} rotation={[0.12, 0, 0]}>
        <coneGeometry args={[2.9, 6.2, 32, 1, true]} />
        <meshBasicMaterial
          color="#f4d06f"
          transparent
          opacity={0.045}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <GoldenDustOrbs particleMultiplier={particleMultiplier} />

      <FireworksLayer
        intensity="ambient"
        burstSignal={burstSignal}
        particleMultiplier={particleMultiplier}
        enabled={fireworksEnabled}
        enableSound={fireworksEnabled}
      />

      <SparklerFountains enabled={fireworksEnabled} particleMultiplier={particleMultiplier} />

      {/* Reflective Dark Obsidian-Marble Stage Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]} receiveShadow>
        <circleGeometry args={[6.4, 72]} />
        <MeshReflectorMaterial
          blur={reflectorBlur}
          resolution={reflectorResolution}
          mixBlur={0.9}
          mixStrength={34}
          roughness={0.38}
          depthScale={0.8}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a090e"
          metalness={0.55}
          mirror={0.65}
          map={marbleTextures.map}
          roughnessMap={marbleTextures.roughnessMap}
        />
      </mesh>

      {/* Ground Contact Shadows beneath cake platter & gift boxes */}
      <ContactShadows
        position={[0, -1.23, 0]}
        opacity={0.72}
        scale={9}
        blur={2.2}
        far={3.5}
        color="#000000"
      />

      {/* Beveled Reflective Gold Cake Platter & Obsidian Dais */}
      <group position={[0, -1.16, 0]}>
        <mesh material={goldMat} castShadow receiveShadow>
          <cylinderGeometry args={[1.95, 2.08, 0.14, 64]} />
        </mesh>
        <mesh position={[0, 0.08, 0]} material={goldMat}>
          <torusGeometry args={[1.94, 0.03, 16, 64]} />
        </mesh>
      </group>

      {/* High-Detail Sculpted 3-Tier Cake */}
      <group ref={cakeGroupRef} position={[0, -1.02, 0]}>
        {/* Sculpted Beveled Tier 1 */}
        <mesh geometry={geometries.tier1} material={chocoCakeMat} castShadow receiveShadow />
        <mesh position={[0, 0.61, 0]} material={ganacheMat} castShadow>
          <cylinderGeometry args={[1.41, 1.41, 0.075, 64]} />
        </mesh>

        {/* Sculpted Beveled Tier 2 */}
        <mesh
          position={[0, 0.63, 0]}
          geometry={geometries.tier2}
          material={chocoCakeMat}
          castShadow
          receiveShadow
        />
        <mesh position={[0, 1.16, 0]} material={ganacheMat} castShadow>
          <cylinderGeometry args={[1.05, 1.05, 0.07, 64]} />
        </mesh>

        {/* Sculpted Beveled Tier 3 */}
        <mesh
          position={[0, 1.18, 0]}
          geometry={geometries.tier3}
          material={chocoCakeMat}
          castShadow
          receiveShadow
        />
        <mesh position={[0, 1.59, 0]} material={ganacheMat} castShadow>
          <cylinderGeometry args={[0.75, 0.75, 0.068, 56]} />
        </mesh>

        {/* Raised Gold-Leaf Filigree, Pearl Piping & Melted Ganache Drips */}
        {tierDecor.map((tier, tIdx) => (
          <group key={tIdx}>
            <mesh position={[0, tier.baseY, 0]} material={goldMat}>
              <torusGeometry args={[tier.radius, 0.024, 14, 64]} />
            </mesh>
            {tier.beads.map((bPos, bIdx) => (
              <mesh key={`b-${bIdx}`} position={bPos} material={goldMat}>
                {bIdx % 2 === 0 ? (
                  <sphereGeometry args={[0.042, 12, 12]} />
                ) : (
                  <octahedronGeometry args={[0.044, 0]} />
                )}
              </mesh>
            ))}
            {tier.drips.map((drip, dIdx) => (
              <mesh key={`d-${dIdx}`} position={drip.pos} material={ganacheMat} castShadow>
                <capsuleGeometry args={[0.032, drip.len, 8, 12]} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Engraved Gold "GN BHARATH" Topper Plaque */}
        <group position={[0, 1.88, 0]}>
          {/* Gold Topper Stem */}
          <mesh position={[0, -0.18, 0]} material={goldMat}>
            <cylinderGeometry args={[0.02, 0.025, 0.34, 12]} />
          </mesh>
          {/* Beveled Gold Backing Shield */}
          <mesh geometry={geometries.plaque} material={goldMat} castShadow />
          {/* Engraved Face Front & Back */}
          <mesh position={[0, 0, 0.031]} material={plaqueFaceMat}>
            <planeGeometry args={[0.72, 0.34]} />
          </mesh>
          <mesh position={[0, 0, -0.031]} rotation={[0, Math.PI, 0]} material={plaqueFaceMat}>
            <planeGeometry args={[0.72, 0.34]} />
          </mesh>
        </group>

        {/* 8 Subsurface-Glow Wax Candles + Turbulent Animated Teardrop Flames */}
        {candlePositions.map(([cx, cy, cz], idx) => (
          <group key={idx} position={[cx, cy, cz]}>
            <mesh
              position={[0, 0.22, 0]}
              material={idx % 2 === 0 ? waxMatLight : waxMatGold}
              castShadow
            >
              <cylinderGeometry args={[0.035, 0.038, 0.44, 16]} />
            </mesh>
            <mesh position={[0, 0.455, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.05, 8]} />
              <meshBasicMaterial color="#1a120b" />
            </mesh>
            <group
              ref={(el) => {
                if (el) flamesRef.current[idx] = el;
              }}
              position={[0, 0.46, 0]}
            >
              <mesh geometry={geometries.outerFlame} material={outerFlameMat} />
              <mesh
                position={[0, 0.015, 0]}
                geometry={geometries.innerFlame}
                material={innerFlameMat}
              />
            </group>
          </group>
        ))}

        {/* Rising Soft Orb Smoke when blown out */}
        <points
          ref={smokeRef}
          visible={false}
          geometry={smokeSetup.geom}
          material={smokeSetup.mat}
        />
      </group>

      {/* Sculpted Teardrop Metallic Helium Balloons with Curved TubeGeometry Strings */}
      {balloons.map((b, i) => (
        <Float
          key={i}
          speed={prefersReducedMotion ? 0 : 1.4 + i * 0.16}
          floatIntensity={prefersReducedMotion ? 0 : 0.48}
          rotationIntensity={prefersReducedMotion ? 0 : 0.12}
        >
          <group position={b.pos} scale={b.scale}>
            <mesh
              geometry={geometries.balloon}
              material={b.champagne ? balloonChampagneMat : balloonGoldMat}
              castShadow
            />
            <mesh geometry={geometries.strings[i]} material={goldMat} />
          </group>
        </Float>
      ))}

      {/* Luxury Beveled Velvet-Black Gift Boxes with Satin Gold Ribbons & Sculpted Bows */}
      {giftBoxes.map((box, idx) => (
        <LuxuryGiftBox3D
          key={idx}
          size={box.size}
          position={box.pos}
          rotation={box.rot}
        />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.54}
        autoRotate={!prefersReducedMotion}
        autoRotateSpeed={0.42}
        onStart={() => {
          isDraggingRef.current = true;
        }}
        onEnd={() => {
          isDraggingRef.current = false;
        }}
      />
      <CameraChoreography isDraggingRef={isDraggingRef} />

      {/* Photorealistic Post-Processing: Selective Bloom + Vignette + ACES Filmic ToneMapping */}
      <EffectComposer multisampling={composerMultisampling}>
        <Bloom
          intensity={0.65}
          luminanceThreshold={0.85}
          luminanceSmoothing={0.25}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.22} darkness={0.6} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

export function WelcomeCakeScene({
  mediaItems,
  onScrollToMemories,
  fireworksEnabled = true,
  globalBurstSignal = 0,
  onTriggerCelebrationBurst,
}: WelcomeCakeSceneProps) {
  const quality = useAdaptiveQuality();
  const [candlesLit, setCandlesLit] = useState(true);
  const [localBurstSignal, setLocalBurstSignal] = useState(0);
  const burstSignal = localBurstSignal + globalBurstSignal;
  const [slideIndex, setSlideIndex] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const micCleanupRef = useRef<(() => void) | null>(null);
  const isDraggingRef = useRef(false);

  // Automatic Background Memory Projection Slideshow (Photos + Muted Videos)
  useEffect(() => {
    if (mediaItems.length <= 1) return;
    const current = mediaItems[slideIndex % mediaItems.length];
    const duration = current?.media_type === 'video' ? 9000 : 5200;
    const timer = window.setTimeout(() => {
      setSlideIndex((prev) => (prev + 1) % mediaItems.length);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [mediaItems, slideIndex]);

  const handleBlowCandles = () => {
    if (!candlesLit) return;
    setCandlesLit(false);
    setLocalBurstSignal((n) => n + 1);
    onTriggerCelebrationBurst?.();
    audioService.swellCelebration();
    audioService.playFireworkBoom(1.2);

    const colors = ['#fff3c4', '#f4d06f', '#d4af37', '#ffb703'];
    confetti({ particleCount: 120, spread: 100, origin: { y: 0.65 }, colors });
    window.setTimeout(() => {
      confetti({ particleCount: 65, angle: 60, spread: 65, origin: { x: 0.15, y: 0.7 }, colors });
      confetti({ particleCount: 65, angle: 120, spread: 65, origin: { x: 0.85, y: 0.7 }, colors });
    }, 260);
  };

  const handleRelightCandles = () => {
    setCandlesLit(true);
  };

  const toggleMicBlow = async () => {
    if (micActive) {
      micCleanupRef.current?.();
      micCleanupRef.current = null;
      setMicActive(false);
      return;
    }

    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let rafId = 0;
      let stopped = false;

      const cleanup = () => {
        stopped = true;
        cancelAnimationFrame(rafId);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };

      micCleanupRef.current = cleanup;
      setMicActive(true);

      const monitor = () => {
        if (stopped) return;
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = sum / buffer.length;
        if (avg > 62) {
          handleBlowCandles();
          cleanup();
          micCleanupRef.current = null;
          setMicActive(false);
          return;
        }
        rafId = requestAnimationFrame(monitor);
      };
      rafId = requestAnimationFrame(monitor);
    } catch {
      setMicError('Microphone unavailable — use the Blow Candles button.');
      setMicActive(false);
    }
  };

  useEffect(() => {
    return () => {
      micCleanupRef.current?.();
    };
  }, []);

  const currentSlide = mediaItems.length > 0 ? mediaItems[slideIndex % mediaItems.length] : null;

  return (
    <section
      id="home"
      className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between pt-20 pb-8 bg-gradient-to-b from-[#040610] via-[#07070b] to-[#050507]"
    >
      {/* Dynamic Background Memory Projection Screen (Curved Golden-Rimmed Arch Backdrop) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="relative w-[94%] max-w-6xl h-[75vh] rounded-t-[10rem] rounded-b-[2.5rem] overflow-hidden border border-[#f4d06f]/30 shadow-[0_0_95px_rgba(244,208,111,0.18),inset_0_0_45px_rgba(212,175,55,0.14)]"
          style={{
            transform: 'perspective(1400px) rotateX(4deg)',
          }}
        >
          <AnimatePresence mode="wait">
            {currentSlide ? (
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.42 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.15, ease: 'easeInOut' }}
                className="w-full h-full"
              >
                {currentSlide.media_type === 'video' ? (
                  <video
                    src={currentSlide.url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover scale-105"
                  />
                ) : (
                  <img
                    src={currentSlide.url}
                    alt={currentSlide.title}
                    className="w-full h-full object-cover scale-105"
                  />
                )}
              </motion.div>
            ) : (
              /* Rich Golden Ambient Bokeh Fallback when no media is published yet */
              <motion.div
                key="ambient-bokeh"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full relative bg-[radial-gradient(ellipse_at_50%_42%,rgba(244,208,111,0.22),rgba(19,14,9,0.92)_64%,#050508_100%)]"
              >
                <div className="absolute top-[18%] left-[22%] w-40 h-40 rounded-full bg-[#f4d06f]/20 blur-3xl animate-pulse" />
                <div
                  className="absolute top-[32%] right-[20%] w-52 h-52 rounded-full bg-[#ffb703]/15 blur-3xl animate-pulse"
                  style={{ animationDelay: '700ms' }}
                />
                <div
                  className="absolute bottom-[24%] left-[42%] w-44 h-44 rounded-full bg-[#fff3c4]/15 blur-3xl animate-pulse"
                  style={{ animationDelay: '1300ms' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-b from-[#05060c]/65 via-transparent to-[#050507]/90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,transparent_28%,rgba(5,6,12,0.72)_85%)]" />
        </div>
      </div>

      {/* Subtle Dark Palace & Archway Silhouettes along lower horizon */}
      <svg
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 inset-x-0 w-full h-36 sm:h-48 opacity-75 z-0"
      >
        <path
          d="M0,220 L0,165 L70,165 L95,120 L120,165 L195,165 L220,105 L245,85 L270,105 L295,165 L405,165 L435,125 L470,110 L505,125 L535,165 L905,165 L935,125 L970,110 L1005,125 L1035,165 L1145,165 L1170,105 L1195,85 L1220,105 L1245,165 L1320,165 L1345,120 L1370,165 L1440,165 L1440,220 Z"
          fill="#07070c"
          stroke="rgba(244,208,111,0.22)"
          strokeWidth="1.2"
        />
      </svg>

      {/* Hero Header Typography */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="relative z-20 text-center px-4 mt-2"
      >
        <div className="inline-flex items-center justify-center mb-1.5">
          <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-[#f4d06f] drop-shadow-[0_0_18px_rgba(244,208,111,0.8)]" />
        </div>
        <p className="font-script-gold text-3xl sm:text-5xl text-gold-gradient leading-tight">
          Happy Birthday
        </p>
        <h1 className="font-serif-luxury text-4xl sm:text-6xl md:text-7xl font-bold tracking-wider text-gold-gradient drop-shadow-[0_8px_32px_rgba(0,0,0,0.9)]">
          GN BHARATH
        </h1>
        <p className="text-xs sm:text-sm text-[#f5ecd7]/80 tracking-wide mt-1.5">
          Wishing you all the happiness in the world!
        </p>
      </motion.div>

      {/* Photorealistic Interactive 3D Cake Stage */}
      <div className="relative z-10 w-full h-[58vh] min-h-[400px] max-h-[620px]">
        <Canvas
          camera={{ position: [0, 1.5, 6.1], fov: 46 }}
          dpr={quality.dpr}
          shadows
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <CakeStage3D
            candlesLit={candlesLit}
            burstSignal={burstSignal}
            particleMultiplier={quality.particleMultiplier}
            reflectorResolution={quality.reflectorResolution}
            reflectorBlur={quality.reflectorBlur}
            composerMultisampling={quality.composerMultisampling}
            fireworksEnabled={fireworksEnabled}
            isDraggingRef={isDraggingRef}
            prefersReducedMotion={quality.prefersReducedMotion}
          />
        </Canvas>
      </div>

      {/* Cake Interaction Controls */}
      <div className="relative z-20 flex flex-col items-center gap-3 px-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {candlesLit ? (
            <button
              type="button"
              onClick={handleBlowCandles}
              className="gold-pill-btn rounded-full px-7 py-3 text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              Blow Candles
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRelightCandles}
              className="rounded-full border border-[#d4af37]/45 bg-black/65 px-6 py-3 text-sm font-semibold text-[#fff3c4] hover:bg-[#d4af37]/15 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#f4d06f]" />
              Relight Candles
            </button>
          )}

          {candlesLit && (
            <button
              type="button"
              onClick={toggleMicBlow}
              className={`rounded-full border px-4 py-3 text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                micActive
                  ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-200'
                  : 'border-[#d4af37]/30 bg-black/55 text-[#f4d06f] hover:bg-[#d4af37]/10'
              }`}
            >
              {micActive ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
              {micActive ? 'Blow into Mic...' : 'Blow via Mic'}
            </button>
          )}
        </div>

        {micError && <p className="text-[11px] text-amber-300/80">{micError}</p>}

        <p className="text-[11px] text-[#cbbd9c]/55">
          Drag to rotate the 3D birthday cake • Live memory projection behind stage
        </p>

        <button
          type="button"
          onClick={onScrollToMemories}
          className="mt-1 inline-flex flex-col items-center text-[11px] uppercase tracking-[0.25em] text-[#d4af37]/80 hover:text-[#fff3c4] cursor-pointer"
        >
          <span>Scroll Down</span>
          <ChevronDown className="w-4 h-4 mt-0.5 animate-bounce" />
        </button>
      </div>
    </section>
  );
}
