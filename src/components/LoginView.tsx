import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Smartphone,
  User as UserIcon,
} from 'lucide-react';
import { AppPortalMode } from '../types/hrm';
import { formatDateDDMMMYYYY } from '../utils/formatters';
import { PhoneFrameShell } from './PhoneFrameShell';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginViewProps {
  portalMode: AppPortalMode;
  onChangePortalMode: (mode: AppPortalMode) => void;
  onLogin: (identifier: string, password: string) => Promise<void>;
  onRegister: (name: string, identifier: string, password: string) => Promise<void>;
  isLoading: boolean;
  authError: string;
  needsProviderActivation?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  portalMode,
  onChangePortalMode,
  onLogin,
  onRegister,
  isLoading,
  authError,
  needsProviderActivation = false,
}) => {
  const [authAction, setAuthAction] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isBackoffice = portalMode === 'backoffice';
  const todayFormatted = formatDateDDMMMYYYY(new Date());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authAction === 'login') {
      await onLogin(identifier, password);
    } else {
      await onRegister(name, identifier, password);
    }
  };

  const handleModeSwitch = (mode: AppPortalMode) => {
    setAuthAction('login');
    onChangePortalMode(mode);
  };

  if (!isBackoffice) {
    return (
      <PhoneFrameShell
        darkStatusBar
        topBarRight={
          <>
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => handleModeSwitch('backoffice')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
            >
              <Building2 className="h-3.5 w-3.5 text-slate-700" />
              <span>Backoffice</span>
            </button>
          </>
        }
      >
        <div className="flex h-full flex-col justify-between overflow-y-auto bg-[#0B1215] px-5 py-6 text-white">
          {/* Mobile Header inside phone */}
          <div>
            <div className="flex items-center justify-between gap-2 md:hidden">
              <div className="flex items-center gap-2">
                <img
                  src="/icon.svg"
                  alt="NusaHR"
                  className="h-8 w-8 rounded-xl"
                  referrerPolicy="no-referrer"
                />
                <span className="text-sm font-bold text-white">NusaHR</span>
              </div>
              <button
                type="button"
                onClick={() => handleModeSwitch('backoffice')}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Backoffice</span>
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/icon.svg"
                  alt="NusaHR App"
                  className="h-12 w-12 rounded-2xl border border-white/10"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-xs font-semibold text-emerald-400">Mobile PWA Karyawan</p>
                  <h1 className="text-xl font-bold tracking-tight text-white">Portal NusaHR</h1>
                </div>
              </div>
              <span className="font-mono-tabular text-xs text-slate-400">{todayFormatted}</span>
            </div>

            {/* Segmented Switch: Masuk vs Daftar */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setAuthAction('login')}
                className={`min-h-[42px] rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  authAction === 'login'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Masuk Karyawan
              </button>
              <button
                type="button"
                onClick={() => setAuthAction('register')}
                className={`min-h-[42px] rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  authAction === 'register'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Daftar Akun
              </button>
            </div>

            {authError && (
              <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/15 p-3.5 text-xs leading-relaxed text-red-200">
                <p className="font-semibold">{authError}</p>
                {needsProviderActivation && (
                  <p className="mt-1.5 text-[11px] text-red-100">
                    Aktifkan provider <strong>Email/Password</strong> di Firebase Console → Authentication → Sign-in method.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {authAction === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="mt-1.5 min-h-[48px] w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Username atau Email Karyawan
                </label>
                <div className="relative mt-1.5">
                  <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="budi atau budi@perusahaan.id"
                    className="min-h-[48px] w-full rounded-2xl border border-white/15 bg-white/10 pl-11 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Password / PIN (Min. 6 Karakter)
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password atau PIN"
                    className="min-h-[48px] w-full rounded-2xl border border-white/15 bg-white/10 pl-11 pr-12 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10"
                    aria-label="Tampilkan password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60"
              >
                <span>
                  {isLoading
                    ? 'Menghubungkan...'
                    : authAction === 'login'
                      ? 'Masuk ke Mobile App'
                      : 'Daftar & Masuk Karyawan'}
                </span>
              </button>
            </form>
          </div>

          <div className="mt-6 space-y-3 border-t border-white/10 pt-4 text-xs text-slate-400">
            <div className="flex items-center justify-between gap-2">
              <span>Presensi Selfie &amp; Slip Gaji</span>
              <PWAInstallButton variant="dark" />
            </div>
            <button
              type="button"
              onClick={() => handleModeSwitch('backoffice')}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Beralih ke Backoffice Management</span>
            </button>
          </div>
        </div>
      </PhoneFrameShell>
    );
  }

  /* Backoffice Management Login View */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/icon.svg"
              alt="Logo NusaHR"
              className="h-9 w-9 rounded-xl object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              NusaHR
            </span>
          </div>

          <div
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
            role="tablist"
            aria-label="Pilih mode portal"
          >
            <button
              type="button"
              role="tab"
              aria-selected={false}
              onClick={() => handleModeSwitch('employee')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile App Karyawan</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={true}
              onClick={() => handleModeSwitch('backoffice')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm whitespace-nowrap shrink-0"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Backoffice Management</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <PWAInstallButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-69px)] max-w-7xl grid-cols-1 items-stretch gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:py-12">
        <div className="relative hidden overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 lg:col-span-7 lg:block">
          <img
            src="/src/assets/images/login_workspace_banner_1794886474419.jpg"
            alt="Kantor operasional modern manajemen SDM NusaHR"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <p className="text-xs font-medium text-emerald-300">
              Panel Kendali Manajemen SDM <span aria-hidden="true">·</span> {todayFormatted}
            </p>
            <h1 className="mt-2 max-w-xl text-3xl font-bold leading-tight text-balance">
              Satu sumber kebenaran untuk presensi, jadwal kerja, dan penggajian harian.
            </h1>
            <div className="mt-6 grid grid-cols-3 gap-6 border-t border-white/15 pt-5 text-xs text-slate-200">
              <div>
                <p className="font-semibold text-white">Karyawan &amp; Jabatan</p>
                <p className="mt-1 text-slate-300">
                  Buat akun login karyawan langsung tanpa akun Google.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Verifikasi Selfie</p>
                <p className="mt-1 text-slate-300">
                  Pantau clock-in dan clock-out real-time lintas perangkat.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Payroll Harian</p>
                <p className="mt-1 text-slate-300">
                  Hitung otomatis berdasarkan jumlah hari masuk.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center lg:col-span-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            <p className="text-xs font-semibold text-emerald-700">
              Backoffice Management <span aria-hidden="true">·</span> Portal Admin
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {authAction === 'login' ? 'Masuk ke Panel Manajemen' : 'Aktivasi Admin Pertama'}
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAuthAction('login')}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  authAction === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk Admin
              </button>
              <button
                type="button"
                onClick={() => setAuthAction('register')}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  authAction === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aktivasi Admin Baru
              </button>
            </div>

            {authError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed text-red-700">
                <p className="font-semibold">{authError}</p>
                {needsProviderActivation && (
                  <div className="mt-2 space-y-1 border-t border-red-200 pt-2 text-[11px] text-red-800">
                    <p className="font-bold">Langkah Aktifkan Login Username/Password:</p>
                    <p>1. Buka Firebase Console Authentication → Sign-in method.</p>
                    <p>2. Aktifkan provider <strong>Email/Password</strong> lalu klik Save.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('employee')}
                  className="mt-2 inline-flex items-center gap-1 font-bold text-red-800 underline underline-offset-2"
                >
                  Beralih ke Mobile App Karyawan
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {authAction === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nama Administrator
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Rina Wijaya (HRD)"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Username atau Email Admin
                </label>
                <div className="relative mt-1.5">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin atau hrd@perusahaan.id"
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Password (Min. 6 Karakter)
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"
                    aria-label="Tampilkan password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60"
              >
                <span>
                  {isLoading
                    ? 'Memproses...'
                    : authAction === 'login'
                      ? 'Masuk Backoffice'
                      : 'Aktifkan Akun Admin Pertama'}
                </span>
              </button>
            </form>

            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Login menggunakan Username &amp; Password internal (tanpa akun Google).</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Belum punya akun admin? Pilih tab <strong>Aktivasi Admin Baru</strong> sekali saja.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
