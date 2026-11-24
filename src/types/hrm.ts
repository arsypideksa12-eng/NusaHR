export type AppPortalMode = 'employee' | 'backoffice';
export type MobileTab = 'beranda' | 'presensi' | 'cuti' | 'laporan' | 'profil';
export type AdminTab = 'ringkasan' | 'karyawan' | 'jadwal' | 'kehadiran' | 'cuti' | 'payroll';

export type EmployeeStatus = 'active' | 'inactive';
export type EmployeeRole = 'admin' | 'employee';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave';
export type PayrollStatus = 'pending' | 'paid';
export type LeaveType = 'annual' | 'sick' | 'permit' | 'maternity';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface WorkSetting {
  id: string;
  companyName: string;
  workStartTime: string; // HH:MM
  workEndTime: string; // HH:MM
  lateToleranceMinutes: number;
  workingDays: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  holidays: string[]; // ['2026-11-20']
  defaultDailyRate: number;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface Position {
  id: string;
  title: string;
  department: string;
  defaultDailyRate: number;
  description: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Employee {
  id: string;
  employeeCode: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  positionId: string;
  positionTitle: string;
  department: string;
  dailyRate: number;
  joinDate: string; // YYYY-MM-DD
  status: EmployeeStatus;
  role: EmployeeRole;
  avatarUrl: string;
  bankName: string;
  bankAccount: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Attendance {
  id: string;
  employeeId: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  employeeCode: string;
  positionTitle: string;
  dateKey: string; // YYYY-MM-DD
  clockInTime: string; // ISO string
  clockOutTime: string; // ISO string or ''
  clockInPhoto: string; // compressed dataURL
  clockOutPhoto: string; // compressed dataURL or ''
  clockInNote: string;
  clockOutNote: string;
  status: AttendanceStatus;
  workMinutes: number;
  dailyRateSnapshot: number;
  verified: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Payroll {
  id: string;
  employeeId: string;
  userId: string;
  employeeEmail: string;
  employeeName: string;
  employeeCode: string;
  positionTitle: string;
  periodKey: string; // YYYY-MM
  periodLabel: string; // Nov 2026
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  daysPresent: number;
  daysLate: number;
  dailyRate: number;
  bonus: number;
  deduction: number;
  totalAmount: number;
  status: PayrollStatus;
  paidDate: string; // YYYY-MM-DD or ''
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  employeeCode: string;
  positionTitle: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewerNote: string;
  reviewedBy: string;
  reviewedAt: string; // ISO string or ''
  createdAt?: unknown;
  updatedAt?: unknown;
}
