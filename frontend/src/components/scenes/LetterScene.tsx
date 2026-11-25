import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Feather, Sparkles, RotateCcw } from 'lucide-react';

const LETTER_LINES = [
  'Dear Bharath,',
  'Some friendships are written in laughter, late-night talks, and moments we never want to forget.',
  'Through every high and every storm, you have been more than a best friend — you have been family, strength, and pure joy.',
  'On your special day, may every dream you chase turn into gold, and may your smile keep lighting up every room you walk into.',
  'Happy Birthday, brother! Keep shining, always.',
  '— Your Best Friend Forever',
];

export function LetterScene() {
  const [isOpen, setIsOpen] = useState(false);
  const [typedChars, setTypedChars] = useState(0);

  const fullText = LETTER_LINES.join('\n\n');

  useEffect(() => {
    if (!isOpen || typedChars >= fullText.length) return;

    const timer = window.setTimeout(() => {
      setTypedChars((c) => Math.min(fullText.length, c + 2));
    }, 24);
    return () => window.clearTimeout(timer);
  }, [isOpen, typedChars, fullText.length]);

  const handleOpenLetter = () => {
    setTypedChars(0);
    setIsOpen(true);
  };

  const handleSealLetter = () => {
    setIsOpen(false);
    setTypedChars(0);
  };

  const revealedText = fullText.slice(0, typedChars);

  return (
    <section id="letter" className="relative py-24 sm:py-32 px-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.12),transparent_60%)]" />

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-[#d4af37] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Heartfelt Words
        </p>
        <h2 className="font-serif-luxury text-4xl sm:text-5xl font-bold text-gold-gradient mt-2">
          Birthday Letter
        </h2>
        <p className="text-sm text-[#cbbd9c]/75 mt-2 mb-12">
          {isOpen
            ? 'A personal note sealed with gold and brotherhood.'
            : 'Tap the golden wax seal to open your letter.'}
        </p>

        <div className="relative mx-auto max-w-2xl flex items-center justify-center min-h-[380px]">
          <AnimatePresence mode="wait">
            {!isOpen ? (
              /* Closed 2.5D Luxury Black & Gold Envelope */
              <motion.button
                key="closed-envelope"
                type="button"
                onClick={handleOpenLetter}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05, y: -15 }}
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ duration: 0.45 }}
                className="relative w-full max-w-md h-64 rounded-2xl bg-gradient-to-br from-[#1b1712] via-[#0e0c10] to-[#08070a] border-2 border-[#d4af37]/55 shadow-[0_28px_70px_rgba(0,0,0,0.85),0_0_45px_rgba(212,175,55,0.2)] cursor-pointer overflow-hidden group"
              >
                {/* Envelope diagonal gold fold lines */}
                <svg
                  viewBox="0 0 400 240"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points="0,0 200,132 400,0"
                    fill="rgba(212,175,55,0.08)"
                    stroke="rgba(212,175,55,0.55)"
                    strokeWidth="2"
                  />
                  <line x1="0" y1="240" x2="155" y2="108" stroke="rgba(212,175,55,0.25)" strokeWidth="1.5" />
                  <line x1="400" y1="240" x2="245" y2="108" stroke="rgba(212,175,55,0.25)" strokeWidth="1.5" />
                </svg>

                {/* Wax Seal "B" */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full pt-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#9e1c24] via-[#701116] to-[#3b0709] border-2 border-[#f4d06f] shadow-[0_0_30px_rgba(212,175,55,0.55)] flex items-center justify-center group-hover:scale-110 transition">
                    <span className="font-serif-luxury text-2xl font-bold text-[#fff3c4]">B</span>
                  </div>
                  <span className="mt-4 text-xs uppercase tracking-[0.25em] text-[#f4d06f]/90">
                    Click Wax Seal to Open
                  </span>
                </div>
              </motion.button>
            ) : (
              /* Opened Envelope + Sliding Textured Parchment Letter */
              <motion.div
                key="open-letter"
                initial={{ opacity: 0, y: 36, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full"
              >
                {/* Warm Parchment Sheet */}
                <div
                  className="relative rounded-2xl p-7 sm:p-11 text-left border-2 border-[#d4af37]/70 shadow-[0_30px_80px_rgba(0,0,0,0.85),0_0_55px_rgba(212,175,55,0.22)]"
                  style={{
                    background:
                      'radial-gradient(circle at 20% 15%, #fff8e6 0%, #f3dfb8 58%, #dfc18a 100%)',
                  }}
                >
                  {/* Golden Quill Accent */}
                  <div className="absolute -top-5 -right-3 sm:right-5 w-12 h-12 rounded-2xl bg-[#0b0a0f] border border-[#f4d06f] shadow-[0_0_24px_rgba(212,175,55,0.5)] flex items-center justify-center rotate-12">
                    <Feather className="w-6 h-6 text-[#f4d06f]" />
                  </div>

                  {/* Wax Seal Badge */}
                  <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full bg-[#3a260a]/10 border border-[#8b6318]/30 text-[#5c3d09] text-[11px] uppercase tracking-widest font-semibold">
                    <span className="w-5 h-5 rounded-full bg-[#7c151b] text-[#fff3c4] flex items-center justify-center font-serif-luxury text-xs">
                      B
                    </span>
                    For GN Bharath
                  </div>

                  <div className="font-serif-luxury text-[#2b1b08] text-lg sm:text-xl leading-relaxed whitespace-pre-line min-h-[220px]">
                    {revealedText}
                    {typedChars < fullText.length && (
                      <span className="inline-block w-0.5 h-5 bg-[#8b5e10] ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>

                  <div className="mt-7 pt-4 border-t border-[#8b6318]/25 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-medium text-[#6e4a12]">
                      Sealed with gratitude & brotherhood
                    </span>
                    <div className="flex gap-2">
                      {typedChars < fullText.length && (
                        <button
                          type="button"
                          onClick={() => setTypedChars(fullText.length)}
                          className="text-xs font-semibold text-[#6e4a12] underline cursor-pointer"
                        >
                          Show Full Letter
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSealLetter}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#241606] text-[#f4d06f] px-4 py-1.5 text-xs font-medium hover:bg-[#38230a] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Seal Envelope
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
