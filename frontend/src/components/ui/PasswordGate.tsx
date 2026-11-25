import { useRef, useState, useMemo, type ClipboardEvent, type KeyboardEvent, type FormEvent } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Float } from '@react-three/drei';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { audioService } from '../../services/audioService';

interface PasswordGateProps {
  onUnlock: () => void;
}

const EXPECTED_DOB = (import.meta.env.VITE_BIRTHDAY_DOB as string | undefined)?.trim() || '26112006';

function Padlock3DScene() {
  const ringOuterRef = useRef<THREE.Mesh>(null);
  const ringInnerRef = useRef<THREE.Mesh>(null);
  const lockGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringOuterRef.current) {
      ringOuterRef.current.rotation.z = t * 0.25;
      ringOuterRef.current.rotation.x = Math.PI * 0.42 + Math.sin(t * 0.5) * 0.06;
    }
    if (ringInnerRef.current) {
      ringInnerRef.current.rotation.z = -t * 0.42;
      ringInnerRef.current.rotation.x = Math.PI * 0.44;
    }
    if (lockGroupRef.current) {
      lockGroupRef.current.rotation.y = Math.sin(t * 0.65) * 0.22;
    }
  });

  const goldMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f4d06f',
        metalness: 0.9,
        roughness: 0.2,
        emissive: '#6e4d08',
        emissiveIntensity: 0.45,
      }),
    []
  );

  const pillarMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1b1610',
        metalness: 0.5,
        roughness: 0.55,
      }),
    []
  );

  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 3.2, 3]} intensity={28} color="#ffd97d" distance={14} />
      <pointLight position={[-4, 1, 2]} intensity={14} color="#d4af37" distance={12} />
      <pointLight position={[4, 1, 2]} intensity={14} color="#d4af37" distance={12} />

      <Sparkles count={120} scale={[12, 8, 6]} size={2.2} speed={0.35} color="#f8e18e" />

      {/* Atmospheric Palace Pillars flanking left & right */}
      {[-4.2, 4.2].map((xPos) => (
        <group key={xPos} position={[xPos, -0.4, -2.5]}>
          <mesh material={pillarMaterial}>
            <cylinderGeometry args={[0.38, 0.44, 6.2, 18]} />
          </mesh>
          <mesh position={[0, -3.1, 0]} material={goldMaterial}>
            <cylinderGeometry args={[0.56, 0.62, 0.25, 18]} />
          </mesh>
          <mesh position={[0, 3.1, 0]} material={goldMaterial}>
            <cylinderGeometry args={[0.58, 0.44, 0.28, 18]} />
          </mesh>
        </group>
      ))}

      {/* Floating 3D Golden Padlock */}
      <Float speed={2} rotationIntensity={0.18} floatIntensity={0.45}>
        <group ref={lockGroupRef} position={[0, 0.75, 0]}>
          {/* Padlock Shackle */}
          <mesh position={[0, 0.58, 0]} material={goldMaterial}>
            <torusGeometry args={[0.36, 0.085, 20, 48, Math.PI]} />
          </mesh>
          <mesh position={[-0.36, 0.42, 0]} material={goldMaterial}>
            <cylinderGeometry args={[0.085, 0.085, 0.34, 16]} />
          </mesh>
          <mesh position={[0.36, 0.42, 0]} material={goldMaterial}>
            <cylinderGeometry args={[0.085, 0.085, 0.34, 16]} />
          </mesh>

          {/* Padlock Body */}
          <mesh position={[0, -0.05, 0]} material={goldMaterial}>
            <boxGeometry args={[1.05, 0.92, 0.36]} />
          </mesh>

          {/* Keyhole */}
          <mesh position={[0, 0.02, 0.19]}>
            <circleGeometry args={[0.09, 20]} />
            <meshBasicMaterial color="#150e03" />
          </mesh>
          <mesh position={[0, -0.14, 0.19]}>
            <planeGeometry args={[0.08, 0.22]} />
            <meshBasicMaterial color="#150e03" />
          </mesh>
        </group>
      </Float>

      {/* Concentric Golden Particle Rings */}
      <mesh ref={ringOuterRef} position={[0, -0.35, -0.2]}>
        <torusGeometry args={[2.1, 0.022, 16, 96]} />
        <meshBasicMaterial color="#f4d06f" transparent opacity={0.6} />
      </mesh>
      <mesh ref={ringInnerRef} position={[0, -0.35, -0.2]}>
        <torusGeometry args={[1.45, 0.018, 16, 80]} />
        <meshBasicMaterial color="#fff3c4" transparent opacity={0.5} />
      </mesh>
    </>
  );
}

