import { useState, type FormEvent } from 'react';
import { Crown, Lock, ShieldAlert, Loader2, Eye, EyeOff } from 'lucide-react';
import { signInAdmin } from '../../services/authService';
import { isSupabaseConfigured } from '../../services/supabaseClient';

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signInAdmin(email, password);
      if (result.isAdmin) {
        onSuccess();
      } else {
        setError(result.error ?? 'Unauthorized credentials.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#060608] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(212,175,55,0.12),transparent_55%)]" />
      <div className="w-full max-w-md luxury-panel rounded-2xl p-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/40 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(212,175,55,0.2)]">
            <Crown className="w-7 h-7 text-[#f4d06f]" />
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#d4af37]/80 mb-1">
            GN Bharath • Private Console
          </p>
          <h1 className="font-serif-luxury text-3xl font-bold text-gold-gradient">
            Admin Portal
          </h1>
          <p className="text-xs text-[#cbbd9c]/70 mt-2">
            Restricted to authorized celebration curators only.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              Supabase environment variables are not configured yet. Set{' '}
              <code className="text-amber-100">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-amber-100">VITE_SUPABASE_ANON_KEY</code> in{' '}
              <code className="text-amber-100">.env</code>.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#d4af37]/90 mb-1.5">
              Admin Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="curator@domain.com"
              className="w-full rounded-xl bg-black/50 border border-[#d4af37]/30 px-4 py-3 text-sm text-[#f5ecd7] placeholder:text-[#cbbd9c]/35 focus:outline-none focus:border-[#f4d06f] transition"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#d4af37]/90 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl bg-black/50 border border-[#d4af37]/30 px-4 py-3 pr-11 text-sm text-[#f5ecd7] placeholder:text-[#cbbd9c]/35 focus:outline-none focus:border-[#f4d06f] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#cbbd9c]/60 hover:text-[#f4d06f]"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gold-pill-btn rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Access...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Sign In to Dashboard
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
