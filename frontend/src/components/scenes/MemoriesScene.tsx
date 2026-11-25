import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, X, Sparkles, Image as ImageIcon, Video } from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { audioService } from '../../services/audioService';

interface MemoriesSceneProps {
  mediaItems: MediaItem[];
}

export function MemoriesScene({ mediaItems }: MemoriesSceneProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');

  const visibleItems = mediaItems.filter((m) => filter === 'all' || m.media_type === filter);
  const safeActiveIndex = visibleItems.length > 0 ? activeIndex % visibleItems.length : 0;

  const openModal = (item: MediaItem) => {
    setSelectedItem(item);
    if (item.media_type === 'video') {
      audioService.duckForVideoModal(true);
    }
  };

  const closeModal = () => {
    if (selectedItem?.media_type === 'video') {
      audioService.duckForVideoModal(false);
    }
    setSelectedItem(null);
  };

  const prev = () => {
    if (visibleItems.length === 0) return;
    setActiveIndex((i) => (i - 1 + visibleItems.length) % visibleItems.length);
  };

  const next = () => {
    if (visibleItems.length === 0) return;
    setActiveIndex((i) => (i + 1) % visibleItems.length);
  };

  return (
    <section id="memories" className="relative py-24 sm:py-32 px-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.1),transparent_65%)]" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.28em] text-[#d4af37] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Golden Moments
          </p>
          <h2 className="font-serif-luxury text-4xl sm:text-5xl font-bold text-gold-gradient mt-2">
            Memories Gallery
          </h2>
          <p className="text-sm text-[#cbbd9c]/75 mt-2 max-w-xl mx-auto">
            A floating constellation of unforgettable snapshots and stories with GN Bharath.
          </p>

          {/* Filter Pills */}
          <div className="mt-5 inline-flex items-center gap-1.5 p-1 rounded-full bg-black/55 border border-[#d4af37]/25">
            {(['all', 'photo', 'video'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs capitalize transition cursor-pointer ${
                  filter === f
                    ? 'bg-[#d4af37]/25 text-[#fff3c4] border border-[#f4d06f]/50'
                    : 'text-[#cbbd9c]/70 hover:text-[#fff3c4]'
                }`}
              >
                {f === 'all' ? `All (${mediaItems.length})` : f === 'photo' ? 'Photos' : 'Videos'}
              </button>
            ))}
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="luxury-panel rounded-3xl p-12 text-center max-w-xl mx-auto">
            <ImageIcon className="w-10 h-10 text-[#d4af37]/60 mx-auto mb-3" />
            <h3 className="font-serif-luxury text-2xl text-[#fff3c4]">
              Curating Golden Memories
            </h3>
            <p className="text-xs text-[#cbbd9c]/70 mt-2">
              Published birthday photos and videos will appear here live in 3D frames as soon as they are published.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* 3D Depth Parallax Arc Carousel */}
            <div className="relative h-[360px] sm:h-[430px] flex items-center justify-center [perspective:1300px]">
              {visibleItems.map((item, idx) => {
                const rawOffset = idx - safeActiveIndex;
                const total = visibleItems.length;
                let offset = rawOffset;
                if (total > 2) {
                  if (rawOffset > total / 2) offset -= total;
                  if (rawOffset < -total / 2) offset += total;
                }

                const abs = Math.abs(offset);
                if (abs > 2 && total > 4) return null;

                const isCenter = offset === 0;
                const translateX = offset * (typeof window !== 'undefined' && window.innerWidth < 640 ? 155 : 250);
                const translateZ = -abs * 145;
                const rotateY = offset * -18;
                const scale = isCenter ? 1 : Math.max(0.68, 1 - abs * 0.16);
                const opacity = isCenter ? 1 : Math.max(0.32, 1 - abs * 0.32);

                return (
                  <motion.div
                    key={item.id}
                    onClick={() => (isCenter ? openModal(item) : setActiveIndex(idx))}
                    animate={{
                      x: translateX,
                      z: translateZ,
                      rotateY,
                      scale,
                      opacity,
                    }}
                    transition={{ type: 'spring', stiffness: 190, damping: 24 }}
                    style={{ zIndex: 20 - abs }}
                    className={`absolute w-[250px] sm:w-[340px] aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer select-none border-2 ${
                      isCenter
                        ? 'border-[#f4d06f] shadow-[0_24px_70px_rgba(212,175,55,0.35)]'
                        : 'border-[#d4af37]/35 shadow-[0_14px_40px_rgba(0,0,0,0.8)]'
                    } bg-[#0b0a0f]`}
                  >
                    {item.media_type === 'photo' ? (
                      <img
                        src={item.url}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full bg-black">
                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover opacity-85"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-black/65 border border-[#f4d06f] flex items-center justify-center shadow-[0_0_24px_rgba(244,208,111,0.45)]">
                            <Play className="w-5 h-5 text-[#f4d06f] ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Frame Caption Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-serif-luxury text-base sm:text-lg font-semibold text-[#fff3c4] truncate">
                          {item.title}
                        </h3>
                        {item.media_type === 'video' ? (
                          <Video className="w-3.5 h-3.5 text-[#f4d06f] shrink-0" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-[#f4d06f] shrink-0" />
                        )}
                      </div>
                      {item.caption && (
                        <p className="text-[11px] text-[#cbbd9c]/85 truncate mt-0.5">{item.caption}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Carousel Controls */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                type="button"
                onClick={prev}
                className="w-10 h-10 rounded-full border border-[#d4af37]/40 bg-black/60 text-[#f4d06f] hover:bg-[#d4af37]/15 flex items-center justify-center cursor-pointer"
                aria-label="Previous Memory"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono text-[#cbbd9c]/80">
                {safeActiveIndex + 1} / {visibleItems.length}
              </span>
              <button
                type="button"
                onClick={next}
                className="w-10 h-10 rounded-full border border-[#d4af37]/40 bg-black/60 text-[#f4d06f] hover:bg-[#d4af37]/15 flex items-center justify-center cursor-pointer"
                aria-label="Next Memory"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* High-Res Photo Lightbox & Video Player Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl luxury-panel gold-border-glow rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#d4af37]/20">
                <div>
                  <h3 className="font-serif-luxury text-xl font-bold text-gold-gradient">
                    {selectedItem.title}
                  </h3>
                  {selectedItem.media_type === 'video' && (
                    <p className="text-[11px] text-[#d4af37]/75">
                      Background music softly lowered while playing video
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-full border border-[#d4af37]/30 text-[#fff3c4] hover:bg-[#d4af37]/15 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-black flex items-center justify-center max-h-[68vh]">
                {selectedItem.media_type === 'photo' ? (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.title}
                    className="max-h-[68vh] w-auto object-contain"
                  />
                ) : (
                  <video
                    src={selectedItem.url}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[68vh] w-full object-contain"
                  />
                )}
              </div>

              {selectedItem.caption && (
                <div className="p-5 bg-[#0a090e]">
                  <p className="text-sm text-[#f5ecd7]/90 leading-relaxed">{selectedItem.caption}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
