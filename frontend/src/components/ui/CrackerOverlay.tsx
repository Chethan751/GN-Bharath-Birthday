import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { SectionId } from '../ui/TopNavbar';
import { audioService } from '../../services/audioService';
import { useAdaptiveQuality } from '../../hooks/useAdaptiveQuality';

interface CrackerOverlayProps {
  enabled: boolean;
  activeSection: SectionId;
  unlockBarrageSignal: number;
  celebrateBurstSignal: number;
}

const GOLD_PALETTE = ['#fff3c4', '#f4d06f', '#d4af37', '#ffb703', '#ff4d6d', '#2ec4b6'];

export function CrackerOverlay({
  enabled,
  activeSection,
  unlockBarrageSignal,
  celebrateBurstSignal,
}: CrackerOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const launcherRef = useRef<confetti.CreateTypes | null>(null);
  const quality = useAdaptiveQuality();
  const lastUnlockRef = useRef(0);
  const lastCelebrateRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const instance = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: false,
    });
    launcherRef.current = instance;
    return () => {
      instance.reset();
      launcherRef.current = null;
    };
  }, []);

  const fireSalvo = (scale = 1, withSound = true) => {
    const fire = launcherRef.current;
    if (!fire || quality.prefersReducedMotion) return;

    const count = Math.round(45 * scale * (quality.isMobile ? 0.65 : 1));
    const sideX = Math.random() < 0.5 ? 0.14 + Math.random() * 0.14 : 0.72 + Math.random() * 0.14;
    const originY = 0.25 + Math.random() * 0.35;

    void fire({
      particleCount: count,
      spread: 80,
      startVelocity: 38 * Math.min(1.25, scale),
      ticks: 160,
      gravity: 0.9,
      scalar: 1.05,
      origin: { x: sideX, y: originY },
      colors: GOLD_PALETTE,
    });

    if (withSound) {
      audioService.playCrackerPop();
    }
  };

  // 1. Immediate 5-second Grand Cracker Barrage right when Bharath clicks "Unlock"
  useEffect(() => {
    if (!enabled || unlockBarrageSignal === 0 || unlockBarrageSignal === lastUnlockRef.current) {
      return;
    }
    lastUnlockRef.current = unlockBarrageSignal;
    if (quality.prefersReducedMotion) return;

    const fire = launcherRef.current;
    if (!fire) return;

    const endAt = Date.now() + 5000;
    const mult = quality.isMobile ? 0.65 : 1;

    // Immediate opening double-cannon blast
    void fire({
      particleCount: Math.round(90 * mult),
      angle: 60,
      spread: 75,
      origin: { x: 0.08, y: 0.72 },
      colors: GOLD_PALETTE,
    });
    void fire({
      particleCount: Math.round(90 * mult),
      angle: 120,
      spread: 75,
      origin: { x: 0.92, y: 0.72 },
      colors: GOLD_PALETTE,
    });
    audioService.playFireworkBoom(1.1);

    const interval = window.setInterval(() => {
      if (Date.now() > endAt) {
        window.clearInterval(interval);
        return;
      }
      void fire({
        particleCount: Math.round(36 * mult),
        spread: 95,
        startVelocity: 42,
        origin: { x: 0.15 + Math.random() * 0.7, y: 0.18 + Math.random() * 0.42 },
        colors: GOLD_PALETTE,
      });
      if (Math.random() < 0.6) {
        audioService.playCrackerPop();
      }
    }, 450);

    return () => window.clearInterval(interval);
  }, [unlockBarrageSignal, enabled, quality.isMobile, quality.prefersReducedMotion]);

  // 2. Full-intensity manual / Blow Candles / Celebrate Again burst
  useEffect(() => {
    if (celebrateBurstSignal === 0 || celebrateBurstSignal === lastCelebrateRef.current) {
      return;
    }
    lastCelebrateRef.current = celebrateBurstSignal;
    const fire = launcherRef.current;
    if (!fire || quality.prefersReducedMotion) return;

    const mult = quality.isMobile ? 0.7 : 1;
    void fire({
      particleCount: Math.round(95 * mult),
      angle: 62,
      spread: 70,
      origin: { x: 0.1, y: 0.7 },
      colors: GOLD_PALETTE,
    });
    void fire({
      particleCount: Math.round(95 * mult),
      angle: 118,
      spread: 70,
      origin: { x: 0.9, y: 0.7 },
      colors: GOLD_PALETTE,
    });
    audioService.playFireworkBoom(1.15);
    window.setTimeout(() => fireSalvo(1.3, true), 260);
    window.setTimeout(() => fireSalvo(1.1, true), 580);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrateBurstSignal]);

  // 3. Continuous periodic cracker pops on Home & full-intensity on Finale
  useEffect(() => {
    if (!enabled || quality.prefersReducedMotion) return;
    if (activeSection !== 'home' && activeSection !== 'finale') return;

    const intervalMs = activeSection === 'finale' ? 1250 : 2600;
    const timer = window.setInterval(() => {
      fireSalvo(activeSection === 'finale' ? 1.25 : 0.85, true);
    }, intervalMs);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, activeSection, quality.prefersReducedMotion, quality.isMobile]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-30"
    />
  );
}
