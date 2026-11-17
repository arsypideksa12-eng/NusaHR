import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Edit3,
  Home,
  LogOut,
  Save,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react';
import {
  clockInEmployee,
  clockOutEmployee,
  updateOwnProfile,
} from '../services/hrmService';
import {
  Attendance,
  Employee,
  MobileTab,
  Payroll,
  WorkSetting,
} from '../types/hrm';
import {
  formatDateDDMMMYYYY,
  formatDuration,
  formatLoginDisplay,
  formatMonthLabel,
  formatRupiah,
  formatTimeHHMM,
  formatTimeHHMMSS,
  getMonthKey,
  toDateKey,
  translateAttendanceStatus,
} from '../utils/formatters';
import { PhoneFrameShell } from './PhoneFrameShell';
import { PWAInstallButton } from './PWAInstallButton';
import { SelfieCameraModal } from './SelfieCameraModal';

interface MobileEmployeeAppProps {
  employee: Employee;
  workSetting: WorkSetting | null;
  attendances: Attendance[];
  payrolls: Payroll[];
  isAdmin: boolean;
  onSwitchToBackoffice: () => void;
  onLogout: () => Promise<void>;
}

export const MobileEmployeeApp: React.FC<MobileEmployeeAppProps> = ({
  employee,
  workSetting,
  attendances,
  payrolls,
  isAdmin,
  onSwitchToBackoffice,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('beranda');
  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthKey(new Date()));
  const [cameraMode, setCameraMode] = useState<'clock-in' | 'clock-out' | null>(null);
  const [inspectPhoto, setInspectPhoto] = useState<{
    url: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [phoneInput, setPhoneInput] = useState(employee.phone || '');
  const [addressInput, setAddressInput] = useState(employee.address || '');
  const [bankNameInput, setBankNameInput] = useState(employee.bankName || '');
  const [bankAccountInput, setBankAccountInput] = useState(employee.bankAccount || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setPhoneInput(employee.phone || '');
    setAddressInput(employee.address || '');
    setBankNameInput(employee.bankName || '');
    setBankAccountInput(employee.bankAccount || '');
  }, [employee]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = toDateKey(now);
  const currentMonthKey = getMonthKey(now);

  const sortedAttendances = useMemo(() => {
    return [...attendances].sort((a, b) => {
      if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
      return (b.clockInTime || '').localeCompare(a.clockInTime || '');
    });
  }, [attendances]);

  const todayAttendance = useMemo(() => {
    return sortedAttendances.find((a) => a.dateKey === todayKey) || null;
  }, [sortedAttendances, todayKey]);

  const currentMonthAttendances = useMemo(() => {
    return sortedAttendances.filter(
      (a) => a.dateKey.startsWith(currentMonthKey) && (a.status === 'present' || a.status === 'late')
    );
  }, [sortedAttendances, currentMonthKey]);

  const currentMonthDays = useMemo(() => {
    return new Set(currentMonthAttendances.map((a) => a.dateKey)).size;
  }, [currentMonthAttendances]);

  const estimatedCurrentEarnings = currentMonthDays * (employee.dailyRate || 0);

  const filteredMonthAttendances = useMemo(() => {
    return sortedAttendances.filter((a) => a.dateKey.startsWith(selectedMonth));
  }, [sortedAttendances, selectedMonth]);

  const reportStats = useMemo(() => {
    const valid = filteredMonthAttendances.filter(
      (a) => a.status === 'present' || a.status === 'late'
    );
    const onTime = filteredMonthAttendances.filter((a) => a.status === 'present').length;
    const late = filteredMonthAttendances.filter((a) => a.status === 'late').length;
    const totalMinutes = filteredMonthAttendances.reduce((sum, a) => sum + (a.workMinutes || 0), 0);
    const uniqueDays = new Set(valid.map((a) => a.dateKey)).size;
    const avgMinutes = uniqueDays > 0 ? Math.round(totalMinutes / uniqueDays) : 0;

    const weeks = [0, 0, 0, 0, 0];
    valid.forEach((a) => {
      const day = Number(a.dateKey.split('-')[2] || '1');
      const idx = Math.min(4, Math.floor((day - 1) / 7));
      weeks[idx] += 1;
    });

    return {
      uniqueDays,
      onTime,
      late,
      totalMinutes,
      avgMinutes,
      estimatedPay: uniqueDays * (employee.dailyRate || 0),
      weeks,
    };
  }, [filteredMonthAttendances, employee.dailyRate]);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>([currentMonthKey]);
    attendances.forEach((a) => {
      if (a.dateKey && a.dateKey.length >= 7) keys.add(a.dateKey.slice(0, 7));
    });
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [attendances, currentMonthKey]);

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleConfirmSelfie = async (photoDataUrl: string, note: string) => {
    if (!cameraMode) return;
    try {
      if (cameraMode === 'clock-in') {
        if (todayAttendance) {
          showNotice('err', 'Anda sudah tercatat Clock-In hari ini.');
          setCameraMode(null);
          return;
        }
        await clockInEmployee(employee, photoDataUrl, note, workSetting);
        showNotice('ok', 'Clock-In selfie berhasil disimpan ke database.');
      } else if (cameraMode === 'clock-out' && todayAttendance) {
        await clockOutEmployee(todayAttendance, photoDataUrl, note);
        showNotice('ok', 'Clock-Out selfie berhasil disimpan ke database.');
      }
      setCameraMode(null);
    } catch (err) {
      showNotice(
        'err',
        err instanceof Error ? err.message : 'Gagal menyimpan presensi. Periksa koneksi Anda.'
      );
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateOwnProfile(employee.id, {
        phone: phoneInput,
        address: addressInput,
        bankName: bankNameInput,
        bankAccount: bankAccountInput,
      });
      setIsEditingProfile(false);
      showNotice('ok', 'Biodata dan rekening gaji berhasil diperbarui.');
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Gagal memperbarui profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const avatarSrc =
    employee.avatarUrl || '/src/assets/images/avatar_employee_default_1794886475523.jpg';

  const shiftLabel = workSetting
    ? `${workSetting.workStartTime} – ${workSetting.workEndTime}`
    : '08:00 – 17:00';

  return (
    <PhoneFrameShell
      topBarRight={
        <>
          <PWAInstallButton />
          {isAdmin && (
            <button
              type="button"
              onClick={onSwitchToBackoffice}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-600" />
              <span>Backoffice</span>
            </button>
          )}
        </>
      }
    >
      {/* Mobile App Top Bar inside phone */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/icon.svg"
            alt="NusaHR"
            className="h-8 w-8 shrink-0 rounded-xl object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {workSetting?.companyName || 'NusaHR'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="md:hidden">
            <PWAInstallButton />
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={onSwitchToBackoffice}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap md:hidden"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-600" />
              <span>Backoffice</span>
            </button>
          )}
          <span className="font-mono-tabular hidden text-[11px] font-semibold text-slate-500 md:inline">
            {formatDateDDMMMYYYY(now)}
          </span>
        </div>
      </header>

      {/* Scrollable Mobile App Body */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {actionFeedback && (
          <div
            className={`rounded-2xl border px-3.5 py-2.5 text-xs font-semibold ${
              actionFeedback.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {actionFeedback.text}
          </div>
        )}

        {/* TAB 1: BERANDA */}
        {activeTab === 'beranda' && (
          <div className="space-y-4">
            {/* Greeting Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={avatarSrc}
                  alt={employee.name}
                  className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold text-slate-900">
                    Halo, {employee.name}
                  </h1>
                  <p className="truncate text-xs text-slate-500">
                    {employee.positionTitle} <span aria-hidden="true">·</span>{' '}
                    {employee.employeeCode}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono-tabular text-xs font-bold text-slate-900">
                  {formatTimeHHMMSS(now)}
                </p>
                <p className="font-mono-tabular text-[11px] text-slate-500">
                  {formatDateDDMMMYYYY(now)}
                </p>
              </div>
            </div>

            {/* Fintech Obsidian Hero Card */}
            <section className="rounded-3xl bg-[#0B1215] p-5 text-white shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Estimasi Gaji {formatMonthLabel(currentMonthKey)}
                  </p>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold tracking-tight text-white">
                    {formatRupiah(estimatedCurrentEarnings)}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-300">
                    <span className="font-mono-tabular font-semibold text-emerald-400">
                      {currentMonthDays} hari masuk
                    </span>{' '}
                    <span aria-hidden="true">·</span>{' '}
                    <span className="font-mono-tabular">
                      {formatRupiah(employee.dailyRate)}/hari
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-right shrink-0">
                  <p className="text-[10px] text-slate-400">Shift</p>
                  <p className="font-mono-tabular mt-0.5 text-xs font-semibold text-white">
                    {shiftLabel}
                  </p>
                </div>
              </div>

              {/* Today Attendance Status + Primary CTA */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-slate-300">
                      Presensi {formatDateDDMMMYYYY(todayKey)}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-white">
                      {!todayAttendance
                        ? 'Belum Clock-In'
                        : !todayAttendance.clockOutTime
                          ? `Clock-In ${formatTimeHHMM(todayAttendance.clockInTime)}`
                          : `${formatTimeHHMM(todayAttendance.clockInTime)} – ${formatTimeHHMM(todayAttendance.clockOutTime)}`}
                    </p>
                  </div>
                  {todayAttendance && (
                    <span
                      className={`text-xs font-bold ${
                        todayAttendance.status === 'late' ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {translateAttendanceStatus(todayAttendance.status)}
                    </span>
                  )}
                </div>

                {todayAttendance && (
                  <div className="mt-3 flex items-center gap-2.5">
                    {todayAttendance.clockInPhoto && (
                      <button
                        type="button"
                        onClick={() =>
                          setInspectPhoto({
                            url: todayAttendance.clockInPhoto,
                            title: 'Selfie Clock-In',
                            subtitle: `${formatDateDDMMMYYYY(todayAttendance.dateKey)} · ${formatTimeHHMM(todayAttendance.clockInTime)}`,
                          })
                        }
                        className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 text-left hover:bg-white/10"
                      >
                        <img
                          src={todayAttendance.clockInPhoto}
                          alt="Selfie Clock-In"
                          className="h-9 w-9 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-[10px] text-slate-400">Masuk</p>
                          <p className="font-mono-tabular text-xs font-semibold text-white">
                            {formatTimeHHMM(todayAttendance.clockInTime)}
                          </p>
                        </div>
                      </button>
                    )}

                    {todayAttendance.clockOutPhoto && (
                      <button
                        type="button"
                        onClick={() =>
                          setInspectPhoto({
                            url: todayAttendance.clockOutPhoto,
                            title: 'Selfie Clock-Out',
                            subtitle: `${formatDateDDMMMYYYY(todayAttendance.dateKey)} · ${formatTimeHHMM(todayAttendance.clockOutTime)}`,
                          })
                        }
                        className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 text-left hover:bg-white/10"
                      >
                        <img
                          src={todayAttendance.clockOutPhoto}
                          alt="Selfie Clock-Out"
                          className="h-9 w-9 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-[10px] text-slate-400">Pulang</p>
                          <p className="font-mono-tabular text-xs font-semibold text-white">
                            {formatTimeHHMM(todayAttendance.clockOutTime)}
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-3.5">
                  {!todayAttendance ? (
                    <button
                      type="button"
                      onClick={() => setCameraMode('clock-in')}
                      className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.99]"
                    >
                      <Camera className="h-5 w-5" />
                      <span>Clock-In Sekarang (Selfie)</span>
                    </button>
                  ) : !todayAttendance.clockOutTime ? (
                    <button
                      type="button"
                      onClick={() => setCameraMode('clock-out')}
                      className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 active:scale-[0.99]"
                    >
                      <Camera className="h-5 w-5" />
                      <span>Clock-Out Sekarang (Selfie)</span>
                    </button>
                  ) : (
                    <div className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Presensi hari ini selesai ({formatDuration(todayAttendance.workMinutes)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2 Compact Quick Metric Tiles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Tarif Gaji Harian</p>
                <p className="font-mono-tabular mt-1 text-sm font-bold text-slate-900">
                  {formatRupiah(employee.dailyRate)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">Per hari masuk</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <p className="text-[11px] font-medium text-slate-500">Toleransi Masuk</p>
                <p className="font-mono-tabular mt-1 text-base font-bold text-slate-900">
                  {workSetting?.lateToleranceMinutes ?? 15} menit
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Mulai {workSetting?.workStartTime ?? '08:00'} WIB
                </p>
              </div>
            </div>

            {/* Recent Attendance Feed */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Aktivitas Terbaru</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('presensi')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Lihat Semua
                </button>
              </div>

              {sortedAttendances.length === 0 ? (
                <div className="py-6 text-center">
                  <Clock className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Belum ada riwayat presensi tercatat.
                  </p>
                </div>
              ) : (
                <div className="mt-2 divide-y divide-slate-100">
                  {sortedAttendances.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.clockInPhoto ? (
                          <button
                            type="button"
                            onClick={() =>
                              setInspectPhoto({
                                url: item.clockInPhoto,
                                title: `Selfie ${formatDateDDMMMYYYY(item.dateKey)}`,
                                subtitle: `Masuk ${formatTimeHHMM(item.clockInTime)}`,
                              })
                            }
                            className="shrink-0"
                          >
                            <img
                              src={item.clockInPhoto}
                              alt="Foto presensi"
                              className="h-10 w-10 rounded-xl border border-slate-200 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <Clock className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-mono-tabular text-xs font-bold text-slate-900">
                            {formatDateDDMMMYYYY(item.dateKey)}
                          </p>
                          <p className="font-mono-tabular mt-0.5 text-[11px] text-slate-500">
                            {formatTimeHHMM(item.clockInTime)} –{' '}
                            {item.clockOutTime ? formatTimeHHMM(item.clockOutTime) : 'Aktif'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-xs font-bold ${
                            item.status === 'late' ? 'text-amber-600' : 'text-emerald-700'
                          }`}
                        >
                          {translateAttendanceStatus(item.status)}
                        </p>
                        <p className="font-mono-tabular mt-0.5 text-[11px] text-slate-500">
                          {item.status === 'present' || item.status === 'late'
                            ? formatRupiah(employee.dailyRate || item.dailyRateSnapshot)
                            : formatRupiah(0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: PRESENSI */}
        {activeTab === 'presensi' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Riwayat Presensi</h1>
                <p className="text-xs text-slate-500">Log clock-in, clock-out &amp; selfie</p>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Pilih bulan presensi"
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            {filteredMonthAttendances.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <CalendarDays className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-800">
                  Belum ada data presensi ({formatMonthLabel(selectedMonth)})
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Lakukan Clock-In melalui menu Beranda.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMonthAttendances.map((att) => (
                  <article key={att.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono-tabular text-sm font-bold text-slate-900">
                          {formatDateDDMMMYYYY(att.dateKey)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {att.verified ? 'Terverifikasi HR' : 'Tercatat Sistem'} ·{' '}
                          <span className="font-mono-tabular">
                            {formatDuration(att.workMinutes)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          att.status === 'late'
                            ? 'text-amber-600'
                            : att.status === 'present'
                              ? 'text-emerald-700'
                              : 'text-slate-600'
                        }`}
                      >
                        {translateAttendanceStatus(att.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2.5">
                        {att.clockInPhoto ? (
                          <button
                            type="button"
                            onClick={() =>
                              setInspectPhoto({
                                url: att.clockInPhoto,
                                title: 'Foto Selfie Clock-In',
                                subtitle: `${formatDateDDMMMYYYY(att.dateKey)} · ${formatTimeHHMM(att.clockInTime)}`,
                              })
                            }
                            className="shrink-0"
                          >
                            <img
                              src={att.clockInPhoto}
                              alt="Selfie masuk"
                              className="h-11 w-11 rounded-xl border border-slate-200 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                            <Camera className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-500">Clock-In</p>
                          <p className="font-mono-tabular text-sm font-bold text-slate-900">
                            {formatTimeHHMM(att.clockInTime)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {att.clockOutPhoto ? (
                          <button
                            type="button"
                            onClick={() =>
                              setInspectPhoto({
                                url: att.clockOutPhoto,
                                title: 'Foto Selfie Clock-Out',
                                subtitle: `${formatDateDDMMMYYYY(att.dateKey)} · ${formatTimeHHMM(att.clockOutTime)}`,
                              })
                            }
                            className="shrink-0"
                          >
                            <img
                              src={att.clockOutPhoto}
                              alt="Selfie pulang"
                              className="h-11 w-11 rounded-xl border border-slate-200 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                            <Clock className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-500">Clock-Out</p>
                          <p className="font-mono-tabular text-sm font-bold text-slate-900">
                            {att.clockOutTime ? formatTimeHHMM(att.clockOutTime) : '--:--'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LAPORAN */}
        {activeTab === 'laporan' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Laporan Kehadiran</h1>
                <p className="text-xs text-slate-500">Rekapitulasi jam kerja &amp; hari masuk</p>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Pilih bulan laporan"
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Hari Masuk</p>
                <p className="font-mono-tabular mt-1 text-xl font-bold text-slate-900">
                  {reportStats.uniqueDays} hari
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Tepat / Terlambat</p>
                <p className="font-mono-tabular mt-1 text-xl font-bold text-slate-900">
                  {reportStats.onTime} / <span className="text-amber-600">{reportStats.late}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Total Jam Kerja</p>
                <p className="font-mono-tabular mt-1 text-xl font-bold text-slate-900">
                  {formatDuration(reportStats.totalMinutes)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Akumulasi Gaji</p>
                <p className="font-mono-tabular mt-1 text-base font-bold text-emerald-700">
                  {formatRupiah(reportStats.estimatedPay)}
                </p>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-900">
                Distribusi Mingguan ({formatMonthLabel(selectedMonth)})
              </h2>
              <div className="mt-3.5 space-y-3">
                {reportStats.weeks.map((count, idx) => {
                  const pct = Math.min(100, Math.round((count / 6) * 100));
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-xs font-medium text-slate-600">
                        Minggu {idx + 1}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono-tabular w-12 shrink-0 text-right text-xs font-bold text-slate-800">
                        {count} hr
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* TAB 4: PROFIL (BIODATA & GAJI) */}
        {activeTab === 'profil' && (
          <div className="space-y-4">
            {/* Gaji Summary Card */}
            <div className="rounded-3xl bg-[#0B1215] p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Skema Penggajian Harian</span>
                <Wallet className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="font-mono-tabular mt-1.5 text-2xl font-bold">
                {formatRupiah(employee.dailyRate)}{' '}
                <span className="text-xs font-normal text-slate-400">/ hari</span>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
                <div>
                  <p className="text-slate-400">Masuk Bulan Ini</p>
                  <p className="font-mono-tabular mt-0.5 font-bold text-white">
                    {currentMonthDays} hari
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Akumulasi Berjalan</p>
                  <p className="font-mono-tabular mt-0.5 font-bold text-emerald-400">
                    {formatRupiah(estimatedCurrentEarnings)}
                  </p>
                </div>
              </div>
            </div>

            {/* Biodata Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarSrc}
                    alt={employee.name}
                    className="h-12 w-12 rounded-2xl border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h1 className="text-base font-bold text-slate-900">{employee.name}</h1>
                    <p className="text-xs text-slate-500">
                      {employee.positionTitle} <span aria-hidden="true">·</span>{' '}
                      {employee.department}
                    </p>
                    <p className="font-mono-tabular mt-0.5 text-xs font-semibold text-emerald-700">
                      {employee.employeeCode}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{isEditingProfile ? 'Batal' : 'Ubah'}</span>
                </button>
              </div>

              {!isEditingProfile ? (
                <dl className="mt-4 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between gap-3 py-2.5">
                    <dt className="text-slate-500">Username / Login</dt>
                    <dd className="font-medium text-slate-900">
                      {formatLoginDisplay(employee.email)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2.5">
                    <dt className="text-slate-500">Tgl Bergabung</dt>
                    <dd className="font-mono-tabular font-medium text-slate-900">
                      {formatDateDDMMMYYYY(employee.joinDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2.5">
                    <dt className="text-slate-500">No. Telepon</dt>
                    <dd className="font-mono-tabular font-medium text-slate-900">
                      {employee.phone || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2.5">
                    <dt className="text-slate-500">Alamat</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {employee.address || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-2.5">
                    <dt className="text-slate-500">Rekening</dt>
                    <dd className="font-mono-tabular font-medium text-slate-900">
                      {employee.bankName
                        ? `${employee.bankName} · ${employee.bankAccount || '-'}`
                        : '-'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Nomor Telepon
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Alamat</label>
                    <input
                      type="text"
                      maxLength={250}
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Bank</label>
                      <input
                        type="text"
                        maxLength={60}
                        value={bankNameInput}
                        onChange={(e) => setBankNameInput(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        No. Rekening
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={bankAccountInput}
                        onChange={(e) => setBankAccountInput(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    <span>{savingProfile ? 'Menyimpan...' : 'Simpan Biodata'}</span>
                  </button>
                </form>
              )}
            </section>

            {/* Slip Gaji */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-900">Riwayat Slip Gaji</h2>
              {payrolls.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Belum ada slip gaji yang diterbitkan manajemen.
                </p>
              ) : (
                <div className="mt-2 divide-y divide-slate-100">
                  {payrolls
                    .slice()
                    .sort((a, b) => b.periodKey.localeCompare(a.periodKey))
                    .map((pay) => (
                      <div key={pay.id} className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{pay.periodLabel}</p>
                          <span
                            className={`text-xs font-bold ${
                              pay.status === 'paid' ? 'text-emerald-700' : 'text-amber-600'
                            }`}
                          >
                            {pay.status === 'paid' ? 'Sudah Dibayar' : 'Menunggu'}
                          </span>
                        </div>
                        <p className="font-mono-tabular mt-1 text-xs text-slate-500">
                          {pay.daysPresent} hari × {formatRupiah(pay.dailyRate)}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="font-mono-tabular text-sm font-bold text-slate-900">
                            {formatRupiah(pay.totalAmount)}
                          </span>
                          {pay.paidDate && (
                            <span className="font-mono-tabular text-[11px] text-slate-500">
                              {formatDateDDMMMYYYY(pay.paidDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        )}
      </main>

      {/* Phone Bottom Tab Bar (Inside phone shell) */}
      <nav
        aria-label="Navigasi Mobile Karyawan"
        className="grid h-16 shrink-0 grid-cols-4 items-center border-t border-slate-200 bg-white pb-safe"
      >
        {(
          [
            { id: 'beranda', label: 'Beranda', icon: Home },
            { id: 'presensi', label: 'Presensi', icon: Camera },
            { id: 'laporan', label: 'Laporan', icon: BarChart3 },
            { id: 'profil', label: 'Profil', icon: UserIcon },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
              <span className="text-[11px] font-semibold tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Selfie Capture Modal inside phone viewport */}
      {cameraMode && (
        <SelfieCameraModal
          mode={cameraMode}
          employeeName={employee.name}
          onClose={() => setCameraMode(null)}
          onConfirm={handleConfirmSelfie}
        />
      )}

      {/* Photo Lightbox inside phone viewport */}
      {inspectPhoto && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{inspectPhoto.title}</h3>
                <p className="font-mono-tabular text-xs text-slate-500">{inspectPhoto.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectPhoto(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Tutup pratinjau foto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={inspectPhoto.url}
              alt={inspectPhoto.title}
              className="aspect-square w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </PhoneFrameShell>
  );
};
