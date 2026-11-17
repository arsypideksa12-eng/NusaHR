const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const WORKING_DAY_OPTIONS = [
  { key: 'Mon', label: 'Senin', short: 'Sen' },
  { key: 'Tue', label: 'Selasa', short: 'Sel' },
  { key: 'Wed', label: 'Rabu', short: 'Rab' },
  { key: 'Thu', label: 'Kamis', short: 'Kam' },
  { key: 'Fri', label: 'Jumat', short: 'Jum' },
  { key: 'Sat', label: 'Sabtu', short: 'Sab' },
  { key: 'Sun', label: 'Minggu', short: 'Min' },
];

export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Formats date strictly as DD-MMM-YYYY (e.g., 13-Nov-2026)
 */
export function formatDateDDMMMYYYY(input: Date | string | null | undefined): string {
  if (!input) return '-';
  let date: Date;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(trimmed);
    }
  } else {
    date = input;
  }
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = SHORT_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatMonthLabel(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-').map(Number);
  return `${SHORT_MONTHS[m - 1] ?? 'Jan'} ${y}`;
}

export function formatTimeHHMM(isoString: string | null | undefined): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatTimeHHMMSS(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export function formatRupiah(amount: number | null | undefined): string {
  const val = Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : 0;
  return `Rp ${val.toLocaleString('id-ID')}`;
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0j 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}j ${m}m`;
}

export function getDayKeyFromDate(date: Date): string {
  const keys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return keys[date.getDay()];
}

export function evaluateClockInStatus(now: Date, workStartTime: string, toleranceMinutes: number): 'present' | 'late' {
  const [hh, mm] = (workStartTime || '08:00').split(':').map(Number);
  const threshold = new Date(now);
  threshold.setHours(hh || 8, (mm || 0) + (toleranceMinutes || 0), 59, 999);
  return now.getTime() > threshold.getTime() ? 'late' : 'present';
}

export function getMonthRange(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${String(m).padStart(2, '0')}-01`,
    end: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function translateAttendanceStatus(status: string): string {
  switch (status) {
    case 'present':
      return 'Hadir';
    case 'late':
      return 'Terlambat';
    case 'absent':
      return 'Alpa';
    case 'leave':
      return 'Izin';
    default:
      return status;
  }
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function normalizeLoginIdentifier(input: string): string {
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!cleaned) return '';
  if (cleaned.includes('@')) return cleaned;
  return `${cleaned}@nusahr.id`;
}

export function formatLoginDisplay(email: string | null | undefined): string {
  if (!email) return '-';
  if (email.endsWith('@nusahr.id')) {
    return email.slice(0, -'@nusahr.id'.length);
  }
  return email;
}