export function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [digits, setDigits] = useState<string[]>(Array(8).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleDigitChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    // Handle multi-digit paste or fast typing
    if (cleaned.length > 1) {
      const next = [...digits];
      for (let i = 0; i < cleaned.length && index + i < 8; i++) {
        next[index + i] = cleaned[i];
      }
      setDigits(next);
      setError(null);
      const focusIdx = Math.min(7, index + cleaned.length);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });
    setError(null);
    if (index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (!pasted) return;
    const next = Array(8).fill('');
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    setError(null);
    inputRefs.current[Math.min(7, pasted.length)]?.focus();
  };

  const triggerCelebrationBurst = () => {
    const colors = ['#fff3c4', '#f4d06f', '#d4af37', '#b8860b'];
    confetti({
      particleCount: 90,
      spread: 85,
      origin: { y: 0.6 },
      colors,
    });
    window.setTimeout(() => {
      confetti({ particleCount: 55, angle: 60, spread: 60, origin: { x: 0.1, y: 0.65 }, colors });
      confetti({ particleCount: 55, angle: 120, spread: 60, origin: { x: 0.9, y: 0.65 }, colors });
    }, 220);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const entered = digits.join('');

    if (entered === EXPECTED_DOB) {
      // CRITICAL BROWSER AUTOPLAY FIX: initialize & play Howler immediately on click event
      audioService.unlockAndPlay();
      triggerCelebrationBurst();
      setUnlocking(true);
      window.setTimeout(() => {
        onUnlock();
      }, 850);
    } else {
      setError('Incorrect Date of Birth');
      setShaking(true);
      window.setTimeout(() => setShaking(false), 550);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={
        unlocking
          ? { opacity: 0, scale: 1.18, filter: 'blur(10px)' }
          : { opacity: 1, scale: 1, filter: 'blur(0px)' }
      }
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 bg-[#050507] flex flex-col items-center justify-center overflow-hidden px-4"
    >
      {/* 3D Padlock & Golden Particle Rings Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0.3, 5.2], fov: 45 }} dpr={[1, 1.5]}>
          <Padlock3DScene />
        </Canvas>
      </div>

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_18%,rgba(5,5,7,0.86)_75%)]" />

      {/* Gate Controls */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 mt-44 sm:mt-48 w-full max-w-md flex flex-col items-center text-center"
      >
        <p className="text-xs uppercase tracking-[0.28em] text-[#d4af37]/90 mb-1.5 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Private Celebration Gate
        </p>
        <h1 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#fff3c4]">
          Enter Your Date of Birth
        </h1>
        <p className="text-xs tracking-[0.22em] text-[#cbbd9c]/75 mt-1 mb-6">(DDMMYYYY)</p>

        {/* 8 Individual Numeric Boxes — ZERO password hints */}
        <div
          className={`flex items-center justify-center gap-1.5 sm:gap-2.5 ${
            shaking ? 'animate-shake-error' : ''
          }`}
        >
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              aria-label={`Date of birth digit ${idx + 1}`}
              className={`w-9 h-12 sm:w-11 sm:h-14 rounded-xl bg-black/75 text-center font-serif-luxury text-xl sm:text-2xl font-bold text-[#fff3c4] border transition focus:outline-none ${
                error
                  ? 'border-red-400/80 shadow-[0_0_16px_rgba(248,113,113,0.35)]'
                  : 'border-[#d4af37]/45 focus:border-[#fff3c4] focus:shadow-[0_0_20px_rgba(244,208,111,0.4)]'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-3.5 text-xs font-medium text-red-300 tracking-wide">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={unlocking}
          className="mt-7 gold-pill-btn rounded-full px-12 py-3.5 font-serif-luxury text-lg font-bold tracking-wide cursor-pointer disabled:opacity-60"
        >
          {unlocking ? 'Entering...' : 'Unlock'}
        </button>
      </form>
    </motion.div>
  );
}
