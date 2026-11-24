import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Briefcase,
  CalendarClock,
  CalendarOff,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  adminDeleteAttendance,
  adminUpdateAttendance,
  applyDailyRateToAll,
  createEmployeeWithCredentials,
  deleteEmployee,
  deleteLeaveRequest,
  deletePayrollRecord,
  deletePosition,
  generateMonthlyPayrolls,
  reviewLeaveRequest,
  saveWorkSettings,
  updatePayrollRecord,
  upsertEmployee,
  upsertPosition,
} from '../services/hrmService';
import {
  AdminTab,
  Attendance,
  AttendanceStatus,
  Employee,
  LeaveRequest,
  Payroll,
  Position,
  WorkSetting,
} from '../types/hrm';
import {
  downloadCSV,
  formatDateDDMMMYYYY,
  formatDuration,
  formatLoginDisplay,
  formatMonthLabel,
  formatRupiah,
  formatTimeHHMM,
  getMonthKey,
  toDateKey,
  translateAttendanceStatus,
  translateLeaveStatus,
  translateLeaveType,
  WORKING_DAY_OPTIONS,
} from '../utils/formatters';

interface BackofficeAppProps {
  currentUser: User;
  workSetting: WorkSetting | null;
  positions: Position[];
  employees: Employee[];
  attendances: Attendance[];
  payrolls: Payroll[];
  leaveRequests: LeaveRequest[];
  onSwitchToEmployeeApp: () => void;
  onLogout: () => Promise<void>;
}

