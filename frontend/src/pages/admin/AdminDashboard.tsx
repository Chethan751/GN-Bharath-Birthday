import { useEffect, useState, useCallback } from 'react';
import {
  Crown,
  LayoutDashboard,
  Image as ImageIcon,
  Video,
  FolderKanban,
  LogOut,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { verifyAdminAccess, signOutAdmin, type AuthSessionState } from '../../services/authService';
import { fetchAllAdminMedia } from '../../services/mediaService';
import type { MediaItem } from '../../types/media';
import { AdminLogin } from './AdminLogin';
import { AdminOverview } from './AdminOverview';
import { PhotoManager } from './PhotoManager';
import { VideoManager } from './VideoManager';
import { MediaLibrary } from './MediaLibrary';

type AdminTab = 'overview' | 'photos' | 'videos' | 'library';

export function AdminDashboard() {
  const [auth, setAuth] = useState<AuthSessionState | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const loadMedia = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await fetchAllAdminMedia();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const status = await verifyAdminAccess();
    setAuth(status);
    if (status.isAdmin) {
      await loadMedia();
    }
  }, [loadMedia]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const status = await verifyAdminAccess();
      if (!active) return;
      setAuth(status);
      if (status.isAdmin) {
        const data = await fetchAllAdminMedia();
        if (active) setItems(data);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await signOutAdmin();
    setAuth({ isAuthenticated: false, isAdmin: false, email: null, role: null });
    setItems([]);
  };

  if (auth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060608] text-[#f4d06f]">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    );
  }

  if (!auth.isAdmin) {
    return <AdminLogin onSuccess={checkAuth} />;
  }

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'photos', label: 'Photo Manager', icon: ImageIcon },
    { id: 'videos', label: 'Video Manager', icon: Video },
    { id: 'library', label: 'Media Library', icon: FolderKanban },
  ];

  const photos = items.filter((i) => i.media_type === 'photo');
  const videos = items.filter((i) => i.media_type === 'video');

  return (
    <div className="min-h-screen bg-[#060608] text-[#f5ecd7] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[#d4af37]/20 bg-[#09080c] p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-[#d4af37]/15">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center">
              <Crown className="w-5 h-5 text-[#f4d06f]" />
            </div>
            <div>
              <h1 className="font-serif-luxury text-lg font-bold text-gold-gradient leading-tight">
                GN Bharath
              </h1>
              <p className="text-[11px] uppercase tracking-widest text-[#cbbd9c]/60">
                Admin Panel
              </p>
            </div>
          </div>

          <nav className="mt-5 flex md:flex-col gap-1.5 overflow-x-auto">
            {navItems.map((nav) => {
              const Icon = nav.icon;
              const active = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveTab(nav.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#d4af37]/20 text-[#fff3c4] border border-[#d4af37]/45 shadow-[0_0_20px_rgba(212,175,55,0.12)]'
                      : 'text-[#cbbd9c]/75 hover:text-[#fff3c4] hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#f4d06f]" />
                  {nav.label}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs text-red-300/85 hover:bg-red-500/10 border border-transparent hover:border-red-500/25 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-gold-gradient">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-[#cbbd9c]/65 mt-0.5">
              Signed in as <span className="text-[#f4d06f]">{auth.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={loadMedia}
            disabled={loadingData}
            className="rounded-xl border border-[#d4af37]/30 px-3.5 py-2 text-xs text-[#f4d06f] hover:bg-[#d4af37]/10 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            Sync Library
          </button>
        </header>

        {activeTab === 'overview' && (
          <AdminOverview items={items} onNavigateTab={setActiveTab} />
        )}
        {activeTab === 'photos' && (
          <PhotoManager photos={photos} onRefresh={loadMedia} />
        )}
        {activeTab === 'videos' && (
          <VideoManager videos={videos} onRefresh={loadMedia} />
        )}
        {activeTab === 'library' && (
          <MediaLibrary items={items} onRefresh={loadMedia} />
        )}
      </main>
    </div>
  );
}
