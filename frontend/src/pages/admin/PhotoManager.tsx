import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import {
  UploadCloud,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  AlertCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import {
  type MediaItem,
  validateMediaFile,
  formatBytes,
} from '../../types/media';
import {
  uploadMediaItem,
  updateMediaItem,
  deleteMediaItem,
  reorderMediaItems,
} from '../../services/mediaService';

interface PhotoManagerProps {
  photos: MediaItem[];
  onRefresh: () => Promise<void>;
}

interface PendingPhoto {
  localId: string;
  file: File;
  previewUrl: string;
  title: string;
  caption: string;
}

export function PhotoManager({ photos, onRefresh }: PhotoManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const queueFiles = (files: FileList | File[]) => {
    setError(null);
    const errors: string[] = [];
    const accepted: PendingPhoto[] = [];

    Array.from(files).forEach((file) => {
      const check = validateMediaFile(file, 'photo');
      if (!check.valid) {
        errors.push(check.error ?? `Rejected "${file.name}".`);
        return;
      }
      accepted.push({
        localId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        title: file.name.replace(/\.[^.]+$/, ''),
        caption: '',
      });
    });

    if (errors.length > 0) {
      setError(errors.join(' '));
    }
    if (accepted.length > 0) {
      setPending((prev) => [...prev, ...accepted]);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      queueFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      queueFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removePending = (localId: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const uploadAllPending = async (publishImmediately: boolean) => {
    if (pending.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      let order = photos.length;
      for (const item of pending) {
        await uploadMediaItem({
          file: item.file,
          title: item.title,
          caption: item.caption,
          isPublished: publishImmediately,
          displayOrder: order++,
          expectedType: 'photo',
        });
        URL.revokeObjectURL(item.previewUrl);
      }
      setPending([]);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (item: MediaItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditCaption(item.caption);
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    try {
      await updateMediaItem(id, { title: editTitle, caption: editCaption });
      setEditingId(null);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update photo.');
    } finally {
      setBusyId(null);
    }
  };

  const togglePublish = async (item: MediaItem) => {
    setBusyId(item.id);
    try {
      await updateMediaItem(item.id, { is_published: !item.is_published });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle publish state.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= photos.length) return;
    const reordered = [...photos];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    setBusyId(moved.id);
    try {
      await reorderMediaItems(reordered.map((p) => p.id));
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async (item: MediaItem) => {
    setBusyId(item.id);
    try {
      await deleteMediaItem(item);
      setConfirmDeleteId(null);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`luxury-panel rounded-2xl p-8 border-2 border-dashed transition cursor-pointer text-center ${
          dragActive
            ? 'border-[#f4d06f] bg-[#d4af37]/10'
            : 'border-[#d4af37]/30 hover:border-[#d4af37]/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center mb-3">
          <UploadCloud className="w-7 h-7 text-[#f4d06f]" />
        </div>
        <h3 className="font-serif-luxury text-xl font-semibold text-[#fff3c4]">
          Drag & drop photos here, or click to browse
        </h3>
        <p className="text-xs text-[#cbbd9c]/70 mt-1">
          Supports JPG, JPEG, PNG, WebP • Max 10 MB per photo
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Pending Queue with Instant Thumbnail Preview & Title/Caption */}
      {pending.length > 0 && (
        <div className="luxury-panel rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-serif-luxury text-xl text-gold-gradient font-semibold">
              Ready to Upload ({pending.length})
            </h4>
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={uploading}
                onClick={() => uploadAllPending(false)}
                className="rounded-xl border border-[#d4af37]/40 px-4 py-2 text-xs font-medium text-[#f4d06f] hover:bg-[#d4af37]/10 cursor-pointer disabled:opacity-50"
              >
                Save as Drafts
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => uploadAllPending(true)}
                className="gold-pill-btn rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Publish All Live'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map((p) => (
              <div
                key={p.localId}
                className="rounded-xl border border-[#d4af37]/25 bg-black/45 p-3 flex gap-3.5 items-start"
              >
                <img
                  src={p.previewUrl}
                  alt={p.title}
                  className="w-24 h-24 rounded-lg object-cover shrink-0 border border-[#d4af37]/20"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#cbbd9c]/60">{formatBytes(p.file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removePending(p.localId)}
                      className="text-[#cbbd9c]/60 hover:text-red-400 cursor-pointer"
                      aria-label="Remove queued photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={p.title}
                    onChange={(e) =>
                      setPending((prev) =>
                        prev.map((x) => (x.localId === p.localId ? { ...x, title: e.target.value } : x))
                      )
                    }
                    placeholder="Title"
                    className="w-full rounded-lg bg-black/60 border border-[#d4af37]/25 px-3 py-1.5 text-xs text-[#fff3c4] focus:outline-none focus:border-[#f4d06f]"
                  />
                  <input
                    type="text"
                    value={p.caption}
                    onChange={(e) =>
                      setPending((prev) =>
                        prev.map((x) => (x.localId === p.localId ? { ...x, caption: e.target.value } : x))
                      )
                    }
                    placeholder="Friendship caption..."
                    className="w-full rounded-lg bg-black/60 border border-[#d4af37]/25 px-3 py-1.5 text-xs text-[#f5ecd7] focus:outline-none focus:border-[#f4d06f]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Photos List with Reorder, Edit, Publish Toggle, Delete */}
      <div className="luxury-panel rounded-2xl p-6">
        <h4 className="font-serif-luxury text-xl font-semibold text-[#fff3c4] mb-4">
          Photo Sequence ({photos.length})
        </h4>
        {photos.length === 0 ? (
          <p className="text-sm text-[#cbbd9c]/60 py-8 text-center">No photos uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {photos.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#d4af37]/20 bg-black/40 p-3.5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <img
                  src={item.url}
                  alt={item.title}
                  className="w-full sm:w-20 h-36 sm:h-20 rounded-lg object-cover shrink-0 border border-[#d4af37]/25"
                />

                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg bg-black/60 border border-[#d4af37]/40 px-3 py-1.5 text-xs text-[#fff3c4]"
                      />
                      <input
                        type="text"
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        className="w-full rounded-lg bg-black/60 border border-[#d4af37]/40 px-3 py-1.5 text-xs text-[#f5ecd7]"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          disabled={busyId === item.id}
                          className="gold-pill-btn rounded-lg px-3 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-white/15 px-3 py-1 text-xs text-[#cbbd9c] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#d4af37]/70">#{idx + 1}</span>
                        <h5 className="font-medium text-sm text-[#fff3c4] truncate">{item.title}</h5>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            item.is_published
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-xs text-[#cbbd9c]/70 mt-1 line-clamp-2">
                        {item.caption || 'No caption added'}
                      </p>
                      <p className="text-[11px] text-[#cbbd9c]/45 mt-1">
                        {formatBytes(item.file_size)} • {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0 || busyId === item.id}
                    onClick={() => handleMove(idx, -1)}
                    className="p-2 rounded-lg border border-[#d4af37]/25 text-[#f4d06f] hover:bg-[#d4af37]/10 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === photos.length - 1 || busyId === item.id}
                    onClick={() => handleMove(idx, 1)}
                    className="p-2 rounded-lg border border-[#d4af37]/25 text-[#f4d06f] hover:bg-[#d4af37]/10 disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="px-3 py-1.5 rounded-lg border border-[#d4af37]/25 text-xs text-[#fff3c4] hover:bg-[#d4af37]/10 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => togglePublish(item)}
                    className="px-3 py-1.5 rounded-lg border border-[#d4af37]/25 text-xs flex items-center gap-1.5 text-[#f4d06f] hover:bg-[#d4af37]/10 cursor-pointer"
                  >
                    {item.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {item.is_published ? 'Unpublish' : 'Publish'}
                  </button>

                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => confirmDelete(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 rounded-lg border border-white/15 text-xs text-[#cbbd9c] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="p-2 rounded-lg border border-red-500/25 text-red-300 hover:bg-red-500/15 cursor-pointer"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
