import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import {
  Video as VideoIcon,
  Trash2,
  Eye,
  EyeOff,
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
} from '../../services/mediaService';

interface VideoManagerProps {
  videos: MediaItem[];
  onRefresh: () => Promise<void>;
}

export function VideoManager({ videos, onRefresh }: VideoManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const selectVideoFile = (file: File) => {
    setError(null);
    const check = validateMediaFile(file, 'video');
    if (!check.valid) {
      setError(check.error ?? 'Unsupported video format.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setTitle(file.name.replace(/\.[^.]+$/, ''));
    setCaption('');
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) selectVideoFile(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectVideoFile(file);
    e.target.value = '';
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setTitle('');
    setCaption('');
    setProgress(0);
  };

  const handleUpload = async (publishNow: boolean) => {
    if (!selectedFile) return;
    setUploading(true);
    setProgress(5);
    setError(null);
    try {
      await uploadMediaItem({
        file: selectedFile,
        title,
        caption,
        isPublished: publishNow,
        displayOrder: videos.length,
        expectedType: 'video',
        onProgress: (pct) => setProgress(pct),
      });
      clearSelection();
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    try {
      await updateMediaItem(id, { title: editTitle, caption: editCaption });
      setEditingId(null);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const togglePublish = async (item: MediaItem) => {
    setBusyId(item.id);
    try {
      await updateMediaItem(item.id, { is_published: !item.is_published });
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
          accept="video/mp4,video/webm,.mp4,.webm"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center mb-3">
          <VideoIcon className="w-7 h-7 text-[#f4d06f]" />
        </div>
        <h3 className="font-serif-luxury text-xl font-semibold text-[#fff3c4]">
          Drag & drop memory video here, or click to browse
        </h3>
        <p className="text-xs text-[#cbbd9c]/70 mt-1">
          Supports MP4 (H.264) & WebM • Max 50 MB per video
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected Video Preview & Upload Progress */}
      {selectedFile && previewUrl && (
        <div className="luxury-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif-luxury text-xl text-gold-gradient font-semibold">
              Video Preview & Details
            </h4>
            <button
              type="button"
              disabled={uploading}
              onClick={clearSelection}
              className="text-[#cbbd9c]/60 hover:text-red-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <video
              src={previewUrl}
              controls
              className="w-full rounded-xl border border-[#d4af37]/30 bg-black max-h-64"
            />
            <div className="space-y-3">
              <p className="text-xs text-[#cbbd9c]/70">
                File: <span className="text-[#fff3c4]">{selectedFile.name}</span> (
                {formatBytes(selectedFile.size)})
              </p>
              <div>
                <label className="block text-xs text-[#d4af37]/90 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl bg-black/55 border border-[#d4af37]/30 px-3.5 py-2.5 text-sm text-[#fff3c4]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#d4af37]/90 mb-1">Caption / Message</label>
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Forever memories..."
                  className="w-full rounded-xl bg-black/55 border border-[#d4af37]/30 px-3.5 py-2.5 text-sm text-[#f5ecd7]"
                />
              </div>

              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#f4d06f]">
                    <span>Uploading video...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/70 overflow-hidden border border-[#d4af37]/25">
                    <div
                      className="h-full bg-gradient-to-r from-[#b8860b] via-[#f4d06f] to-[#fff3c4] transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleUpload(false)}
                  className="rounded-xl border border-[#d4af37]/40 px-4 py-2.5 text-xs font-medium text-[#f4d06f] hover:bg-[#d4af37]/10 cursor-pointer disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleUpload(true)}
                  className="gold-pill-btn rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Publish Video'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Videos */}
      <div className="luxury-panel rounded-2xl p-6">
        <h4 className="font-serif-luxury text-xl font-semibold text-[#fff3c4] mb-4">
          Uploaded Videos ({videos.length})
        </h4>
        {videos.length === 0 ? (
          <p className="text-sm text-[#cbbd9c]/60 py-8 text-center">No videos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {videos.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#d4af37]/25 bg-black/45 overflow-hidden flex flex-col"
              >
                <video
                  src={item.url}
                  controls
                  preload="metadata"
                  className="w-full h-48 object-cover bg-black"
                />
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
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
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="font-medium text-sm text-[#fff3c4] truncate">{item.title}</h5>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                            item.is_published
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {item.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-xs text-[#cbbd9c]/70 mt-1">{item.caption || 'No caption'}</p>
                      <p className="text-[11px] text-[#cbbd9c]/45 mt-1">
                        {formatBytes(item.file_size)} • {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditTitle(item.title);
                        setEditCaption(item.caption);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#d4af37]/25 text-xs text-[#fff3c4] hover:bg-[#d4af37]/10 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => togglePublish(item)}
                      className="px-3 py-1.5 rounded-lg border border-[#d4af37]/25 text-xs flex items-center gap-1 text-[#f4d06f] hover:bg-[#d4af37]/10 cursor-pointer"
                    >
                      {item.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {item.is_published ? 'Unpublish' : 'Publish'}
                    </button>

                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => confirmDelete(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs cursor-pointer"
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
                        className="p-2 rounded-lg border border-red-500/25 text-red-300 hover:bg-red-500/15 ml-auto cursor-pointer"
                        title="Delete Video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
