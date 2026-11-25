import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
  MeshReflectorMaterial,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Moon, Sparkles as SparkleIcon, RotateCcw } from 'lucide-react';
import { useAdaptiveQuality } from '../../hooks/useAdaptiveQuality';
import { audioService } from '../../services/audioService';
import { LuxuryGiftBox3D } from './LuxuryGiftBox3D';
import { getRadialGlowTexture } from '../../utils/particleTexture';
import { getLunarTextures, getObsidianMarbleTextures } from '../../utils/proceduralTextures';

function SurpriseMoonGift3D({
  isOpen,
  replayVersion,
  particleMultiplier,
  reflectorResolution,
  reflectorBlur,
  composerMultisampling,
  prefersReducedMotion,
}: {
  isOpen: boolean;
  replayVersion: number;
  particleMultiplier: number;
  reflectorResolution: number;
  reflectorBlur: [number, number];
  composerMultisampling: number;
  prefersReducedMotion: boolean;
}) {
  const boxGroupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const ribbonOrbitRef = useRef<THREE.Group>(null);
  const explosionRef = useRef<THREE.Points>(null);

  const moonGroupRef = useRef<THREE.Group>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const moonStarsRef = useRef<THREE.Points>(null);
  const moonHaloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const moonLightRef = useRef<THREE.PointLight>(null);

  const openAnimRef = useRef(0);
  const moonRiseRef = useRef(0);

  // Reset animation progress when Replay Gift triggers
  useEffect(() => {
    if (!isOpen) {
      openAnimRef.current = 0;
      moonRiseRef.current = 0;
    }
  }, [isOpen, replayVersion]);

  const marbleTextures = useMemo(() => getObsidianMarbleTextures(), []);
  const lunarTextures = useMemo(() => getLunarTextures(), []);

  // Lunar surface material with crater bump, roughness & soft moonlight tint
  const moonMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: lunarTextures.map,
        bumpMap: lunarTextures.bumpMap,
        bumpScale: 0.045,
        roughnessMap: lunarTextures.roughnessMap,
        roughness: 0.88,
        metalness: 0.04,
        color: '#f5ebd4',
        emissive: '#ffdca0',
        emissiveMap: lunarTextures.map,
        emissiveIntensity: 0.34,
      }),
    [lunarTextures]
  );

  // Golden & silver sparkle burst from opening box
  const burstCount = Math.max(48, Math.round(160 * particleMultiplier));
  const { burstDirections, explosionGeom, explosionMat } = useMemo(() => {
    const dirs = new Float32Array(burstCount * 3);
    const colors = new Float32Array(burstCount * 3);
    const rand = (s: number) => {
      const x = Math.sin(s * 91.345 + 17.13) * 43758.5453;
      return x - Math.floor(x);
    };
    const gold = new THREE.Color('#f4d06f');
    const silver = new THREE.Color('#e8eef7');

    for (let i = 0; i < burstCount; i++) {
      const theta = rand(i * 3 + 1) * Math.PI * 2;
      const phi = rand(i * 3 + 2) * Math.PI * 0.65;
      const speed = 1.5 + rand(i * 3 + 3) * 2.6;
      dirs[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      dirs[i * 3 + 1] = Math.cos(phi) * speed + 0.9;
      dirs[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      const c = i % 2 === 0 ? gold : silver;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(burstCount * 3), 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.25,
      map: getRadialGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { burstDirections: dirs, explosionGeom: geom, explosionMat: mat };
  }, [burstCount]);

  // Orbiting ring of tiny twinkling golden stars & dust motes around the Moon
  const starCount = Math.max(40, Math.round(120 * particleMultiplier));
  const { starGeom, starMat, starAngles } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const angles = new Float32Array(starCount * 3);
    const rand = (s: number) => {
      const x = Math.sin(s * 53.17 + 7.91) * 43758.5453;
      return x - Math.floor(x);
    };

    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2 + rand(i * 3) * 0.3;
      const radius = 1.48 + rand(i * 3 + 1) * 0.62;
      const yOff = (rand(i * 3 + 2) - 0.5) * 0.48;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = yOff;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      angles[i * 3] = angle;
      angles[i * 3 + 1] = radius;
      angles[i * 3 + 2] = yOff;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.17,
      map: getRadialGlowTexture(),
      color: '#ffe599',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { starGeom: geom, starMat: mat, starAngles: angles };
  }, [starCount]);

  useEffect(() => {
    return () => {
      moonMat.dispose();
      explosionGeom.dispose();
      explosionMat.dispose();
      starGeom.dispose();
      starMat.dispose();
    };
  }, [moonMat, explosionGeom, explosionMat, starGeom, starMat]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();

    const target = isOpen ? 1 : 0;
    openAnimRef.current += (target - openAnimRef.current) * Math.min(1, dt * 3.8);
    const p = openAnimRef.current;

    // Gentle idle hover of closed gift box
    if (boxGroupRef.current) {
      boxGroupRef.current.position.y =
        -0.98 + (isOpen || prefersReducedMotion ? 0 : Math.sin(t * 1.4) * 0.045);
    }

    // Lift & tilt box lid open
    if (lidRef.current) {
      lidRef.current.position.y = 0.72 + p * 0.85;
      lidRef.current.position.z = -p * 0.72;
      lidRef.current.rotation.x = -p * 0.92;
    }

    // Warm light beam from inside the open box
    if (beamRef.current) {
      beamRef.current.visible = p > 0.05;
      beamRef.current.scale.set(0.6 + p * 0.65, p, 0.6 + p * 0.65);
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = p * (0.28 + Math.sin(t * 4) * 0.04);
    }

    // Untie & expand golden ribbons
    if (ribbonOrbitRef.current) {
      ribbonOrbitRef.current.rotation.y = t * (isOpen ? 0.9 : 0.42);
      ribbonOrbitRef.current.scale.setScalar(1 + p * 0.75);
    }

    // Burst of golden & silver sparkles when opened
    if (explosionRef.current) {
      explosionRef.current.visible = isOpen && p > 0.08;
      if (isOpen) {
        const pos = explosionGeom.getAttribute('position') as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        const cycle = (t * 0.85) % 1.8;
        for (let i = 0; i < burstCount; i++) {
          const i3 = i * 3;
          arr[i3] = burstDirections[i3] * cycle;
          arr[i3 + 1] = 0.35 + burstDirections[i3 + 1] * cycle - 0.52 * cycle * cycle;
          arr[i3 + 2] = burstDirections[i3 + 2] * cycle;
        }
        pos.needsUpdate = true;
      }
    }

    // Smoothly float the 3D Moon upward out of the opening box
    const moonTarget = isOpen && p > 0.2 ? 1 : 0;
    moonRiseRef.current += (moonTarget - moonRiseRef.current) * Math.min(1, dt * 2.2);
    const mp = moonRiseRef.current;

    if (moonGroupRef.current) {
      moonGroupRef.current.visible = mp > 0.015;
      const hover = prefersReducedMotion ? 0 : Math.sin(t * 1.15) * 0.085 * mp;
      moonGroupRef.current.position.y = THREE.MathUtils.lerp(-0.9, 1.38, mp) + hover;
      moonGroupRef.current.scale.setScalar(THREE.MathUtils.lerp(0.14, 1.0, mp));
    }

    // Slow axial rotation of the Moon
    if (moonMeshRef.current && mp > 0.01) {
      moonMeshRef.current.rotation.y += dt * (prefersReducedMotion ? 0.03 : 0.14);
    }

    // Atmospheric BackSide halo & attached moonlight intensity
    if (moonHaloMatRef.current) {
      moonHaloMatRef.current.opacity = mp * (0.28 + Math.sin(t * 1.8) * 0.03);
    }
    if (moonLightRef.current) {
      moonLightRef.current.intensity = mp * 26;
    }

    // Orbiting ring of tiny twinkling golden stars around the Moon
    if (moonStarsRef.current) {
      const mat = moonStarsRef.current.material as THREE.PointsMaterial;
      mat.opacity = mp * (0.82 + Math.sin(t * 3.2) * 0.14);
      const attr = starGeom.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < starCount; i++) {
        const a = starAngles[i * 3] + t * (0.22 + (i % 3) * 0.04);
        const r = starAngles[i * 3 + 1];
        const yOff = starAngles[i * 3 + 2] + Math.sin(t * 1.6 + i) * 0.05;
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = yOff;
        arr[i * 3 + 2] = Math.sin(a) * r;
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <>
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#fff4d6"
          position={[0, 6, 3]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[8, 4, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2.0}
          color="#ffb703"
          position={[-5, 2, 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[5, 3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2.0}
          color="#e2ecff"
          position={[5, 2, 2]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[5, 3, 1]}
        />
      </Environment>

      <ambientLight intensity={0.28} />
      <spotLight
        position={[3.8, 7.2, 4.5]}
        angle={0.55}
        penumbra={0.65}
        intensity={42}
        color="#ffe8b8"
        castShadow
      />
      <directionalLight position={[-4, 3, 3]} intensity={0.9} color="#cfdcf8" />

      {/* Reflective Obsidian Stage Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.66, 0]} receiveShadow>
        <circleGeometry args={[3.6, 64]} />
        <MeshReflectorMaterial
          blur={reflectorBlur}
          resolution={reflectorResolution}
          mixBlur={0.9}
          mixStrength={30}
          roughness={0.38}
          color="#0a090e"
          metalness={0.55}
          mirror={0.6}
          map={marbleTextures.map}
          roughnessMap={marbleTextures.roughnessMap}
        />
      </mesh>
      <ContactShadows position={[0, -1.64, 0]} opacity={0.72} scale={6.5} blur={2} far={3.2} />

      {/* Velvet-Black & Satin Gold Gift Box */}
      <group ref={boxGroupRef} position={[0, -0.98, 0]}>
        <LuxuryGiftBox3D size={[1.46, 1.24, 1.46]} lidRef={lidRef} />

        {/* Warm Light Beam Cone from Inside Open Box */}
        <mesh ref={beamRef} position={[0, 1.55, 0]} rotation={[Math.PI, 0, 0]} visible={false}>
          <coneGeometry args={[1.38, 2.9, 32, 1, true]} />
          <meshBasicMaterial
            color="#ffe599"
            transparent
            opacity={0.28}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Orbiting Golden Light Ribbons */}
        <group ref={ribbonOrbitRef}>
          <mesh rotation={[0.45, 0, 0.2]}>
            <torusGeometry args={[1.45, 0.02, 12, 72]} />
            <meshStandardMaterial
              color="#f4d06f"
              emissive="#f4d06f"
              emissiveIntensity={1.5}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[-0.5, 0.5, -0.25]}>
            <torusGeometry args={[1.75, 0.015, 12, 72]} />
            <meshStandardMaterial
              color="#fff3c4"
              emissive="#fff3c4"
              emissiveIntensity={1.3}
              toneMapped={false}
            />
          </mesh>
        </group>

        {/* Golden & Silver Sparkle Burst */}
        <points
          ref={explosionRef}
          visible={false}
          geometry={explosionGeom}
          material={explosionMat}
        />
      </group>

      {/* Photorealistic Rising 3D Moon + Atmospheric Halo + Orbiting Stars */}
      <group ref={moonGroupRef} position={[0, -0.9, 0]} scale={0.14} visible={false}>
        {/* Attached Warm Silver-Gold Moonlight illuminating open box flaps */}
        <pointLight ref={moonLightRef} position={[0, -0.2, 0.2]} intensity={0} color="#ffeec2" distance={11} />

        {/* High-Resolution 3D Lunar Sphere */}
        <mesh ref={moonMeshRef} material={moonMat} castShadow receiveShadow>
          <sphereGeometry args={[1.15, 64, 64]} />
        </mesh>

        {/* Soft BackSide Atmospheric Moonlight Rim Halo */}
        <mesh>
          <sphereGeometry args={[1.28, 48, 48]} />
          <meshBasicMaterial
            ref={moonHaloMatRef}
            color="#fff0c2"
            side={THREE.BackSide}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Outer Moonlight Aura */}
        <mesh>
          <sphereGeometry args={[1.44, 36, 36]} />
          <meshBasicMaterial
            color="#d8e4ff"
            side={THREE.BackSide}
            transparent
            opacity={0.09}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Orbiting Ring of Tiny Twinkling Golden Stars & Dust Motes */}
        <points
          ref={moonStarsRef}
          rotation={[0.28, 0, -0.18]}
          geometry={starGeom}
          material={starMat}
        />
      </group>

      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.45} maxPolarAngle={Math.PI * 0.55} />

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

export function GiftScene() {
  const quality = useAdaptiveQuality();
  const [isOpen, setIsOpen] = useState(false);
  const [replayVersion, setReplayVersion] = useState(0);

  const fireGiftCelebration = () => {
    audioService.swellCelebration();
    audioService.playCrackerPop();
    const colors = ['#fff3c4', '#f4d06f', '#e2e8f0', '#ffb703'];
    confetti({ particleCount: 110, spread: 95, origin: { y: 0.58 }, colors });
  };

  const handleOpenGift = () => {
    setIsOpen(true);
    fireGiftCelebration();
  };

  const handleReplayGift = () => {
    setIsOpen(false);
    setReplayVersion((v) => v + 1);
    window.setTimeout(() => {
      setIsOpen(true);
      fireGiftCelebration();
    }, 360);
  };

  return (
    <section id="gift" className="relative py-24 sm:py-32 px-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(244,208,111,0.12),transparent_62%)]" />

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-[#d4af37] flex items-center justify-center gap-1.5">
          <SparkleIcon className="w-3.5 h-3.5" /> Celestial Keepsake
        </p>
        <h2 className="font-serif-luxury text-4xl sm:text-5xl font-bold text-gold-gradient mt-2">
          Surprise Gift
        </h2>
        <p className="text-sm text-[#cbbd9c]/75 mt-2">
          {isOpen
            ? 'Drag to orbit around the rising moonlight • A celestial wish for GN Bharath.'
            : 'Rotate the 3D velvet-and-gold gift box, then click Open Gift to reveal what awaits inside.'}
        </p>

        <div className="relative h-[430px] sm:h-[520px] w-full mt-2">
          <Canvas
            camera={{ position: [0, 1.75, 6.2], fov: 45 }}
            dpr={quality.dpr}
            shadows
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          >
            <SurpriseMoonGift3D
              isOpen={isOpen}
              replayVersion={replayVersion}
              particleMultiplier={quality.particleMultiplier}
              reflectorResolution={quality.reflectorResolution}
              reflectorBlur={quality.reflectorBlur}
              composerMultisampling={quality.composerMultisampling}
              prefersReducedMotion={quality.prefersReducedMotion}
            />
          </Canvas>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {!isOpen ? (
            <button
              type="button"
              onClick={handleOpenGift}
              className="gold-pill-btn rounded-full px-8 py-3.5 text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              Open Gift
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReplayGift}
              className="rounded-full border border-[#d4af37]/45 bg-black/60 px-6 py-3 text-xs sm:text-sm font-medium text-[#fff3c4] hover:bg-[#d4af37]/15 flex items-center gap-2 cursor-pointer transition"
            >
              <RotateCcw className="w-4 h-4 text-[#f4d06f]" />
              Replay Gift
            </button>
          )}
        </div>

        {/* Minimal Gold-and-Silver Glass Moon Message Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 max-w-xl mx-auto rounded-3xl px-7 py-7 sm:px-9 sm:py-8 text-center backdrop-blur-xl bg-gradient-to-br from-white/[0.06] via-[#121118]/80 to-[#1a150b]/85 border border-[#e2e8f0]/20 shadow-[0_24px_70px_rgba(0,0,0,0.75),0_0_40px_rgba(244,208,111,0.14)]"
            >
              <div className="w-11 h-11 mx-auto rounded-full bg-gradient-to-br from-[#fff3c4]/20 to-[#cbd5e1]/15 border border-[#f4d06f]/45 flex items-center justify-center mb-3.5 shadow-[0_0_24px_rgba(255,243,196,0.28)]">
                <Moon className="w-5 h-5 text-[#fff3c4]" />
              </div>
              <h3 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-gold-gradient">
                To The Moon &amp; Back, Bharath
              </h3>
              <p className="text-sm sm:text-base text-[#e8eef7]/85 mt-2.5 leading-relaxed">
                Wishing you endless nights of big dreams and bright milestones. Happy Birthday,
                brother!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
