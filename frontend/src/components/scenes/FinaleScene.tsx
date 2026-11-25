import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { PartyPopper, Crown } from 'lucide-react';
import { FireworksLayer } from './FireworksLayer';
import { useAdaptiveQuality } from '../../hooks/useAdaptiveQuality';
import { audioService } from '../../services/audioService';

interface FinaleSceneProps {
  fireworksEnabled?: boolean;
  globalBurstSignal?: number;
  onTriggerCelebrationBurst?: () => void;
}

function FinaleCameraRig({ burstSignal }: { burstSignal: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0.2, 5.8);
    const tween = gsap.to(camera.position, {
      x: 0,
      y: 0.6,
      z: 8.6,
      duration: 2.2,
      ease: 'power2.out',
    });
    return () => {
      tween.kill();
    };
  }, [camera, burstSignal]);
  return null;
}

export function FinaleScene({
  fireworksEnabled = true,
  globalBurstSignal = 0,
  onTriggerCelebrationBurst,
}: FinaleSceneProps) {
  const quality = useAdaptiveQuality();
  const [localBurstSignal, setLocalBurstSignal] = useState(0);
  const burstSignal = localBurstSignal + globalBurstSignal;

  const handleCelebrateAgain = () => {
    setLocalBurstSignal((n) => n + 1);
    onTriggerCelebrationBurst?.();
    audioService.swellCelebration();
    audioService.playFireworkBoom(1.2);

    const colors = ['#fff3c4', '#f4d06f', '#d4af37', '#ffb703', '#ff4d6d', '#2ec4b6'];
    confetti({ particleCount: 140, spread: 115, origin: { y: 0.65 }, colors });
    window.setTimeout(() => {
      confetti({ particleCount: 80, angle: 60, spread: 75, origin: { x: 0.1, y: 0.7 }, colors });
      confetti({ particleCount: 80, angle: 120, spread: 75, origin: { x: 0.9, y: 0.7 }, colors });
    }, 280);
  };

  return (
    <section
      id="finale"
      className="relative min-h-[90vh] w-full overflow-hidden flex flex-col items-center justify-center px-4 py-24 bg-gradient-to-b from-[#05060e] via-[#060609] to-[#040406]"
    >
      {/* 3D Panoramic Fireworks & Starry Night Sky */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0.5, 8], fov: 50 }}
          dpr={quality.dpr}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <fogExp2 attach="fog" args={['#05060d', 0.032]} />
          <ambientLight intensity={0.25} />
          <Stars radius={60} depth={40} count={2500} factor={3} fade />
          <FireworksLayer
            intensity="finale"
            burstSignal={burstSignal}
            particleMultiplier={quality.particleMultiplier}
            enabled={fireworksEnabled}
            enableSound={fireworksEnabled}
          />
          <FinaleCameraRig burstSignal={burstSignal} />
          <EffectComposer multisampling={quality.composerMultisampling}>
            <Bloom
              intensity={0.65}
              luminanceThreshold={0.85}
              luminanceSmoothing={0.25}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.22} darkness={0.6} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Panoramic Royal Palace Silhouette Skyline */}
      <svg
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 inset-x-0 w-full h-36 sm:h-48 opacity-85"
      >
        <defs>
          <linearGradient id="palaceGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#261c0b" />
            <stop offset="100%" stopColor="#050507" />
          </linearGradient>
        </defs>
        <path
          d="M0,240 L0,185 L85,185 L105,140 L125,185 L210,185 L235,115 L255,95 L275,115 L300,185 L410,185 L440,130 L480,105 L520,130 L550,185 L645,185 L675,110 L720,62 L765,110 L795,185 L895,185 L925,130 L965,105 L1005,130 L1035,185 L1145,185 L1170,115 L1190,95 L1210,115 L1235,185 L1320,185 L1340,140 L1360,185 L1440,185 L1440,240 Z"
          fill="url(#palaceGold)"
          stroke="rgba(212,175,55,0.28)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Grand Finale Typography */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-3xl"
      >
        <Crown className="w-10 h-10 text-[#f4d06f] mx-auto mb-3 drop-shadow-[0_0_20px_rgba(244,208,111,0.75)]" />
        <p className="font-script-gold text-4xl sm:text-6xl text-gold-gradient leading-tight">
          Happy Birthday
        </p>
        <h2 className="font-serif-luxury text-5xl sm:text-7xl font-bold tracking-wider text-gold-gradient mt-1 drop-shadow-[0_12px_36px_rgba(0,0,0,0.95)]">
          GN BHARATH
        </h2>
        <p className="font-serif-luxury italic text-xl sm:text-3xl text-[#fff3c4]/90 mt-4">
          Keep shining, always!
        </p>

        <button
          type="button"
          onClick={handleCelebrateAgain}
          className="mt-8 gold-pill-btn rounded-full px-8 py-3.5 text-sm font-semibold inline-flex items-center gap-2.5 cursor-pointer"
        >
          <PartyPopper className="w-4 h-4" />
          Celebrate Again
        </button>
      </motion.div>
    </section>
  );
}
