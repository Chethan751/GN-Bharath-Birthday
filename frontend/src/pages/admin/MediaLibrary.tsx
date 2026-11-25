import { useMemo, useState } from 'react';
import { Search, Eye, EyeOff, Trash2, Image as ImageIcon, Video } from 'lucide-react';
import { type MediaItem, formatBytes } from '../../types/media';
import { updateMediaItem, deleteMediaItem } from '../../services/mediaService';

interface MediaLibraryProps {
  items: MediaItem[];
  onRefresh: () => Promise<void>;
}

type FilterMode = 'all' | 'photo' | 'video' | 'published' | 'draft';
type SortMode = 'date_desc' | 'date_asc' | 'size_desc' | 'order_asc';

export function MediaLibrary({ items, onRefresh }: MediaLibraryProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('date_desc');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (filter === 'photo' && item.media_type !== 'photo') return false;
      if (filter === 'video' && item.media_type !== 'video') return false;
      if (filter === 'published' && !item.is_published) return false;
      if (filter === 'draft' && item.is_published) return false;

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.caption.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      switch (sort) {
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'size_desc':
          return b.file_size - a.file_size;
        case 'order_asc':
          return a.display_order - b.display_order;
        case 'date_desc':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [items, query, filter, sort]);

  const handleTogglePublish = async (item: MediaItem) => {
    setBusyId(item.id);
    try {
      await updateMediaItem(item.id, { is_published: !item.is_published });
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    setBusyId(item.id);
    try {
      await deleteMediaItem(item);
      setConfirmId(null);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="luxury-panel rounded-2xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#d4af37]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or caption..."
            className="w-full rounded-xl bg-black/55 border border-[#d4af37]/25 pl-10 pr-4 py-2 text-xs text-[#fff3c4] placeholder:text-[#cbbd9c]/40 focus:outline-none focus:border-[#f4d06f]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'photo', 'video', 'published', 'draft'] as FilterMode[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition cursor-pointer ${
                filter === f
                  ? 'bg-[#d4af37]/25 text-[#fff3c4] border border-[#d4af37]/60'
                  : 'border border-white/10 text-[#cbbd9c]/70 hover:text-[#fff3c4]'
              }`}
            >
              {f === 'photo' ? 'Photos' : f === 'video' ? 'Videos' : f === 'draft' ? 'Drafts' : f}
            </button>
          ))}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-lg bg-black/70 border border-[#d4af37]/30 px-3 py-1.5 text-xs text-[#fff3c4] focus:outline-none"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="size_desc">Largest Size</option>
            <option value="order_asc">Display Sequence</option>
          </select>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="luxury-panel rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#cbbd9c]/60">
            No media items match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d4af37]/20 text-[11px] uppercase tracking-wider text-[#d4af37]/80">
                  <th className="py-3.5 px-4">Media</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/60 border border-[#d4af37]/25 shrink-0">
                          {item.media_type === 'photo' ? (
                            <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <video src={item.url} muted className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-[220px]">
                          <p className="font-medium text-[#fff3c4] truncate">{item.title}</p>
                          <p className="text-[#cbbd9c]/60 truncate">{item.caption || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[#cbbd9c]">
                        {item.media_type === 'photo' ? (
                          <ImageIcon className="w-3.5 h-3.5 text-[#f4d06f]" />
                        ) : (
                          <Video className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        {item.media_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#cbbd9c]/80">{formatBytes(item.file_size)}</td>
                    <td className="py-3 px-4 text-[#cbbd9c]/70">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] ${
                          item.is_published
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {item.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleTogglePublish(item)}
                          className="p-1.5 rounded-lg border border-[#d4af37]/25 text-[#f4d06f] hover:bg-[#d4af37]/10 cursor-pointer"
                          title={item.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {item.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        {confirmId === item.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="px-2 py-1 rounded bg-red-600 text-white text-[11px] cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(null)}
                              className="px-2 py-1 rounded border border-white/15 text-[11px] cursor-pointer"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmId(item.id)}
                            className="p-1.5 rounded-lg border border-red-500/25 text-red-300 hover:bg-red-500/15 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
