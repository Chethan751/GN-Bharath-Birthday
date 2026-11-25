import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Crown, Sparkles, Link2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export function QrPage() {
  const defaultUrl =
    (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://gn-bharath-birthday.vercel.app');

  const [targetUrl, setTargetUrl] = useState(defaultUrl);
  const [copied, setCopied] = useState(false);
  const qrCanvasWrapperRef = useRef<HTMLDivElement>(null);

  const handleDownloadQr = () => {
    const sourceCanvas = qrCanvasWrapperRef.current?.querySelector('canvas');
    if (!sourceCanvas) return;

    // Compose a crisp high-resolution 1200x1480 luxury black-and-gold QR card PNG
    const width = 1200;
    const height = 1480;
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    // Background obsidian gradient
    const bgGrad = ctx.createRadialGradient(width / 2, 260, 60, width / 2, height / 2, 920);
    bgGrad.addColorStop(0, '#1c1509');
    bgGrad.addColorStop(0.55, '#0a090d');
    bgGrad.addColorStop(1, '#040406');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle starry gold dust
    for (let i = 0; i < 110; i++) {
      const sx = ((i * 397) % (width - 80)) + 40;
      const sy = ((i * 613) % (height - 80)) + 40;
      const r = (i % 3) + 0.8;
      ctx.fillStyle = `rgba(244, 208, 111, ${(0.18 + (i % 5) * 0.1).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Luxury double gold border frame
    const frameGrad = ctx.createLinearGradient(0, 0, width, height);
    frameGrad.addColorStop(0, '#fff3c4');
    frameGrad.addColorStop(0.5, '#d4af37');
    frameGrad.addColorStop(1, '#9a6e0e');

    ctx.strokeStyle = frameGrad;
    ctx.lineWidth = 6;
    ctx.strokeRect(56, 56, width - 112, height - 112);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.38)';
    ctx.lineWidth = 2;
    ctx.strokeRect(76, 76, width - 152, height - 152);

    // Header text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = '600 28px Georgia, serif';
    ctx.fillText('ROYAL INVITATION', width / 2, 168);

    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText("Scan to open", width / 2, 240);

    ctx.fillStyle = '#f4d06f';
    ctx.font = 'bold 62px Georgia, serif';
    ctx.fillText("GN Bharath's Birthday", width / 2, 314);

    // High-contrast crisp QR backing card (guarantees instant iOS & Android camera recognition)
    const qrBoxSize = 740;
    const qrX = (width - qrBoxSize) / 2;
    const qrY = 390;

    ctx.fillStyle = '#fffdf7';
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, 36);
    ctx.fill();

    ctx.strokeStyle = frameGrad;
    ctx.lineWidth = 10;
    ctx.stroke();

    // Draw crisp QR canvas inside
    const pad = 44;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, qrX + pad, qrY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2);

    // Draw golden center emblem on the high-res exported PNG
    const cx = width / 2;
    const cy = qrY + qrBoxSize / 2;
    ctx.fillStyle = '#09080c';
    ctx.beginPath();
    ctx.roundRect(cx - 58, cy - 58, 116, 116, 22);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#f4d06f';
    ctx.font = 'bold 58px Georgia, serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', cx, cy + 3);

    // Footer text
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(245, 236, 215, 0.78)';
    ctx.font = '500 28px sans-serif';
    ctx.fillText('Point your iPhone or Android camera to enter the 3D celebration', width / 2, 1245);

    ctx.fillStyle = '#d4af37';
    ctx.font = '500 24px monospace';
    ctx.fillText(targetUrl.slice(0, 56), width / 2, 1305);

    const link = document.createElement('a');
    link.download = 'GN-Bharath-Birthday-QR.png';
    link.href = out.toDataURL('image/png', 1.0);
    link.click();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12 bg-[#060608]">
      {/* Atmospheric golden ribbons & glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(212,175,55,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-40 top-1/3 w-96 h-96 rounded-full bg-[#d4af37]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 w-96 h-96 rounded-full bg-[#f4d06f]/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65 }}
        className="w-full max-w-md luxury-panel gold-border-glow rounded-3xl p-7 sm:p-9 text-center relative z-10"
      >
        <div className="w-14 h-14 mx-auto -mt-14 mb-4 rounded-2xl bg-[#0b0a0f] border border-[#f4d06f]/60 shadow-[0_0_32px_rgba(212,175,55,0.35)] flex items-center justify-center">
          <Crown className="w-7 h-7 text-[#f4d06f]" />
        </div>

        <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4af37] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Exclusive Invitation
        </p>
        <h1 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-[#fff3c4] mt-2">
          Scan to open
        </h1>
        <p className="font-serif-luxury text-2xl sm:text-3xl font-bold text-gold-gradient">
          GN Bharath&apos;s Birthday
        </p>

        {/* Gold-framed QR Code with Center Golden Emblem */}
        <div className="mt-6 mb-6 inline-block p-3 rounded-2xl bg-gradient-to-br from-[#fff3c4] via-[#d4af37] to-[#8c640a] shadow-[0_0_40px_rgba(212,175,55,0.28)]">
          <div
            ref={qrCanvasWrapperRef}
            className="relative bg-[#fffdf7] p-4 rounded-xl flex items-center justify-center"
          >
            <QRCodeCanvas
              value={targetUrl || defaultUrl}
              size={240}
              bgColor="#fffdf7"
              fgColor="#0c0a06"
              level="H"
              includeMargin={false}
            />
            {/* Center Golden Emblem */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 rounded-xl bg-[#09080c] border-2 border-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.5)] flex items-center justify-center">
                <span className="font-serif-luxury text-xl font-bold text-gold-gradient">B</span>
              </div>
            </div>
          </div>
        </div>

        {/* Target URL Editor */}
        <div className="mb-5 text-left">
          <label className="block text-[11px] uppercase tracking-wider text-[#d4af37]/80 mb-1.5">
            Celebration URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="w-3.5 h-3.5 text-[#d4af37]/70 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full rounded-xl bg-black/55 border border-[#d4af37]/30 pl-8 pr-3 py-2 text-xs text-[#fff3c4] focus:outline-none focus:border-[#f4d06f]"
              />
            </div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="rounded-xl border border-[#d4af37]/35 px-3 py-2 text-xs text-[#f4d06f] hover:bg-[#d4af37]/10 cursor-pointer flex items-center gap-1"
              title="Copy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : 'Copy'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadQr}
          className="w-full gold-pill-btn rounded-full py-3.5 px-6 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download QR
        </button>

        <p className="text-[11px] text-[#cbbd9c]/60 mt-4">
          High-resolution PNG optimized for iOS & Android native cameras.
        </p>
      </motion.div>
    </div>
  );
}
