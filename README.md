# GN Bharath — Cinematic 3D Birthday Experience

A luxury black-and-gold interactive 3D birthday web application dedicated to **GN Bharath**, powered by React, TypeScript, Vite, Tailwind CSS, Three.js / React Three Fiber, Framer Motion, Howler.js, and Supabase.

## Project Structure

```
GN-Bharath-Birthday/
├── frontend/                 # React + TS + Vite + R3F + Tailwind SPA
│   ├── public/               # Static assets & default Happy Birthday audio
│   ├── src/
│   │   ├── components/
│   │   │   ├── scenes/       # WelcomeCakeScene, MemoriesScene, LetterScene, GiftScene, FinaleScene
│   │   │   └── ui/           # PasswordGate, TopNavbar
│   │   ├── hooks/            # Adaptive GPU/mobile quality hook
│   │   ├── pages/
│   │   │   ├── admin/        # Hidden /admin dashboard (Overview, PhotoManager, VideoManager, MediaLibrary)
│   │   │   ├── ExperiencePage.tsx
│   │   │   └── QrPage.tsx    # Luxury /qr generator with high-res PNG export
│   │   ├── services/         # supabaseClient, authService, mediaService, audioService
│   │   └── types/            # MediaType & strict validation helpers
│   └── vercel.json           # SPA rewrite rules for /, /qr, and /admin
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed_admins.sql
├── public/                   # Shared static reference assets
├── .env.example
└── README.md
```

## Security Architecture

- **DOB Lock (`VITE_BIRTHDAY_DOB=26112006`)**: The Date of Birth lock screen (`DDMMYYYY`) is a **frontend experience gate** designed to create a personalized reveal and unlock browser audio autoplay on user interaction.
- **Supabase RLS & Controlled Storage**: All persistent media metadata (`public.media_items`), authorized admin identity verification (`public.admin_users` + `public.is_admin()` security definer function), and storage objects (`birthday-media`, `birthday-audio`) are protected on the backend by PostgreSQL Row Level Security (RLS).
  - Public (`anon`) callers can **only** read rows where `is_published = true` and read published media objects.
  - Only the **two** authorized admin accounts registered in `public.admin_users` can insert, update, publish, reorder, or delete media.
  - `SUPABASE_SERVICE_ROLE_KEY` is never exposed in frontend code.

## Supported Media Formats & Limits

Enforced both in the `/admin` upload UI and in PostgreSQL/Storage bucket policies:
- **Photos**: `image/jpeg`, `image/png`, `image/webp` — Max **10 MB** per photo.
- **Videos**: `video/mp4` (H.264), `video/webm` — Max **50 MB** per video.
- **Background Audio**: `audio/mpeg` (MP3), `audio/ogg` (OGG) — Max **15 MB**.
- Disallowed formats (`.heic`, `.avi`, `.mkv`, `.mov`, `.gif`, executables) are rejected immediately.

## Setup Instructions

### 1. Supabase Setup
1. Create a new Supabase project.
2. Open **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`.
3. In **Authentication → Providers → Email**, disable public signups ("Allow new users to sign up" = OFF).
4. In **Authentication → Users**, manually create up to **two** admin users.
5. Edit `supabase/seed_admins.sql` with those two emails and run it in the SQL Editor (a database trigger strictly enforces the 2-admin limit).

### 2. Frontend Local Development
```bash
cd frontend
cp ../.env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 3. Deployment (GitHub + Vercel)
1. Push the repository to GitHub.
2. Import the project into Vercel with **Root Directory** set to `frontend`.
3. Add environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BIRTHDAY_DOB=26112006`
   - `VITE_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app`
4. `frontend/vercel.json` ensures `/`, `/qr`, and `/admin` work cleanly on browser refresh.

## Routes
- `/` — Locked DOB Gate → Cinematic 3D Birthday Experience
- `/qr` — Luxury Gold-Framed QR Code Generator & High-Res PNG Exporter
- `/admin` — Hidden Admin Dashboard (direct URL access only; zero links from public pages)
