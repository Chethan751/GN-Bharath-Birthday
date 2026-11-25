import { useEffect, useState } from 'react';

export interface AdaptiveQuality {
  isMobile: boolean;
  isLowTier: boolean;
  prefersReducedMotion: boolean;
  particleMultiplier: number;
  dpr: [number, number];
  reflectorResolution: number;
  reflectorBlur: [number, number];
  composerMultisampling: number;
}

function computeQuality(): AdaptiveQuality {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const isLowTier = isMobile || cores <= 4 || prefersReducedMotion;

  return {
    isMobile,
    isLowTier,
    prefersReducedMotion,
    particleMultiplier: prefersReducedMotion ? 0.25 : isLowTier ? 0.55 : 1,
    dpr: isLowTier ? [1, 1.35] : [1, 1.85],
    reflectorResolution: isLowTier ? 256 : 512,
    reflectorBlur: isLowTier ? [0, 0] : [260, 90],
    composerMultisampling: isLowTier ? 0 : 4,
  };
}

export function useAdaptiveQuality(): AdaptiveQuality {
  const [quality, setQuality] = useState<AdaptiveQuality>(computeQuality);

  useEffect(() => {
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setQuality(computeQuality());

    window.addEventListener('resize', update);
    mqMotion.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mqMotion.removeEventListener('change', update);
    };
  }, []);

  return quality;
}
