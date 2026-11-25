import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { audioService } from '../../services/audioService';
import { getRadialGlowTexture } from '../../utils/particleTexture';

interface FireworksLayerProps {
  intensity?: 'ambient' | 'finale';
  burstSignal?: number;
  particleMultiplier?: number;
  enabled?: boolean;
  enableSound?: boolean;
}

interface FireworkShell {
  startPos: THREE.Vector3;
  origin: THREE.Vector3;
  velocities: Float32Array;
  phase: 'rocket' | 'burst';
  age: number;
  rocketDuration: number;
  maxAge: number;
  color: THREE.Color;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  rocketGeom: THREE.BufferGeometry;
  rocketMat: THREE.PointsMaterial;
}

// Rich golden + festival multi-color palette
const PALETTE = ['#fff3c4', '#f4d06f', '#ffb703', '#ff4d6d', '#2ec4b6', '#ffd166'];

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function populateShell(
  shell: FireworkShell,
  particlesPerShell: number,
  intensity: 'ambient' | 'finale',
  seedOffset: number,
  immediateBurst = false
) {
  // Frame bursts visibly in upper-left, upper-right, and mid-sky around the cake
  const zonePick = seededUnit(seedOffset + 9);
  let targetX: number;
  if (zonePick < 0.38) {
    targetX = -5.2 + seededUnit(seedOffset + 1) * 2.8; // Upper-left sky
  } else if (zonePick < 0.76) {
    targetX = 2.4 + seededUnit(seedOffset + 1) * 2.8; // Upper-right sky
  } else {
    targetX = (seededUnit(seedOffset + 1) - 0.5) * 4.4; // Background center sky
  }

  const targetY = 1.45 + seededUnit(seedOffset + 2) * (intensity === 'finale' ? 2.4 : 1.9);
  const targetZ = -3.4 + seededUnit(seedOffset + 3) * 2.1; // Well in front of background reel

  shell.origin.set(targetX, targetY, targetZ);
  shell.startPos.set(targetX * 0.75, -1.6, targetZ);
  shell.rocketDuration = immediateBurst ? 0.02 : 0.36 + seededUnit(seedOffset + 7) * 0.14;
  shell.phase = immediateBurst ? 'burst' : 'rocket';
  shell.age = 0;
  shell.maxAge = 1.35 + seededUnit(seedOffset + 4) * 0.55;

  const colorIdx = Math.floor(seededUnit(seedOffset + 5) * PALETTE.length);
  shell.color.set(PALETTE[colorIdx]);

  for (let i = 0; i < particlesPerShell; i++) {
    const u = seededUnit(seedOffset + i * 3 + 10);
    const v = seededUnit(seedOffset + i * 3 + 11);
    const w = seededUnit(seedOffset + i * 3 + 12);
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    // Double-ring + spherical burst velocity for fuller cracker bloom
    const ringBoost = i % 4 === 0 ? 1.35 : 0.85 + w * 0.55;
    const speed = (1.9 + w * 2.7) * ringBoost * (intensity === 'finale' ? 1.25 : 1);
    shell.velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    shell.velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
    shell.velocities[i * 3 + 2] = Math.cos(phi) * speed;
  }
}

