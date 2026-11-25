import { useState, useRef, type ChangeEvent } from 'react';
import { Image as ImageIcon, Video, CheckCircle2, FileEdit, ArrowRight, Music, Upload, AlertCircle } from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { formatBytes } from '../../types/media';
import { uploadCustomBackgroundAudio } from '../../services/mediaService';

interface AdminOverviewProps {
  items: MediaItem[];
  onNavigateTab: (tab: 'overview' | 'photos' | 'videos' | 'library') => void;
}

export function AdminOverview({ items, onNavigateTab }: AdminOverviewProps) {
  const photos = items.filter((i) => i.media_type === 'photo');
  const videos = items.filter((i) => i.media_type === 'video');
  const published = items.filter((i) => i.is_published);
  const drafts = items.filter((i) => !i.is_published);
  const recent = [...items]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const [audioStatus, setAudioStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const handleAudioChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioStatus(null);
    setUploadingAudio(true);
    try {
      await uploadCustomBackgroundAudio(file);
      setAudioStatus({
        type: 'ok',
        msg: `Uploaded "${file.name}" (${formatBytes(file.size)}) as active birthday background music.`,
      });
    } catch (err) {
      setAudioStatus({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Failed to upload audio track.',
      });
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const stats = [
    { label: 'Total Photos', value: photos.length, icon: ImageIcon, accent: 'text-[#f4d06f]' },
    { label: 'Total Videos', value: videos.length, icon: Video, accent: 'text-amber-300' },
    { label: 'Published', value: published.length, icon: CheckCircle2, accent: 'text-emerald-400' },
    { label: 'Drafts', value: drafts.length, icon: FileEdit, accent: 'text-orange-300' },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="luxury-panel rounded-2xl p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-xs uppercase tracking-wider text-[#cbbd9c]/70">{stat.label}</p>
                <p className="font-serif-luxury text-3xl sm:text-4xl font-bold text-[#fff4d4] mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${stat.accent}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Uploads Strip */}
      <div className="luxury-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-serif-luxury text-2xl font-semibold text-gold-gradient">
              Recent Uploads
            </h2>
            <p className="text-xs text-[#cbbd9c]/65 mt-0.5">
              Published items sync live to the 3D cake projection and Memories gallery.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('library')}
            className="text-xs font-medium text-[#f4d06f] hover:text-[#fff3c4] flex items-center gap-1 cursor-pointer"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d4af37]/25 py-12 text-center text-sm text-[#cbbd9c]/60">
            No media uploaded yet. Start by adding photos or videos in the managers.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {recent.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden border border-[#d4af37]/25 bg-black/50 aspect-square"
              >
                {item.media_type === 'photo' ? (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5">
                  <p className="text-xs font-medium text-[#fff3c4] truncate">{item.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#d4af37]">
                      {item.media_type}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        item.is_published
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {item.is_published ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Background Soundtrack Manager */}
      <div className="luxury-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-[#f4d06f]" />
          </div>
          <div>
            <h3 className="font-serif-luxury text-xl font-semibold text-[#fff3c4]">
              Celebration Background Audio
            </h3>
            <p className="text-xs text-[#cbbd9c]/70 mt-0.5">
              Optional: Override the built-in Happy Birthday soundtrack with a custom MP3 or OGG file (Max 15 MB).
            </p>
            {audioStatus && (
              <div
                className={`mt-2.5 text-xs flex items-center gap-1.5 ${
                  audioStatus.type === 'ok' ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{audioStatus.msg}</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,audio/ogg,.mp3,.ogg"
            onChange={handleAudioChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploadingAudio}
            onClick={() => audioInputRef.current?.click()}
            className="gold-pill-btn rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            {uploadingAudio ? 'Uploading...' : 'Upload MP3 / OGG'}
          </button>
        </div>
      </div>
    </div>
  );
}
