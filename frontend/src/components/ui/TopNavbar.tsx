import { useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Crown, Sparkles, PartyPopper } from 'lucide-react';
import { audioService } from '../../services/audioService';

export type SectionId = 'home' | 'memories' | 'letter' | 'gift' | 'finale';

interface TopNavbarProps {
  activeSection: SectionId;
  onSelectSection: (id: SectionId) => void;
  fireworksEnabled: boolean;
  onToggleFireworks: () => void;
  onLaunchCrackers: () => void;
}

const NAV_LINKS: { id: SectionId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'memories', label: 'Memories' },
  { id: 'letter', label: 'Letter' },
  { id: 'gift', label: 'Gift' },
  { id: 'finale', label: 'Finale' },
];

export function TopNavbar({
  activeSection,
  onSelectSection,
  fireworksEnabled,
  onToggleFireworks,
  onLaunchCrackers,
}: TopNavbarProps) {
  const [audio, setAudio] = useState(audioService.getState());
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    return audioService.subscribe(() => setAudio(audioService.getState()));
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-40 px-3 sm:px-6 pt-3 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand Monogram */}
        <button
          type="button"
          onClick={() => onSelectSection('home')}
          className="pointer-events-auto hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/45 backdrop-blur-md border border-[#d4af37]/20 text-[#fff3c4] cursor-pointer hover:border-[#f4d06f]/50 transition"
        >
          <Crown className="w-4 h-4 text-[#f4d06f]" />
          <span className="font-serif-luxury text-sm font-semibold tracking-wide text-gold-gradient">
            GN Bharath
          </span>
        </button>

        {/* Center Floating Navigation */}
        <nav className="pointer-events-auto mx-auto flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-[#d4af37]/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          {NAV_LINKS.map((link) => {
            const active = activeSection === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onSelectSection(link.id)}
                className={`px-2 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-sm font-medium transition cursor-pointer ${
                  active
                    ? 'bg-[#d4af37]/25 text-[#fff3c4] border border-[#f4d06f]/50 shadow-[0_0_16px_rgba(212,175,55,0.25)]'
                    : 'text-[#cbbd9c]/80 hover:text-[#fff3c4]'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Top-Right Fireworks + Audio Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* One-Click Launch Crackers Burst */}
          <button
            type="button"
            onClick={onLaunchCrackers}
            title="Launch Crackers Burst"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-[#f4d06f]/25 to-[#d4af37]/15 backdrop-blur-lg border border-[#f4d06f]/50 text-[#fff3c4] hover:border-[#fff3c4] hover:shadow-[0_0_18px_rgba(244,208,111,0.35)] text-xs font-medium cursor-pointer transition"
          >
            <PartyPopper className="w-3.5 h-3.5 text-[#f4d06f]" />
            <span className="hidden md:inline">Launch Crackers</span>
          </button>

          {/* Fireworks On/Off Toggle */}
          <button
            type="button"
            onClick={onToggleFireworks}
            title={fireworksEnabled ? 'Turn Fireworks Off' : 'Turn Fireworks On'}
            aria-pressed={fireworksEnabled}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full backdrop-blur-lg border text-xs font-medium cursor-pointer transition ${
              fireworksEnabled
                ? 'bg-black/60 border-[#d4af37]/40 text-[#f4d06f]'
                : 'bg-black/60 border-white/15 text-[#cbbd9c]/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{fireworksEnabled ? 'Fireworks On' : 'Fireworks Off'}</span>
          </button>

          {/* Audio Visualizer + Play/Pause + Volume */}
          <div
            className="relative flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/60 backdrop-blur-lg border border-[#d4af37]/30"
            onMouseEnter={() => setShowSlider(true)}
            onMouseLeave={() => setShowSlider(false)}
          >
            <div className="hidden sm:flex items-end gap-0.5 h-3.5 px-1" aria-hidden="true">
              {[0.6, 1, 0.75, 0.9].map((height, idx) => (
                <span
                  key={idx}
                  className={`w-0.5 rounded-full bg-[#f4d06f] transition-all duration-300 ${
                    audio.isPlaying && !audio.isMuted ? 'animate-pulse' : 'opacity-40'
                  }`}
                  style={{
                    height:
                      audio.isPlaying && !audio.isMuted
                        ? `${Math.round(height * 14)}px`
                        : '4px',
                    animationDelay: `${idx * 140}ms`,
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => audioService.togglePlayPause()}
              className="p-1 rounded-full text-[#f4d06f] hover:bg-[#d4af37]/15 cursor-pointer"
              aria-label={audio.isPlaying ? 'Pause Music' : 'Play Music'}
            >
              {audio.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => audioService.toggleMute()}
              className="p-1 rounded-full text-[#f4d06f] hover:bg-[#d4af37]/15 cursor-pointer"
              aria-label={audio.isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {audio.isMuted || audio.volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            {showSlider && (
              <div className="hidden sm:flex items-center pl-1 pr-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={audio.isMuted ? 0 : audio.volume}
                  onChange={(e) => audioService.setVolume(parseFloat(e.target.value))}
                  className="w-16 accent-[#d4af37] cursor-pointer"
                  aria-label="Volume"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
