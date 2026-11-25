export type MediaType = 'photo' | 'video';

export interface MediaItem {
  id: string;
  title: string;
  caption: string;
  media_type: MediaType;
  mime_type: string;
  storage_path: string;
  file_size: number;
  display_order: number;
  is_published: boolean;
  uploaded_by: string | null;
  created_at: string;
  url?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

export const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm'] as const;
export const ALLOWED_AUDIO_MIMES = ['audio/mpeg', 'audio/ogg'] as const;

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB

const FORBIDDEN_EXTENSIONS = ['.heic', '.heif', '.avi', '.mkv', '.mov', '.gif', '.exe', '.bat', '.sh', '.msi', '.svg'];

export interface MediaValidationResult {
  valid: boolean;
  mediaType?: MediaType;
  error?: string;
}

export function validateMediaFile(file: File, expectedType?: MediaType): MediaValidationResult {
  const nameLower = file.name.toLowerCase();
  const matchedForbidden = FORBIDDEN_EXTENSIONS.find((ext) => nameLower.endsWith(ext));
  if (matchedForbidden) {
    return {
      valid: false,
      error: `Unsupported format (${matchedForbidden}). Allowed: JPG, PNG, WebP (<=10 MB) and MP4, WebM (<=50 MB).`,
    };
  }

  const isPhotoMime = (ALLOWED_PHOTO_MIMES as readonly string[]).includes(file.type);
  const isVideoMime = (ALLOWED_VIDEO_MIMES as readonly string[]).includes(file.type);

  if (!isPhotoMime && !isVideoMime) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type || 'unknown'}". Only JPG, PNG, WebP photos and MP4, WebM videos are allowed.`,
    };
  }

  const detectedType: MediaType = isPhotoMime ? 'photo' : 'video';
  if (expectedType && detectedType !== expectedType) {
    return {
      valid: false,
      error:
        expectedType === 'photo'
          ? 'This uploader only accepts photos (JPG, PNG, WebP).'
          : 'This uploader only accepts videos (MP4, WebM).',
    };
  }

  if (detectedType === 'photo' && file.size > MAX_PHOTO_BYTES) {
    return {
      valid: false,
      error: `Photo "${file.name}" exceeds the 10 MB limit (${formatBytes(file.size)}).`,
    };
  }

  if (detectedType === 'video' && file.size > MAX_VIDEO_BYTES) {
    return {
      valid: false,
      error: `Video "${file.name}" exceeds the 50 MB limit (${formatBytes(file.size)}).`,
    };
  }

  if (file.size <= 0) {
    return { valid: false, error: `File "${file.name}" is empty.` };
  }

  return { valid: true, mediaType: detectedType };
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const nameLower = file.name.toLowerCase();
  if (!((ALLOWED_AUDIO_MIMES as readonly string[]).includes(file.type)) && !nameLower.endsWith('.mp3') && !nameLower.endsWith('.ogg')) {
    return {
      valid: false,
      error: `Unsupported audio type "${file.type || 'unknown'}". Only MP3 (audio/mpeg) and OGG (audio/ogg) up to 15 MB are allowed.`,
    };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return {
      valid: false,
      error: `Audio file exceeds the 15 MB limit (${formatBytes(file.size)}).`,
    };
  }
  if (file.size <= 0) {
    return { valid: false, error: 'Audio file is empty.' };
  }
  return { valid: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
