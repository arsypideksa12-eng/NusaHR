import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'light' | 'dark';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'light' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const baseClass =
    variant === 'dark'
      ? 'inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors whitespace-nowrap shrink-0 min-h-[40px]'
      : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]';

  if (isInstallable) {
    return (
      <button type="button" onClick={install} className={baseClass}>
        <Download className="h-4 w-4 text-emerald-500" />
        <span>Install PWA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button type="button" onClick={() => setShowIOSGuide(true)} className={baseClass}>
          <Smartphone className="h-4 w-4 text-emerald-500" />
          <span>Install di iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Install NusaHR di iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah Safari.</li>
                <li>2. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong>.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