export const BackofficeApp: React.FC<BackofficeAppProps> = ({
  currentUser,
  workSetting,
  positions,
  employees,
  attendances,
  payrolls,
  leaveRequests,
  onSwitchToEmployeeApp,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('ringkasan');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Sub-tab inside Karyawan & Jabatan
  const [orgSubTab, setOrgSubTab] = useState<'employees' | 'positions'>('employees');
  const [empSearch, setEmpSearch] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Employee Modal state
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empPassword, setEmpPassword] = useState('');
  const [empForm, setEmpForm] = useState({
    employeeCode: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    positionId: '',
    positionTitle: '',
    department: '',
    dailyRate: 30000000,
    joinDate: toDateKey(new Date()),
    status: 'active' as 'active' | 'inactive',
    role: 'employee' as 'admin' | 'employee',
    bankName: '',
    bankAccount: '',
  });
  const [savingEmp, setSavingEmp] = useState(false);

  // Position Modal state
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posForm, setPosForm] = useState({
    title: '',
    department: '',
    defaultDailyRate: 30000000,
    description: '',
    isActive: true,
  });
  const [savingPos, setSavingPos] = useState(false);

  // Work Settings Form state
  const [wsForm, setWsForm] = useState({
    companyName: workSetting?.companyName || 'PT Nusa Digital Karya',
    workStartTime: workSetting?.workStartTime || '08:00',
    workEndTime: workSetting?.workEndTime || '17:00',
    lateToleranceMinutes: workSetting?.lateToleranceMinutes ?? 15,
    workingDays: workSetting?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    holidays: workSetting?.holidays || [],
    defaultDailyRate: workSetting?.defaultDailyRate ?? 30000000,
  });
  const [newHolidayInput, setNewHolidayInput] = useState('');
  const [savingWs, setSavingWs] = useState(false);

  useEffect(() => {
    if (workSetting) {
      setWsForm({
        companyName: workSetting.companyName,
        workStartTime: workSetting.workStartTime,
        workEndTime: workSetting.workEndTime,
        lateToleranceMinutes: workSetting.lateToleranceMinutes,
        workingDays: workSetting.workingDays,
        holidays: workSetting.holidays || [],
        defaultDailyRate: workSetting.defaultDailyRate,
      });
    }
  }, [workSetting]);

  // Attendance Filter & Inspection Modal
  const [attDateFilter, setAttDateFilter] = useState<string>('');
  const [attStatusFilter, setAttStatusFilter] = useState<string>('all');
  const [attSearch, setAttSearch] = useState<string>('');
  const [inspectAttendance, setInspectAttendance] = useState<Attendance | null>(null);

  // Payroll State
  const [payrollMonth, setPayrollMonth] = useState<string>(() => getMonthKey(new Date()));
  const [generatingPayroll, setGeneratingPayroll] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [payrollEditForm, setPayrollEditForm] = useState({
    bonus: 0,
    deduction: 0,
    notes: '',
  });

  // Leave Request Filter & Review Modal State
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('all');
  const [leaveSearch, setLeaveSearch] = useState<string>('');
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [reviewerNoteInput, setReviewerNoteInput] = useState<string>('');
  const [savingLeaveReview, setSavingLeaveReview] = useState<boolean>(false);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4500);
  };

  const todayKey = toDateKey(new Date());
  const currentMonthKey = getMonthKey(new Date());

  const activeEmployeesCount = useMemo(
    () => employees.filter((e) => e.status === 'active').length,
    [employees]
  );

  const todayAttendances = useMemo(() => {
    return attendances
      .filter((a) => a.dateKey === todayKey)
      .sort((a, b) => (b.clockInTime || '').localeCompare(a.clockInTime || ''));
  }, [attendances, todayKey]);

  const todayLateCount = useMemo(
    () => todayAttendances.filter((a) => a.status === 'late').length,
    [todayAttendances]
  );

  const estimatedMonthPayroll = useMemo(() => {
    const monthAtts = attendances.filter(
      (a) =>
        a.dateKey.startsWith(currentMonthKey) &&
        (a.status === 'present' || a.status === 'late')
    );
    const seenEmployeeDates = new Set<string>();
    return monthAtts.reduce((sum, a) => {
      const uniqueKey = `${a.employeeId}_${a.dateKey}`;
      if (seenEmployeeDates.has(uniqueKey)) return sum;
      seenEmployeeDates.add(uniqueKey);
      const emp = employees.find((e) => e.id === a.employeeId);
      return sum + (emp?.dailyRate ?? a.dailyRateSnapshot ?? 0);
    }, 0);
  }, [attendances, employees, currentMonthKey]);

  const filteredEmployees = useMemo(() => {
    return employees
      .filter((e) => {
        if (empStatusFilter !== 'all' && e.status !== empStatusFilter) return false;
        const q = empSearch.trim().toLowerCase();
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.positionTitle.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));
  }, [employees, empSearch, empStatusFilter]);

  const filteredAttendances = useMemo(() => {
    return attendances
      .filter((a) => {
        if (attDateFilter && a.dateKey !== attDateFilter) return false;
        if (attStatusFilter !== 'all' && a.status !== attStatusFilter) return false;
        const q = attSearch.trim().toLowerCase();
        if (!q) return true;
        return (
          a.employeeName.toLowerCase().includes(q) ||
          a.employeeCode.toLowerCase().includes(q) ||
          a.employeeEmail.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
        return (b.clockInTime || '').localeCompare(a.clockInTime || '');
      });
  }, [attendances, attDateFilter, attStatusFilter, attSearch]);

  const filteredPayrolls = useMemo(() => {
    return payrolls
      .filter((p) => p.periodKey === payrollMonth)
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [payrolls, payrollMonth]);

  const payrollMonthTotal = useMemo(() => {
    return filteredPayrolls.reduce((s, p) => s + (p.totalAmount || 0), 0);
  }, [filteredPayrolls]);

  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests
      .filter((l) => {
        if (leaveStatusFilter !== 'all' && l.status !== leaveStatusFilter) return false;
        const q = leaveSearch.trim().toLowerCase();
        if (!q) return true;
        return (
          l.employeeName.toLowerCase().includes(q) ||
          l.employeeCode.toLowerCase().includes(q) ||
          l.positionTitle.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [leaveRequests, leaveStatusFilter, leaveSearch]);

  const pendingLeaveCount = useMemo(
    () => leaveRequests.filter((l) => l.status === 'pending').length,
    [leaveRequests]
  );

  // Handlers
  const openAddEmployee = () => {
    const firstPos = positions.find((p) => p.isActive) || positions[0];
    const nextNum = employees.length + 1;
    setEditingEmp(null);
    setEmpPassword('');
    setEmpForm({
      employeeCode: `EMP-${String(nextNum).padStart(3, '0')}`,
      name: '',
      email: '',
      phone: '',
      address: '',
      positionId: firstPos?.id || 'default',
      positionTitle: firstPos?.title || 'Staff',
      department: firstPos?.department || 'Operasional',
      dailyRate: firstPos?.defaultDailyRate ?? wsForm.defaultDailyRate,
      joinDate: toDateKey(new Date()),
      status: 'active',
      role: 'employee',
      bankName: 'BCA',
      bankAccount: '',
    });
    setEmpModalOpen(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpPassword('');
    setEmpForm({
      employeeCode: emp.employeeCode,
      name: emp.name,
      email: formatLoginDisplay(emp.email),
      phone: emp.phone,
      address: emp.address,
      positionId: emp.positionId,
      positionTitle: emp.positionTitle,
      department: emp.department,
      dailyRate: emp.dailyRate,
      joinDate: emp.joinDate,
      status: emp.status,
      role: emp.role,
      bankName: emp.bankName,
      bankAccount: emp.bankAccount,
    });
    setEmpModalOpen(true);
  };

  const handleSelectPositionInEmpForm = (posId: string) => {
    const pos = positions.find((p) => p.id === posId);
    if (pos) {
      setEmpForm((prev) => ({
        ...prev,
        positionId: pos.id,
        positionTitle: pos.title,
        department: pos.department,
        dailyRate: pos.defaultDailyRate,
      }));
    }
  };

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmp(true);
    try {
      if (editingEmp) {
        await upsertEmployee(editingEmp.id, {
          ...empForm,
          userId: editingEmp.userId,
          avatarUrl: editingEmp.avatarUrl,
        });
      } else {
        await createEmployeeWithCredentials(
          {
            ...empForm,
            avatarUrl: '',
          },
          empPassword
        );
      }
      setEmpModalOpen(false);
      showToast(
        'ok',
        editingEmp
          ? `Data karyawan ${empForm.name} berhasil diperbarui.`
          : `Karyawan ${empForm.name} dan akun login berhasil dibuat.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan data karyawan.';
      if (msg.includes('auth/email-already-in-use')) {
        showToast('err', 'Username/Email login sudah digunakan oleh akun lain.');
      } else if (msg.includes('auth/weak-password')) {
        showToast('err', 'Password / PIN minimal 6 karakter.');
      } else {
        showToast('err', msg);
      }
    } finally {
      setSavingEmp(false);
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    try {
      await deleteEmployee(emp.id);
      showToast('ok', `Karyawan ${emp.name} dihapus.`);
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Gagal menghapus karyawan.');
    }
  };

  const openAddPosition = () => {
    setEditingPos(null);
    setPosForm({
      title: '',
      department: '',
      defaultDailyRate: wsForm.defaultDailyRate || 30000000,
      description: '',
      isActive: true,
    });
    setPosModalOpen(true);
  };

  const openEditPosition = (pos: Position) => {
    setEditingPos(pos);
    setPosForm({
      title: pos.title,
      department: pos.department,
      defaultDailyRate: pos.defaultDailyRate,
      description: pos.description,
      isActive: pos.isActive,
    });
    setPosModalOpen(true);
  };

  const handleSubmitPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPos(true);
    try {
      await upsertPosition(editingPos?.id ?? null, posForm);
      setPosModalOpen(false);
      showToast('ok', `Jabatan ${posForm.title} berhasil disimpan.`);
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Gagal menyimpan jabatan.');
    } finally {
      setSavingPos(false);
    }
  };

  const handleSaveWorkSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWs(true);
    try {
      await saveWorkSettings({
        ...wsForm,
        updatedBy: currentUser.uid,
      });
      showToast('ok', 'Pengaturan hari dan jam kerja berhasil disinkronkan.');
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan kerja.');
    } finally {
      setSavingWs(false);
    }
  };

  const toggleWorkingDay = (dayKey: string) => {
    setWsForm((prev) => {
      const exists = prev.workingDays.includes(dayKey);
      return {
        ...prev,
        workingDays: exists
          ? prev.workingDays.filter((d) => d !== dayKey)
          : [...prev.workingDays, dayKey],
      };
    });
  };

  const addHoliday = () => {
    if (!newHolidayInput) return;
    if (!wsForm.holidays.includes(newHolidayInput)) {
      setWsForm((prev) => ({
        ...prev,
        holidays: [...prev.holidays, newHolidayInput].sort(),
      }));
    }
    setNewHolidayInput('');
  };

  const handleGeneratePayroll = async () => {
    setGeneratingPayroll(true);
    try {
      const count = await generateMonthlyPayrolls(payrollMonth, employees, attendances, payrolls);
      showToast(
        'ok',
        `Perhitungan payroll ${formatMonthLabel(payrollMonth)} selesai (${count} karyawan disinkronkan).`
      );
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Gagal menghitung payroll.');
    } finally {
      setGeneratingPayroll(false);
    }
  };

  const handleApplyThirtyMillionRate = async () => {
    setGeneratingPayroll(true);
    try {
      const targetRate = 30000000;
      await applyDailyRateToAll(targetRate, employees, positions, workSetting, currentUser.uid);
      const updatedEmployees = employees.map((e) => ({ ...e, dailyRate: targetRate }));
      const count = await generateMonthlyPayrolls(
        payrollMonth,
        updatedEmployees,
        attendances,
        payrolls
      );
      showToast(
        'ok',
        `Tarif Rp 30.000.000/hari diterapkan ke semua karyawan & ${count} data payroll disinkronkan.`
      );
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Gagal menerapkan tarif harian.');
    } finally {
      setGeneratingPayroll(false);
    }
  };

  const handleExportAttendances = () => {
    downloadCSV(
      `kehadiran-${attDateFilter || 'semua'}.csv`,
      ['Tanggal', 'Kode', 'Nama', 'Jabatan', 'Clock-In', 'Clock-Out', 'Durasi (Menit)', 'Status', 'Verifikasi'],
      filteredAttendances.map((a) => [
        formatDateDDMMMYYYY(a.dateKey),
        a.employeeCode,
        a.employeeName,
        a.positionTitle,
        formatTimeHHMM(a.clockInTime),
        a.clockOutTime ? formatTimeHHMM(a.clockOutTime) : '-',
        a.workMinutes,
        translateAttendanceStatus(a.status),
        a.verified ? 'Terverifikasi' : 'Menunggu',
      ])
    );
  };

  const handleExportPayrolls = () => {
    downloadCSV(
      `payroll-${payrollMonth}.csv`,
      ['Periode', 'Kode', 'Nama', 'Jabatan', 'Hari Masuk', 'Tarif Harian', 'Bonus', 'Potongan', 'Total Gaji', 'Status', 'Tgl Bayar'],
      filteredPayrolls.map((p) => [
        p.periodLabel,
        p.employeeCode,
        p.employeeName,
        p.positionTitle,
        p.daysPresent,
        p.dailyRate,
        p.bonus,
        p.deduction,
        p.totalAmount,
        p.status === 'paid' ? 'Dibayar' : 'Pending',
        p.paidDate ? formatDateDDMMMYYYY(p.paidDate) : '-',
      ])
    );
  };

  const handleExportLeaveRequests = () => {
    downloadCSV(
      `cuti-karyawan-${toDateKey(new Date())}.csv`,
      ['Kode', 'Nama', 'Jabatan', 'Jenis Cuti', 'Tgl Mulai', 'Tgl Selesai', 'Durasi (Hari)', 'Alasan', 'Status', 'Catatan HR'],
      filteredLeaveRequests.map((l) => [
        l.employeeCode,
        l.employeeName,
        l.positionTitle,
        translateLeaveType(l.leaveType),
        formatDateDDMMMYYYY(l.startDate),
        formatDateDDMMMYYYY(l.endDate),
        l.totalDays,
        l.reason,
        translateLeaveStatus(l.status),
        l.reviewerNote || '-',
      ])
    );
  };

  const handleReviewLeave = async (status: 'approved' | 'rejected') => {
    if (!reviewingLeave) return;
    setSavingLeaveReview(true);
    try {
      await reviewLeaveRequest(reviewingLeave.id, status, reviewerNoteInput, currentUser.uid);
      setReviewingLeave(null);
      setReviewerNoteInput('');
      showToast(
        'ok',
        `Pengajuan cuti ${reviewingLeave.employeeName} ${status === 'approved' ? 'disetujui' : 'ditolak'}.`
      );
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Gagal memproses pengajuan cuti.');
    } finally {
      setSavingLeaveReview(false);
    }
  };

  const navItems: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'karyawan', label: 'Karyawan & Jabatan', icon: Users },
    { id: 'jadwal', label: 'Hari & Jam Kerja', icon: CalendarClock },
    { id: 'kehadiran', label: 'Data Kehadiran', icon: ClipboardCheck },
    { id: 'cuti', label: pendingLeaveCount > 0 ? `Pengajuan Cuti (${pendingLeaveCount})` : 'Pengajuan Cuti', icon: CalendarOff },
    { id: 'payroll', label: 'Payroll Harian', icon: Wallet },
  ];

  const activeNavTitle = navItems.find((n) => n.id === activeTab)?.label || 'Ringkasan';
  const adminAvatar =
    currentUser.photoURL || '/src/assets/images/avatar_admin_profile_1794886475215.jpg';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <img
            src="/icon.svg"
            alt="NusaHR"
            className="h-9 w-9 rounded-xl object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="text-base font-bold tracking-tight text-slate-900">NusaHR</p>
            <p className="text-[11px] font-medium text-slate-500">Backoffice Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Menu Backoffice">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3 space-y-2">
          <button
            type="button"
            onClick={onSwitchToEmployeeApp}
            className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>Buka Mobile PWA</span>
          </button>

          <div className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={adminAvatar}
                alt="Admin"
                className="h-8 w-8 shrink-0 rounded-xl object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">
                  {currentUser.displayName || 'HR Admin'}
                </p>
                <p className="truncate text-[11px] text-slate-500">{currentUser.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Keluar"
              aria-label="Keluar dari akun"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-72 flex-col bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/icon.svg"
                  alt="NusaHR"
                  className="h-8 w-8 rounded-xl"
                  referrerPolicy="no-referrer"
                />
                <span className="text-base font-bold text-slate-900">NusaHR Backoffice</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="mt-4 flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
                      active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={onSwitchToEmployeeApp}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Smartphone className="h-4 w-4" />
                <span>Buka Mobile App Karyawan</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Keluar</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">
                {workSetting?.companyName || 'PT Nusa Digital Karya'}{' '}
                <span aria-hidden="true">/</span> {activeNavTitle}
              </p>
              <h1 className="truncate text-base font-bold text-slate-900">{activeNavTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono-tabular hidden text-xs font-medium text-slate-500 sm:inline">
              {formatDateDDMMMYYYY(new Date())}
            </span>
            <button
              type="button"
              onClick={onSwitchToEmployeeApp}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Smartphone className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Mode Karyawan</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {notice && (
            <div
              className={`mb-5 rounded-xl border px-4 py-3 text-xs font-semibold ${
                notice.type === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* TAB 1: RINGKASAN */}
          {activeTab === 'ringkasan' && (
            <div className="space-y-6">
              {/* 4 KPI Strip */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">Karyawan Aktif</p>
                  <p className="font-mono-tabular mt-2 text-3xl font-bold text-slate-900">
                    {activeEmployeesCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {positions.length} jabatan terdaftar
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">
                    Hadir Hari Ini ({formatDateDDMMMYYYY(todayKey)})
                  </p>
                  <p className="font-mono-tabular mt-2 text-3xl font-bold text-emerald-700">
                    {todayAttendances.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Dari {activeEmployeesCount} karyawan aktif
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">Terlambat Hari Ini</p>
                  <p className="font-mono-tabular mt-2 text-3xl font-bold text-amber-600">
                    {todayLateCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Batas masuk {workSetting?.workStartTime || '08:00'} +{' '}
                    {workSetting?.lateToleranceMinutes ?? 15}m
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">
                    Akumulasi Payroll {formatMonthLabel(currentMonthKey)}
                  </p>
                  <p className="font-mono-tabular mt-2 text-xl font-bold text-slate-900 xl:text-2xl">
                    {formatRupiah(estimatedMonthPayroll)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Berbasis hari masuk aktual</p>
                </div>
              </div>

              {/* Today Live Feed + Work Rules */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-8">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Presensi Real-Time Hari Ini ({formatDateDDMMMYYYY(todayKey)})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Sinkron langsung dari Mobile PWA Karyawan
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('kehadiran')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
                    >
                      Semua Kehadiran
                    </button>
                  </div>

                  {todayAttendances.length === 0 ? (
                    <div className="py-12 text-center">
                      <Camera className="mx-auto h-9 w-9 text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        Belum ada clock-in hari ini
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Data akan tampil otomatis segera setelah karyawan melakukan selfie clock-in.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-500">
                            <th className="py-3 font-semibold">Karyawan</th>
                            <th className="py-3 font-semibold">Selfie</th>
                            <th className="py-3 font-semibold">Clock-In</th>
                            <th className="py-3 font-semibold">Clock-Out</th>
                            <th className="py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {todayAttendances.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50">
                              <td className="py-3 pr-3">
                                <p className="font-bold text-slate-900">{a.employeeName}</p>
                                <p className="text-[11px] text-slate-500">
                                  {a.positionTitle} · {a.employeeCode}
                                </p>
                              </td>
                              <td className="py-3 pr-3">
                                {a.clockInPhoto ? (
                                  <button
                                    type="button"
                                    onClick={() => setInspectAttendance(a)}
                                    className="inline-flex items-center gap-2 text-emerald-700 hover:underline"
                                  >
                                    <img
                                      src={a.clockInPhoto}
                                      alt={a.employeeName}
                                      className="h-9 w-9 rounded-lg border border-slate-200 object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="font-semibold">Lihat</span>
                                  </button>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="font-mono-tabular py-3 pr-3 font-semibold text-slate-900">
                                {formatTimeHHMM(a.clockInTime)}
                              </td>
                              <td className="font-mono-tabular py-3 pr-3 text-slate-700">
                                {a.clockOutTime ? formatTimeHHMM(a.clockOutTime) : '--:--'}
                              </td>
                              <td className="py-3">
                                <span
                                  className={`font-bold ${
                                    a.status === 'late' ? 'text-amber-600' : 'text-emerald-700'
                                  }`}
                                >
                                  {translateAttendanceStatus(a.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h2 className="text-sm font-bold text-slate-900">Jadwal Kerja Aktif</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('jadwal')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Atur
                    </button>
                  </div>
                  <dl className="mt-4 space-y-3 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Jam Masuk – Pulang</dt>
                      <dd className="font-mono-tabular font-bold text-slate-900">
                        {wsForm.workStartTime} – {wsForm.workEndTime} WIB
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Toleransi Keterlambatan</dt>
                      <dd className="font-mono-tabular font-bold text-slate-900">
                        {wsForm.lateToleranceMinutes} menit
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Tarif Dasar Harian</dt>
                      <dd className="font-mono-tabular font-bold text-slate-900">
                        {formatRupiah(wsForm.defaultDailyRate)} / hari
                      </dd>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <dt className="text-slate-500">Hari Kerja Aktif</dt>
                      <dd className="mt-1.5 font-semibold text-slate-800">
                        {WORKING_DAY_OPTIONS.filter((d) => wsForm.workingDays.includes(d.key))
                          .map((d) => d.label)
                          .join(', ') || 'Belum diatur'}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          )}

          {/* TAB 2: KARYAWAN & JABATAN */}
          {activeTab === 'karyawan' && (
            <div className="space-y-5">
              {/* Sub-tab & Action Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setOrgSubTab('employees')}
                    className={`min-h-[40px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      orgSubTab === 'employees'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Data Karyawan ({employees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrgSubTab('positions')}
                    className={`min-h-[40px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      orgSubTab === 'positions'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Data Jabatan ({positions.length})
                  </button>
                </div>

                {orgSubTab === 'employees' ? (
                  <button
                    type="button"
                    onClick={openAddEmployee}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambah Karyawan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openAddPosition}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambah Jabatan</span>
                  </button>
                )}
              </div>

              {orgSubTab === 'employees' ? (
                <div className="rounded-2xl border border-slate-200 bg-white">
                  {/* Filter bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                    <div className="relative w-full max-w-xs">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        placeholder="Cari nama, kode, email, jabatan..."
                        className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <select
                      value={empStatusFilter}
                      onChange={(e) =>
                        setEmpStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
                      }
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                    >
                      <option value="all">Semua Status</option>
                      <option value="active">Aktif</option>
                      <option value="inactive">Nonaktif</option>
                    </select>
                  </div>

                  {filteredEmployees.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 text-sm font-bold text-slate-800">
                        Belum ada data karyawan yang sesuai
                      </p>
                      <button
                        type="button"
                        onClick={openAddEmployee}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Tambah Karyawan Pertama</span>
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                            <th className="px-4 py-3 font-semibold">Kode & Nama</th>
                            <th className="px-4 py-3 font-semibold">Jabatan & Dept</th>
                            <th className="px-4 py-3 font-semibold">Tgl Bergabung</th>
                            <th className="px-4 py-3 text-right font-semibold">Gaji / Hari</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredEmployees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <p className="font-bold text-slate-900">{emp.name}</p>
                                <p className="font-mono-tabular text-[11px] text-slate-500">
                                  {emp.employeeCode} · {formatLoginDisplay(emp.email)}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-800">{emp.positionTitle}</p>
                                <p className="text-[11px] text-slate-500">{emp.department}</p>
                              </td>
                              <td className="font-mono-tabular px-4 py-3 text-slate-700">
                                {formatDateDDMMMYYYY(emp.joinDate)}
                              </td>
                              <td className="font-mono-tabular px-4 py-3 text-right font-bold text-slate-900">
                                {formatRupiah(emp.dailyRate)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`font-bold ${
                                    emp.status === 'active' ? 'text-emerald-700' : 'text-slate-400'
                                  }`}
                                >
                                  {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <p className="text-[11px] text-slate-500">
                                  {emp.userId ? 'Akun Terhubung' : 'Belum Login'}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditEmployee(emp)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                                    aria-label={`Ubah ${emp.name}`}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEmployee(emp)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                                    aria-label={`Hapus ${emp.name}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* Data Jabatan Grid */
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {positions.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-10 text-center">
                      <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-2 text-sm font-bold text-slate-800">Belum ada jabatan</p>
                    </div>
                  ) : (
                    positions.map((pos) => (
                      <article
                        key={pos.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{pos.title}</h3>
                              <p className="text-xs text-slate-500">
                                {pos.department} · {pos.isActive ? 'Aktif' : 'Nonaktif'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditPosition(pos)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await deletePosition(pos.id);
                                  showToast('ok', `Jabatan ${pos.title} dihapus.`);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="mt-3 text-xs leading-relaxed text-slate-600">
                            {pos.description || 'Tidak ada deskripsi tambahan.'}
                          </p>
                        </div>
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <p className="text-[11px] text-slate-500">Tarif Harian Default</p>
                          <p className="font-mono-tabular text-base font-bold text-emerald-700">
                            {formatRupiah(pos.defaultDailyRate)} / hari
                          </p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HARI & JAM KERJA */}
          {activeTab === 'jadwal' && (
            <form onSubmit={handleSaveWorkSettings} className="max-w-3xl space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Pengaturan Hari & Jam Kerja Perusahaan
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Konfigurasi ini menjadi acuan otomatis untuk status Tepat Waktu / Terlambat saat karyawan Clock-In di Mobile PWA.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Nama Perusahaan
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={wsForm.companyName}
                      onChange={(e) => setWsForm({ ...wsForm, companyName: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Jam Masuk Standar (WIB)
                    </label>
                    <input
                      type="time"
                      required
                      value={wsForm.workStartTime}
                      onChange={(e) => setWsForm({ ...wsForm, workStartTime: e.target.value })}
                      className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Jam Pulang Standar (WIB)
                    </label>
                    <input
                      type="time"
                      required
                      value={wsForm.workEndTime}
                      onChange={(e) => setWsForm({ ...wsForm, workEndTime: e.target.value })}
                      className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Toleransi Keterlambatan (Menit)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      required
                      value={wsForm.lateToleranceMinutes}
                      onChange={(e) =>
                        setWsForm({ ...wsForm, lateToleranceMinutes: Number(e.target.value) })
                      }
                      className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Tarif Gaji Harian Default (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      required
                      value={wsForm.defaultDailyRate}
                      onChange={(e) =>
                        setWsForm({ ...wsForm, defaultDailyRate: Number(e.target.value) })
                      }
                      className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Working Days Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Hari Kerja Aktif
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WORKING_DAY_OPTIONS.map((d) => {
                      const active = wsForm.workingDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleWorkingDay(d.key)}
                          className={`min-h-[40px] rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Holidays List */}
                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-xs font-semibold text-slate-700">
                    Tanggal Libur Nasional / Cuti Bersama
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="date"
                      value={newHolidayInput}
                      onChange={(e) => setNewHolidayInput(e.target.value)}
                      className="min-h-[42px] rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addHoliday}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah Tanggal Libur</span>
                    </button>
                  </div>
                  {wsForm.holidays.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {wsForm.holidays.map((h) => (
                        <div
                          key={h}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800"
                        >
                          <span className="font-mono-tabular">{formatDateDDMMMYYYY(h)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setWsForm((prev) => ({
                                ...prev,
                                holidays: prev.holidays.filter((item) => item !== h),
                              }))
                            }
                            className="text-slate-400 hover:text-red-600"
                            aria-label={`Hapus ${h}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="submit"
                    disabled={savingWs}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    <span>{savingWs ? 'Menyimpan...' : 'Simpan Pengaturan Kerja'}</span>
                  </button>
                </div>
              </section>
            </form>
          )}

          {/* TAB 4: DATA KEHADIRAN */}
          {activeTab === 'kehadiran' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={attSearch}
                      onChange={(e) => setAttSearch(e.target.value)}
                      placeholder="Cari nama / kode..."
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <input
                    type="date"
                    value={attDateFilter}
                    onChange={(e) => setAttDateFilter(e.target.value)}
                    aria-label="Filter tanggal"
                    className="min-h-[40px] rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700"
                  />
                  {attDateFilter && (
                    <button
                      type="button"
                      onClick={() => setAttDateFilter('')}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Reset Tanggal
                    </button>
                  )}
                  <select
                    value={attStatusFilter}
                    onChange={(e) => setAttStatusFilter(e.target.value)}
                    className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                  >
                    <option value="all">Semua Status</option>
                    <option value="present">Hadir</option>
                    <option value="late">Terlambat</option>
                    <option value="leave">Izin</option>
                    <option value="absent">Alpa</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportAttendances}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span>Ekspor CSV</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white">
                {filteredAttendances.length === 0 ? (
                  <div className="p-12 text-center">
                    <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-800">
                      Tidak ada catatan kehadiran
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                          <th className="px-4 py-3 font-semibold">Tanggal</th>
                          <th className="px-4 py-3 font-semibold">Karyawan</th>
                          <th className="px-4 py-3 font-semibold">Selfie Masuk / Pulang</th>
                          <th className="px-4 py-3 font-semibold">Jam Kerja</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Verifikasi</th>
                          <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAttendances.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="font-mono-tabular px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                              {formatDateDDMMMYYYY(a.dateKey)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{a.employeeName}</p>
                              <p className="text-[11px] text-slate-500">
                                {a.employeeCode} · {a.positionTitle}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setInspectAttendance(a)}
                                className="inline-flex items-center gap-2 hover:opacity-80"
                              >
                                {a.clockInPhoto && (
                                  <img
                                    src={a.clockInPhoto}
                                    alt="In"
                                    className="h-9 w-9 rounded-lg border border-slate-200 object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                {a.clockOutPhoto && (
                                  <img
                                    src={a.clockOutPhoto}
                                    alt="Out"
                                    className="h-9 w-9 rounded-lg border border-slate-200 object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <span className="font-semibold text-emerald-700 underline">
                                  Detail
                                </span>
                              </button>
                            </td>
                            <td className="font-mono-tabular px-4 py-3 text-slate-700 whitespace-nowrap">
                              {formatTimeHHMM(a.clockInTime)} –{' '}
                              {a.clockOutTime ? formatTimeHHMM(a.clockOutTime) : '--:--'}
                              <p className="text-[11px] text-slate-500">
                                {formatDuration(a.workMinutes)}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-bold ${
                                  a.status === 'late'
                                    ? 'text-amber-600'
                                    : a.status === 'present'
                                      ? 'text-emerald-700'
                                      : 'text-red-600'
                                }`}
                              >
                                {translateAttendanceStatus(a.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  await adminUpdateAttendance(a.id, {
                                    status: a.status,
                                    verified: !a.verified,
                                  });
                                  showToast('ok', 'Status verifikasi diperbarui.');
                                }}
                                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                  a.verified ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-900'
                                }`}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{a.verified ? 'Terverifikasi' : 'Verifikasi'}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  await adminDeleteAttendance(a.id);
                                  showToast('ok', 'Catatan kehadiran dihapus.');
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                                aria-label="Hapus presensi"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PENGAJUAN CUTI */}
          {activeTab === 'cuti' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={leaveSearch}
                      onChange={(e) => setLeaveSearch(e.target.value)}
                      placeholder="Cari nama, kode, alasan..."
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <select
                    value={leaveStatusFilter}
                    onChange={(e) => setLeaveStatusFilter(e.target.value)}
                    className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportLeaveRequests}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span>Ekspor CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Menunggu Persetujuan</p>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold text-amber-600">
                    {pendingLeaveCount} pengajuan
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Disetujui</p>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold text-emerald-700">
                    {leaveRequests.filter((l) => l.status === 'approved').length} pengajuan
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Total Hari Cuti Disetujui</p>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold text-slate-900">
                    {leaveRequests
                      .filter((l) => l.status === 'approved')
                      .reduce((sum, l) => sum + (l.totalDays || 0), 0)}{' '}
                    hari
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white">
                {filteredLeaveRequests.length === 0 ? (
                  <div className="p-12 text-center">
                    <CalendarOff className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-800">
                      Belum ada pengajuan cuti karyawan
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Pengajuan cuti dari Mobile PWA Karyawan akan muncul di sini secara real-time.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                          <th className="px-4 py-3 font-semibold">Karyawan</th>
                          <th className="px-4 py-3 font-semibold">Jenis Cuti</th>
                          <th className="px-4 py-3 font-semibold">Tanggal Cuti</th>
                          <th className="px-4 py-3 text-right font-semibold">Durasi</th>
                          <th className="px-4 py-3 font-semibold">Alasan</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeaveRequests.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{l.employeeName}</p>
                              <p className="text-[11px] text-slate-500">
                                {l.employeeCode} · {l.positionTitle}
                              </p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                              {translateLeaveType(l.leaveType)}
                            </td>
                            <td className="font-mono-tabular px-4 py-3 text-slate-700 whitespace-nowrap">
                              {formatDateDDMMMYYYY(l.startDate)} – {formatDateDDMMMYYYY(l.endDate)}
                            </td>
                            <td className="font-mono-tabular px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                              {l.totalDays} hari
                            </td>
                            <td className="max-w-xs px-4 py-3 text-slate-600">
                              <p className="line-clamp-2">{l.reason}</p>
                              {l.reviewerNote && (
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  HR: {l.reviewerNote}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`font-bold ${
                                  l.status === 'approved'
                                    ? 'text-emerald-700'
                                    : l.status === 'rejected'
                                      ? 'text-red-600'
                                      : 'text-amber-600'
                                }`}
                              >
                                {translateLeaveStatus(l.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewingLeave(l);
                                    setReviewerNoteInput(l.reviewerNote || '');
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
                                >
                                  {l.status === 'pending' ? 'Proses' : 'Ubah'}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteLeaveRequest(l.id);
                                    showToast('ok', 'Data pengajuan cuti dihapus.');
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                                  aria-label="Hapus pengajuan cuti"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PAYROLL HARIAN */}
          {activeTab === 'payroll' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Payroll Harian ({formatMonthLabel(payrollMonth)})
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Rumus: <span className="font-semibold text-slate-700">Jumlah Hari Tercatat Masuk × Tarif Gaji Harian (Rp / hari) + Bonus - Potongan</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    aria-label="Pilih periode payroll"
                    className="min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={generatingPayroll}
                    onClick={handleApplyThirtyMillionRate}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 whitespace-nowrap"
                  >
                    <span>Set Tarif Rp 30.000.000/hari</span>
                  </button>
                  <button
                    type="button"
                    disabled={generatingPayroll}
                    onClick={handleGeneratePayroll}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap"
                  >
                    <RefreshCw className={`h-4 w-4 ${generatingPayroll ? 'animate-spin' : ''}`} />
                    <span>
                      {generatingPayroll ? 'Menghitung...' : 'Hitung & Sinkronkan Payroll'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPayrolls}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Download className="h-4 w-4" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </div>

              {/* Total Payroll Summary Strip */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Total Karyawan Terhitung</p>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold text-slate-900">
                    {filteredPayrolls.length} orang
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Sudah Dibayar</p>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold text-emerald-700">
                    {filteredPayrolls.filter((p) => p.status === 'paid').length} /{' '}
                    {filteredPayrolls.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Total Pengeluaran Payroll</p>
                  <p className="font-mono-tabular mt-1 text-xl font-bold text-slate-900 xl:text-2xl">
                    {formatRupiah(payrollMonthTotal)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white">
                {filteredPayrolls.length === 0 ? (
                  <div className="p-12 text-center">
                    <Wallet className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-800">
                      Belum ada data payroll untuk {formatMonthLabel(payrollMonth)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Klik tombol &ldquo;Hitung &amp; Sinkronkan Payroll&rdquo; untuk menghitung gaji otomatis dari data kehadiran harian.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                          <th className="px-4 py-3 font-semibold">Karyawan</th>
                          <th className="px-4 py-3 text-right font-semibold">Hari Masuk</th>
                          <th className="px-4 py-3 text-right font-semibold">Tarif / Hari</th>
                          <th className="px-4 py-3 text-right font-semibold">Bonus / Potongan</th>
                          <th className="px-4 py-3 text-right font-semibold">Total Gaji</th>
                          <th className="px-4 py-3 font-semibold">Status & Tgl Bayar</th>
                          <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPayrolls.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{p.employeeName}</p>
                              <p className="text-[11px] text-slate-500">
                                {p.employeeCode} · {p.positionTitle}
                              </p>
                            </td>
                            <td className="font-mono-tabular px-4 py-3 text-right font-bold text-slate-900">
                              {p.daysPresent} hari
                            </td>
                            <td className="font-mono-tabular px-4 py-3 text-right text-slate-700">
                              {formatRupiah(p.dailyRate)}
                            </td>
                            <td className="font-mono-tabular px-4 py-3 text-right text-slate-600">
                              +{formatRupiah(p.bonus)} / -{formatRupiah(p.deduction)}
                            </td>
                            <td className="font-mono-tabular px-4 py-3 text-right font-bold text-emerald-700">
                              {formatRupiah(p.totalAmount)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-bold ${
                                  p.status === 'paid' ? 'text-emerald-700' : 'text-amber-600'
                                }`}
                              >
                                {p.status === 'paid' ? 'Sudah Dibayar' : 'Pending'}
                              </span>
                              {p.paidDate && (
                                <p className="font-mono-tabular text-[11px] text-slate-500">
                                  {formatDateDDMMMYYYY(p.paidDate)}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {p.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await updatePayrollRecord(p, { status: 'paid' });
                                      showToast(
                                        'ok',
                                        `Payroll ${p.employeeName} ditandai Sudah Dibayar.`
                                      );
                                    }}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 whitespace-nowrap"
                                  >
                                    Bayar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPayroll(p);
                                    setPayrollEditForm({
                                      bonus: p.bonus,
                                      deduction: p.deduction,
                                      notes: p.notes,
                                    });
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                                  aria-label="Edit bonus/potongan"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deletePayrollRecord(p.id);
                                    showToast('ok', 'Data payroll dihapus.');
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                                  aria-label="Hapus payroll"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitEmployee}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingEmp ? 'Ubah Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Kode Karyawan</label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  value={empForm.employeeCode}
                  onChange={(e) => setEmpForm({ ...empForm, employeeCode: e.target.value })}
                  className="font-mono-tabular mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Tanggal Bergabung
                </label>
                <input
                  type="date"
                  required
                  value={empForm.joinDate}
                  onChange={(e) => setEmpForm({ ...empForm, joinDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className={editingEmp ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-700">
                  Username / Email Login Karyawan
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  disabled={Boolean(editingEmp)}
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value.trim() })}
                  placeholder="budi atau budi@perusahaan.id"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              {!editingEmp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Password / PIN Login (Min. 6 Karakter)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Jabatan</label>
                <select
                  value={empForm.positionId}
                  onChange={(e) => handleSelectPositionInEmpForm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  <option value="default">Pilih Jabatan...</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Departemen</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={empForm.department}
                  onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Tarif Gaji Harian (Rp / Hari)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={empForm.dailyRate}
                  onChange={(e) => setEmpForm({ ...empForm, dailyRate: Number(e.target.value) })}
                  className="font-mono-tabular mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={empForm.status}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, status: e.target.value as 'active' | 'inactive' })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">No. Telepon</label>
                <input
                  type="text"
                  maxLength={30}
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Bank & Rekening</label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="No. Rekening"
                  value={empForm.bankAccount}
                  onChange={(e) => setEmpForm({ ...empForm, bankAccount: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="min-h-[42px] rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingEmp}
                className="min-h-[42px] rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingEmp ? 'Menyimpan...' : 'Simpan Karyawan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD / EDIT POSITION */}
      {posModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitPosition}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingPos ? 'Ubah Jabatan' : 'Tambah Jabatan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setPosModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Nama Jabatan</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={posForm.title}
                  onChange={(e) => setPosForm({ ...posForm, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Departemen</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={posForm.department}
                  onChange={(e) => setPosForm({ ...posForm, department: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Tarif Gaji Harian Default (Rp / Hari)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={posForm.defaultDailyRate}
                  onChange={(e) =>
                    setPosForm({ ...posForm, defaultDailyRate: Number(e.target.value) })
                  }
                  className="font-mono-tabular mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Deskripsi</label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={posForm.description}
                  onChange={(e) => setPosForm({ ...posForm, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setPosModalOpen(false)}
                className="min-h-[42px] rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingPos}
                className="min-h-[42px] rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingPos ? 'Menyimpan...' : 'Simpan Jabatan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: INSPECT SELFIE & ATTENDANCE */}
      {inspectAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {inspectAttendance.employeeName}
                </h3>
                <p className="font-mono-tabular text-xs text-slate-500">
                  {formatDateDDMMMYYYY(inspectAttendance.dateKey)} · {inspectAttendance.employeeCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectAttendance(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Clock-In ({formatTimeHHMM(inspectAttendance.clockInTime)})
                </p>
                {inspectAttendance.clockInPhoto ? (
                  <img
                    src={inspectAttendance.clockInPhoto}
                    alt="Selfie Clock-In"
                    className="mt-1.5 aspect-square w-full rounded-2xl border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="mt-1.5 flex aspect-square items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-400">
                    Tidak ada foto
                  </div>
                )}
                {inspectAttendance.clockInNote && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Catatan: {inspectAttendance.clockInNote}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Clock-Out (
                  {inspectAttendance.clockOutTime
                    ? formatTimeHHMM(inspectAttendance.clockOutTime)
                    : '--:--'}
                  )
                </p>
                {inspectAttendance.clockOutPhoto ? (
                  <img
                    src={inspectAttendance.clockOutPhoto}
                    alt="Selfie Clock-Out"
                    className="mt-1.5 aspect-square w-full rounded-2xl border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="mt-1.5 flex aspect-square items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-400">
                    Belum Clock-Out
                  </div>
                )}
                {inspectAttendance.clockOutNote && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Catatan: {inspectAttendance.clockOutNote}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">Ubah Status:</label>
                <select
                  value={inspectAttendance.status}
                  onChange={async (e) => {
                    const nextStatus = e.target.value as AttendanceStatus;
                    await adminUpdateAttendance(inspectAttendance.id, {
                      status: nextStatus,
                      verified: true,
                    });
                    setInspectAttendance({
                      ...inspectAttendance,
                      status: nextStatus,
                      verified: true,
                    });
                    showToast('ok', 'Status kehadiran diperbarui.');
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="present">Hadir</option>
                  <option value="late">Terlambat</option>
                  <option value="leave">Izin</option>
                  <option value="absent">Alpa</option>
                </select>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await adminUpdateAttendance(inspectAttendance.id, {
                    status: inspectAttendance.status,
                    verified: true,
                  });
                  setInspectAttendance(null);
                  showToast('ok', 'Presensi diverifikasi.');
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Check className="h-4 w-4" />
                <span>Verifikasi & Tutup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PAYROLL BONUS / DEDUCTION */}
      {editingPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Penyesuaian Payroll — {editingPayroll.employeeName}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingPayroll.periodLabel} · {editingPayroll.daysPresent} hari ×{' '}
                  {formatRupiah(editingPayroll.dailyRate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayroll(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Tambahan / Bonus (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={payrollEditForm.bonus}
                  onChange={(e) =>
                    setPayrollEditForm({ ...payrollEditForm, bonus: Number(e.target.value) })
                  }
                  className="font-mono-tabular mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Potongan (Rp)</label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={payrollEditForm.deduction}
                  onChange={(e) =>
                    setPayrollEditForm({ ...payrollEditForm, deduction: Number(e.target.value) })
                  }
                  className="font-mono-tabular mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Catatan Slip</label>
                <input
                  type="text"
                  maxLength={250}
                  value={payrollEditForm.notes}
                  onChange={(e) =>
                    setPayrollEditForm({ ...payrollEditForm, notes: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <span className="text-slate-600">Total Gaji Bersih: </span>
                <span className="font-mono-tabular font-bold text-emerald-700">
                  {formatRupiah(
                    Math.max(
                      0,
                      editingPayroll.daysPresent * editingPayroll.dailyRate +
                        payrollEditForm.bonus -
                        payrollEditForm.deduction
                    )
                  )}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingPayroll(null)}
                className="min-h-[42px] rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updatePayrollRecord(editingPayroll, {
                    bonus: payrollEditForm.bonus,
                    deduction: payrollEditForm.deduction,
                    notes: payrollEditForm.notes,
                  });
                  setEditingPayroll(null);
                  showToast('ok', 'Nominal payroll diperbarui.');
                }}
                className="min-h-[42px] rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW LEAVE REQUEST */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Proses Pengajuan Cuti — {reviewingLeave.employeeName}
                </h3>
                <p className="font-mono-tabular mt-0.5 text-xs text-slate-500">
                  {translateLeaveType(reviewingLeave.leaveType)} ·{' '}
                  {formatDateDDMMMYYYY(reviewingLeave.startDate)} –{' '}
                  {formatDateDDMMMYYYY(reviewingLeave.endDate)} ({reviewingLeave.totalDays} hari)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingLeave(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">Alasan Karyawan</p>
                <p className="mt-1 leading-relaxed text-slate-800">{reviewingLeave.reason}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Catatan HRD (Opsional)
                </label>
                <textarea
                  rows={2}
                  maxLength={250}
                  value={reviewerNoteInput}
                  onChange={(e) => setReviewerNoteInput(e.target.value)}
                  placeholder="Contoh: Disetujui, mohon serah terima tugas sebelum cuti."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={savingLeaveReview}
                onClick={() => handleReviewLeave('rejected')}
                className="min-h-[42px] rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                Tolak
              </button>
              <button
                type="button"
                disabled={savingLeaveReview}
                onClick={() => handleReviewLeave('approved')}
                className="min-h-[42px] rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingLeaveReview ? 'Memproses...' : 'Setujui Cuti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
