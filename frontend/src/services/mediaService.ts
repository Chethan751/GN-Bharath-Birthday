import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  validateMediaFile,
  validateAudioFile,
  type MediaItem,
  type MediaType,
} from '../types/media';

const MEDIA_BUCKET = 'birthday-media';
const AUDIO_BUCKET = 'birthday-audio';
const CUSTOM_AUDIO_PATH = 'bg-music/custom-birthday-theme';

interface CachedUrl {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CachedUrl>();

async function resolveSignedUrl(bucket: string, path: string): Promise<string> {
  if (!supabase) return '';
  const cacheKey = `${bucket}:${path}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (!error && data?.signedUrl) {
    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: Date.now() + 50 * 60 * 1000, // refresh 10m before expiry
    });
    return data.signedUrl;
  }

  const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(path);
  return pubData.publicUrl;
}

async function hydrateUrls(items: MediaItem[]): Promise<MediaItem[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      url: await resolveSignedUrl(MEDIA_BUCKET, item.storage_path),
    }))
  );
}

export async function fetchPublishedMedia(): Promise<MediaItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.warn('Failed to fetch published media:', error?.message);
    return [];
  }

  return hydrateUrls(data as MediaItem[]);
}

export async function fetchAllAdminMedia(): Promise<MediaItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to load media library');
  }

  return hydrateUrls(data as MediaItem[]);
}

export function subscribeToPublishedMedia(onChange: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('public-media-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'media_items' },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    void supabase?.removeChannel(channel);
  };
}

export interface UploadMediaPayload {
  file: File;
  title: string;
  caption: string;
  isPublished: boolean;
  displayOrder?: number;
  expectedType?: MediaType;
  onProgress?: (percent: number) => void;
}

export async function uploadMediaItem(payload: UploadMediaPayload): Promise<MediaItem> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const validation = validateMediaFile(payload.file, payload.expectedType);
  if (!validation.valid || !validation.mediaType) {
    throw new Error(validation.error ?? 'Invalid media file.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    throw new Error('Authentication required to upload media.');
  }

  const ext = payload.file.name.split('.').pop()?.toLowerCase() || (validation.mediaType === 'photo' ? 'jpg' : 'mp4');
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${validation.mediaType}s/${uniqueName}`;

  payload.onProgress?.(10);

  // Use XMLHttpRequest with Supabase Storage REST endpoint when onProgress is provided for true upload progress
  const { data: uploadSession } = await supabase.auth.getSession();
  const accessToken = uploadSession.session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (payload.onProgress && accessToken && supabaseUrl && anonKey) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${supabaseUrl}/storage/v1/object/${MEDIA_BUCKET}/${storagePath}`);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('apikey', anonKey);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('Content-Type', payload.file.type);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.min(92, Math.round((evt.loaded / evt.total) * 85) + 10);
          payload.onProgress?.(pct);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Storage upload failed (${xhr.status}): ${xhr.responseText}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error while uploading media.'));
      xhr.send(payload.file);
    });
  } else {
    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, payload.file, {
        contentType: payload.file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }
  }

  payload.onProgress?.(95);

  const { data: inserted, error: insertError } = await supabase
    .from('media_items')
    .insert({
      title: payload.title.trim() || payload.file.name.replace(/\.[^.]+$/, ''),
      caption: payload.caption.trim(),
      media_type: validation.mediaType,
      mime_type: payload.file.type,
      storage_path: storagePath,
      file_size: payload.file.size,
      display_order: payload.displayOrder ?? 0,
      is_published: payload.isPublished,
      uploaded_by: userId,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    // Rollback orphaned storage object if DB insert fails
    await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
    throw new Error(insertError?.message ?? 'Failed to save media record.');
  }

  payload.onProgress?.(100);
  const [hydrated] = await hydrateUrls([inserted as MediaItem]);
  return hydrated;
}

export async function updateMediaItem(
  id: string,
  updates: Partial<Pick<MediaItem, 'title' | 'caption' | 'display_order' | 'is_published'>>
): Promise<MediaItem> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('media_items')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update media item.');
  }

  const [hydrated] = await hydrateUrls([data as MediaItem]);
  return hydrated;
}

export async function deleteMediaItem(item: MediaItem): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error: dbError } = await supabase.from('media_items').delete().eq('id', item.id);
  if (dbError) {
    throw new Error(dbError.message);
  }

  await supabase.storage.from(MEDIA_BUCKET).remove([item.storage_path]);
  signedUrlCache.delete(`${MEDIA_BUCKET}:${item.storage_path}`);
}

export async function reorderMediaItems(orderedIds: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase!.from('media_items').update({ display_order: index }).eq('id', id)
    )
  );
}

export async function uploadCustomBackgroundAudio(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const check = validateAudioFile(file);
  if (!check.valid) throw new Error(check.error);

  const ext = file.name.toLowerCase().endsWith('.ogg') ? 'ogg' : 'mp3';
  const path = `${CUSTOM_AUDIO_PATH}.${ext}`;

  // Clean up alternate extension if present
  await supabase.storage.from(AUDIO_BUCKET).remove([`${CUSTOM_AUDIO_PATH}.mp3`, `${CUSTOM_AUDIO_PATH}.ogg`]);

  const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, file, {
    contentType: file.type || (ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg'),
    upsert: true,
  });

  if (error) throw new Error(error.message);
  return resolveSignedUrl(AUDIO_BUCKET, path);
}

export async function fetchCustomBackgroundAudioUrl(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).list('bg-music', { limit: 5 });
  if (error || !data || data.length === 0) return null;
  const match = data.find((f) => f.name.startsWith('custom-birthday-theme'));
  if (!match) return null;
  return resolveSignedUrl(AUDIO_BUCKET, `bg-music/${match.name}`);
}