export function FireworksLayer({
  intensity = 'ambient',
  burstSignal = 0,
  particleMultiplier = 1,
  enabled = true,
  enableSound = false,
}: FireworksLayerProps) {
  const particlesPerShell = Math.max(
    42,
    Math.round((intensity === 'finale' ? 110 : 74) * particleMultiplier)
  );
  // Staggered shells launching every ~1.2-2.0s across the sky
  const shellCount = intensity === 'finale' ? 7 : 4;
  const rocketTrailCount = 16;

  const cycleRef = useRef(1);
  const lastBurstRef = useRef(burstSignal);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const flashIntensityRef = useRef(0);

  const shells = useMemo(() => {
    const glowMap = getRadialGlowTexture();
    const arr: FireworkShell[] = [];
    for (let s = 0; s < shellCount; s++) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(particlesPerShell * 3), 3)
      );

      const rocketGeom = new THREE.BufferGeometry();
      rocketGeom.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(rocketTrailCount * 3), 3)
      );

      const color = new THREE.Color(PALETTE[s % PALETTE.length]);
      const material = new THREE.PointsMaterial({
        size: intensity === 'finale' ? 0.36 : 0.31,
        map: glowMap,
        color,
        transparent: true,
        opacity: 0.98,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const rocketMat = new THREE.PointsMaterial({
        size: 0.26,
        map: glowMap,
        color: '#fff6d6',
        transparent: true,
        opacity: 0.98,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const shell: FireworkShell = {
        startPos: new THREE.Vector3(),
        origin: new THREE.Vector3(),
        velocities: new Float32Array(particlesPerShell * 3),
        phase: 'rocket',
        age: 0,
        rocketDuration: 0.4,
        maxAge: 1.6,
        color,
        geometry,
        material,
        rocketGeom,
        rocketMat,
      };
      populateShell(shell, particlesPerShell, intensity, (s + 1) * 1000);
      // Stagger initial phases so bursts fire immediately and every ~1.2-1.8s
      const stagger = (s / shellCount) * 1.45;
      if (stagger < shell.rocketDuration) {
        shell.phase = 'rocket';
        shell.age = stagger;
      } else {
        shell.phase = 'burst';
        shell.age = stagger - shell.rocketDuration;
      }
      arr.push(shell);
    }
    return arr;
  }, [shellCount, particlesPerShell, intensity]);

  const mutableShellsRef = useRef<FireworkShell[]>([]);

  useEffect(() => {
    mutableShellsRef.current = shells;
    return () => {
      shells.forEach((s) => {
        s.geometry.dispose();
        s.material.dispose();
        s.rocketGeom.dispose();
        s.rocketMat.dispose();
      });
    };
  }, [shells]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const activeShells = mutableShellsRef.current;

    if (!enabled) {
      activeShells.forEach((s) => {
        s.material.opacity = 0;
        s.rocketMat.opacity = 0;
      });
      if (flashLightRef.current) flashLightRef.current.intensity = 0;
      return;
    }

    if (burstSignal !== lastBurstRef.current) {
      lastBurstRef.current = burstSignal;
      activeShells.forEach((s, idx) => {
        cycleRef.current += 1;
        populateShell(s, particlesPerShell, intensity, cycleRef.current * 331 + idx * 71, true);
      });
      flashIntensityRef.current = 32;
      if (enableSound) {
        audioService.playFireworkBoom(1.15);
      }
    }

    // Decay cake illumination flash
    if (flashLightRef.current) {
      flashIntensityRef.current = Math.max(0, flashIntensityRef.current - dt * 52);
      flashLightRef.current.intensity = flashIntensityRef.current;
    }

    activeShells.forEach((shell, idx) => {
      shell.age += dt;

      if (shell.phase === 'rocket') {
        const p = Math.min(1, shell.age / shell.rocketDuration);
        const rPos = shell.rocketGeom.getAttribute('position') as THREE.BufferAttribute;
        const rArr = rPos.array as Float32Array;
        for (let k = 0; k < rocketTrailCount; k++) {
          const tp = Math.max(0, p - k * 0.032);
          rArr[k * 3] = THREE.MathUtils.lerp(shell.startPos.x, shell.origin.x, tp);
          rArr[k * 3 + 1] = THREE.MathUtils.lerp(shell.startPos.y, shell.origin.y, tp);
          rArr[k * 3 + 2] = THREE.MathUtils.lerp(shell.startPos.z, shell.origin.z, tp);
        }
        rPos.needsUpdate = true;
        shell.rocketMat.opacity = 0.95;
        shell.material.opacity = 0;

        if (shell.age >= shell.rocketDuration) {
          shell.phase = 'burst';
          shell.age = 0;
          shell.rocketMat.opacity = 0;
          flashIntensityRef.current = Math.max(flashIntensityRef.current, 24);
          if (flashLightRef.current) {
            flashLightRef.current.position.set(shell.origin.x * 0.45, 2.3, 1.2);
            flashLightRef.current.color.copy(shell.color);
          }
          if (enableSound) {
            audioService.playFireworkBoom(intensity === 'finale' ? 1.0 : 0.78);
          }
        }
        return;
      }

      // Burst phase
      if (shell.age >= shell.maxAge) {
        cycleRef.current += 1;
        populateShell(shell, particlesPerShell, intensity, cycleRef.current * 331 + idx * 71);
        return;
      }

      const posAttr = shell.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const t = shell.age;
      const drag = Math.max(0.22, 1 - t * 0.28);

      for (let i = 0; i < particlesPerShell; i++) {
        const i3 = i * 3;
        arr[i3] = shell.origin.x + shell.velocities[i3] * t * drag;
        arr[i3 + 1] = shell.origin.y + shell.velocities[i3 + 1] * t * drag - 0.95 * t * t;
        arr[i3 + 2] = shell.origin.z + shell.velocities[i3 + 2] * t * drag;
      }

      posAttr.needsUpdate = true;
      const lifeRatio = 1 - shell.age / shell.maxAge;
      shell.material.opacity = Math.max(0, Math.pow(lifeRatio, 0.75));
      shell.material.color.copy(shell.color);
      shell.rocketMat.opacity = 0;
    });
  });

  return (
    <group>
      {/* Dynamic flash light reflecting off the 3D cake & stage on every burst */}
      <pointLight ref={flashLightRef} position={[0, 2.4, 1.2]} intensity={0} distance={14} />

      {shells.map((shell, idx) => (
        <group key={idx}>
          <points geometry={shell.rocketGeom} material={shell.rocketMat} />
          <points geometry={shell.geometry} material={shell.material} />
        </group>
      ))}
    </group>
  );
}

