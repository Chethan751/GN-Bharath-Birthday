import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PasswordGate } from '../components/ui/PasswordGate';
import { TopNavbar, type SectionId } from '../components/ui/TopNavbar';
import { CrackerOverlay } from '../components/ui/CrackerOverlay';
import type { MediaItem } from '../types/media';
import {
  fetchPublishedMedia,
  subscribeToPublishedMedia,
  fetchCustomBackgroundAudioUrl,
} from '../services/mediaService';
import { audioService } from '../services/audioService';

const WelcomeCakeScene = lazy(() =>
  import('../components/scenes/WelcomeCakeScene').then((m) => ({ default: m.WelcomeCakeScene }))
);
const MemoriesScene = lazy(() =>
  import('../components/scenes/MemoriesScene').then((m) => ({ default: m.MemoriesScene }))
);
const LetterScene = lazy(() =>
  import('../components/scenes/LetterScene').then((m) => ({ default: m.LetterScene }))
);
const GiftScene = lazy(() =>
  import('../components/scenes/GiftScene').then((m) => ({ default: m.GiftScene }))
);
const FinaleScene = lazy(() =>
  import('../components/scenes/FinaleScene').then((m) => ({ default: m.FinaleScene }))
);

function SceneLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-[#d4af37]">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

export function ExperiencePage() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [fireworksEnabled, setFireworksEnabled] = useState(true);
  const [unlockBarrageSignal, setUnlockBarrageSignal] = useState(0);
  const [celebrateBurstSignal, setCelebrateBurstSignal] = useState(0);

  const loadMedia = useCallback(async () => {
    const [items, customAudioUrl] = await Promise.all([
      fetchPublishedMedia(),
      fetchCustomBackgroundAudioUrl(),
    ]);
    setMediaItems(items);
    if (customAudioUrl) {
      audioService.setCustomSource(customAudioUrl);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      const [items, customAudioUrl] = await Promise.all([
        fetchPublishedMedia(),
        fetchCustomBackgroundAudioUrl(),
      ]);
      if (!active) return;
      setMediaItems(items);
      if (customAudioUrl) {
        audioService.setCustomSource(customAudioUrl);
      }
    };
    void sync();
    const unsubscribe = subscribeToPublishedMedia(() => {
      void loadMedia();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadMedia]);

  // Track active scroll section for floating top navbar
  useEffect(() => {
    if (!unlocked) return;
    const ids: SectionId[] = ['home', 'memories', 'letter', 'gift', 'finale'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        });
      },
      { threshold: 0.35 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [unlocked]);

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleUnlock = () => {
    setUnlocked(true);
    setUnlockBarrageSignal((n) => n + 1);
  };

  const handleTriggerBurst = () => {
    setCelebrateBurstSignal((n) => n + 1);
  };

  if (!unlocked) {
    return <PasswordGate onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen bg-[#060608] text-[#f5ecd7] relative">
      {/* Continuous pointer-events-none cracker & firework canvas overlay */}
      <CrackerOverlay
        enabled={fireworksEnabled}
        activeSection={activeSection}
        unlockBarrageSignal={unlockBarrageSignal}
        celebrateBurstSignal={celebrateBurstSignal}
      />

      <TopNavbar
        activeSection={activeSection}
        onSelectSection={scrollToSection}
        fireworksEnabled={fireworksEnabled}
        onToggleFireworks={() => setFireworksEnabled((v) => !v)}
        onLaunchCrackers={handleTriggerBurst}
      />

      <main>
        <Suspense fallback={<SceneLoader />}>
          <WelcomeCakeScene
            mediaItems={mediaItems}
            onScrollToMemories={() => scrollToSection('memories')}
            fireworksEnabled={fireworksEnabled}
            globalBurstSignal={celebrateBurstSignal}
            onTriggerCelebrationBurst={handleTriggerBurst}
          />
          <MemoriesScene mediaItems={mediaItems} />
          <LetterScene />
          <GiftScene />
          <FinaleScene
            fireworksEnabled={fireworksEnabled}
            globalBurstSignal={celebrateBurstSignal}
            onTriggerCelebrationBurst={handleTriggerBurst}
          />
        </Suspense>
      </main>
    </div>
  );
}