/**
 * Ground-level golden sparkler fountains ("anar" / flower-pot crackers)
 * flanking the 3D cake stage on left and right edges.
 */
export function SparklerFountains({
  enabled = true,
  particleMultiplier = 1,
}: {
  enabled?: boolean;
  particleMultiplier?: number;
}) {
  const sparkCount = Math.max(36, Math.round(75 * particleMultiplier));
  const fountains = useMemo(() => {
    const glowMap = getRadialGlowTexture();
    const positions: [number, number, number][] = [
      [-2.85, -1.25, 0.45],
      [2.85, -1.25, 0.45],
    ];
    return positions.map((pos, fIdx) => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sparkCount * 3), 3));
      const mat = new THREE.PointsMaterial({
        size: 0.22,
        map: glowMap,
        color: '#ffe082',
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const seeds = new Float32Array(sparkCount * 4);
      for (let i = 0; i < sparkCount; i++) {
        seeds[i * 4] = seededUnit(fIdx * 500 + i * 4 + 1); // phase offset
        seeds[i * 4 + 1] = (seededUnit(fIdx * 500 + i * 4 + 2) - 0.5) * 1.1; // x spread
        seeds[i * 4 + 2] = 2.6 + seededUnit(fIdx * 500 + i * 4 + 3) * 1.8; // upward speed
        seeds[i * 4 + 3] = (seededUnit(fIdx * 500 + i * 4 + 4) - 0.5) * 0.9; // z spread
      }
      return { pos, geom, mat, seeds };
    });
  }, [sparkCount]);

  const mutableFountainsRef = useRef<typeof fountains>([]);

  useEffect(() => {
    mutableFountainsRef.current = fountains;
    return () => {
      fountains.forEach((f) => {
        f.geom.dispose();
        f.mat.dispose();
      });
    };
  }, [fountains]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    mutableFountainsRef.current.forEach((f) => {
      f.mat.opacity = enabled ? 0.92 : 0;
      if (!enabled) return;

      const attr = f.geom.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < sparkCount; i++) {
        const i4 = i * 4;
        const life = (t * 1.35 + f.seeds[i4]) % 1.0;
        arr[i * 3] = f.pos[0] + f.seeds[i4 + 1] * life;
        arr[i * 3 + 1] = f.pos[1] + 0.25 + f.seeds[i4 + 2] * life - 1.65 * life * life;
        arr[i * 3 + 2] = f.pos[2] + f.seeds[i4 + 3] * life;
      }
      attr.needsUpdate = true;
    });
  });

  return (
    <group>
      {fountains.map((f, idx) => (
        <group key={idx}>
          {/* Decorative gold-banded conical "anar" cracker pot */}
          <mesh position={[f.pos[0], f.pos[1] + 0.08, f.pos[2]]}>
            <coneGeometry args={[0.16, 0.34, 18]} />
            <meshStandardMaterial color="#18120e" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[f.pos[0], f.pos[1] + 0.02, f.pos[2]]}>
            <torusGeometry args={[0.14, 0.02, 8, 24]} />
            <meshStandardMaterial color="#f4d06f" metalness={0.9} roughness={0.2} />
          </mesh>
          {enabled && (
            <pointLight
              position={[f.pos[0], f.pos[1] + 0.45, f.pos[2]]}
              intensity={6}
              color="#ffcf56"
              distance={4.5}
            />
          )}
          <points geometry={f.geom} material={f.mat} />
        </group>
      ))}
    </group>
  );
}
