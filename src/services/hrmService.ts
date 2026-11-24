import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, getSecondaryAuth, handleFirestoreError, OperationType } from '../firebase';
import {
  Attendance,
  AttendanceStatus,
  Employee,
  LeaveStatus,
  LeaveType,
  Payroll,
  PayrollStatus,
  Position,
  WorkSetting,
} from '../types/hrm';
import {
  calculateInclusiveDays,
  evaluateClockInStatus,
  formatMonthLabel,
  getMonthRange,
  normalizeLoginIdentifier,
  toDateKey,
} from '../utils/formatters';

function clip(val: string | undefined | null, maxLen: number): string {
  return (val ?? '').trim().slice(0, maxLen);
}

function safeNum(val: number | undefined | null, min = 0, max = 1000000000): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function bootstrapAdminAccount(user: User, adminName: string): Promise<void> {
  const metaRef = doc(db, 'admins_meta', 'initialized');
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists()) {
    throw new Error(
      'Akun Administrator utama sudah diaktifkan sebelumnya. Silakan masuk melalui tab Masuk Admin.'
    );
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'admins', user.uid), {
    userId: clip(user.uid, 128),
    email: clip(user.email || '', 160),
    name: clip(adminName || user.displayName || 'HR Administrator', 100),
    createdAt: serverTimestamp(),
  });
  batch.set(metaRef, {
    adminUid: clip(user.uid, 128),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'admins_meta/initialized');
  }
}

export async function seedInitialWorkspaceIfNeeded(adminUser: User): Promise<void> {
  try {
    const wsRef = doc(db, 'work_settings', 'default');
    const wsSnap = await getDoc(wsRef);
    let defaultRate = 30000000;

    if (!wsSnap.exists()) {
      await setDoc(wsRef, {
        companyName: 'PT Nusa Digital Karya',
        workStartTime: '08:00',
        workEndTime: '17:00',
        lateToleranceMinutes: 15,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        holidays: [],
        defaultDailyRate: 30000000,
        updatedBy: clip(adminUser.uid, 128),
        updatedAt: serverTimestamp(),
      });
    } else {
      defaultRate = Number(wsSnap.data()?.defaultDailyRate ?? 30000000);
    }

    const posSnap = await getDocs(query(collection(db, 'positions'), limit(1)));
    let defaultPosition: { id: string; title: string; department: string; rate: number } = {
      id: 'pos_default',
      title: 'HR & Operations Lead',
      department: 'People & Operations',
      rate: defaultRate,
    };

    if (posSnap.empty) {
      const starterPositions = [
        {
          title: 'Software Engineer',
          department: 'Engineering',
          defaultDailyRate: 30000000,
          description: 'Pengembangan sistem aplikasi web, mobile, dan API perusahaan.',
          isActive: true,
        },
        {
          title: 'Product Designer',
          department: 'Design',
          defaultDailyRate: 30000000,
          description: 'Perancangan pengalaman pengguna dan antarmuka produk digital.',
          isActive: true,
        },
        {
          title: 'HR & Finance Officer',
          department: 'People & Finance',
          defaultDailyRate: 30000000,
          description: 'Pengelolaan administrasi SDM, presensi, dan penggajian harian.',
          isActive: true,
        },
        {
          title: 'Operations Specialist',
          department: 'Operations',
          defaultDailyRate: 30000000,
          description: 'Operasional harian lapangan dan koordinasi tim layanan.',
          isActive: true,
        },
      ];
      for (let i = 0; i < starterPositions.length; i++) {
        const p = starterPositions[i];
        const created = await addDoc(collection(db, 'positions'), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (i === 2) {
          defaultPosition = {
            id: created.id,
            title: p.title,
            department: p.department,
            rate: p.defaultDailyRate,
          };
        }
      }
    }

    const empQuery = query(collection(db, 'employees'), where('userId', '==', adminUser.uid));
    const empSnap = await getDocs(empQuery);
    if (empSnap.empty) {
      await addDoc(collection(db, 'employees'), {
        employeeCode: 'EMP-001',
        userId: clip(adminUser.uid, 128),
        name: clip(adminUser.displayName || 'HR Administrator', 100),
        email: clip(adminUser.email || 'admin@nusahr.id', 160),
        phone: '0812-0000-0001',
        address: 'Jakarta Selatan',
        positionId: clip(defaultPosition.id, 128),
        positionTitle: clip(defaultPosition.title, 80),
        department: clip(defaultPosition.department, 80),
        dailyRate: safeNum(defaultPosition.rate),
        joinDate: toDateKey(new Date()),
        status: 'active',
        role: 'admin',
        avatarUrl: '',
        bankName: 'BCA',
        bankAccount: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Seed starter employee account (username: karyawan, pass: karyawan123) if not present
    const starterEmpSnap = await getDocs(
      query(collection(db, 'employees'), where('email', '==', 'karyawan@nusahr.id'))
    );
    if (starterEmpSnap.empty) {
      const secondaryAuth = getSecondaryAuth();
      let starterUid = '';
      try {
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          'karyawan@nusahr.id',
          'karyawan123'
        );
        await updateProfile(cred.user, { displayName: 'Budi Santoso' });
        starterUid = cred.user.uid;
      } catch {
        // Account may already exist in Auth; employee will still see it on login
      } finally {
        await firebaseSignOut(secondaryAuth).catch(() => {});
      }

      if (starterUid) {
        await addDoc(collection(db, 'employees'), {
          employeeCode: 'EMP-002',
          userId: clip(starterUid, 128),
          name: 'Budi Santoso',
          email: 'karyawan@nusahr.id',
          phone: '0813-8800-1122',
          address: 'Jakarta Pusat',
          positionId: clip(defaultPosition.id, 128),
          positionTitle: 'Product Designer',
          department: 'Design',
          dailyRate: 30000000,
          joinDate: toDateKey(new Date()),
          status: 'active',
          role: 'employee',
          avatarUrl: '',
          bankName: 'Mandiri',
          bankAccount: '124000998811',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'work_settings/default');
  }
}

export async function ensureEmployeeProfile(
  user: User,
  workSetting: WorkSetting | null,
  preferredName?: string
): Promise<Employee | null> {
  const path = 'employees';
  try {
    const q = query(collection(db, path), where('userId', '==', user.uid));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const existingDoc = snap.docs[0];
      return { id: existingDoc.id, ...(existingDoc.data() as Omit<Employee, 'id'>) };
    }

    const rate = workSetting ? safeNum(workSetting.defaultDailyRate) : 30000000;
    const code = `EMP-${user.uid.slice(0, 4).toUpperCase()}`;
    const loginEmail = user.email || `${user.uid}@nusahr.id`;
    const payload = {
      employeeCode: clip(code, 32),
      userId: clip(user.uid, 128),
      name: clip(preferredName || user.displayName || loginEmail.split('@')[0], 100),
      email: clip(loginEmail, 160),
      phone: '',
      address: '',
      positionId: 'default',
      positionTitle: 'Staff Karyawan',
      department: 'Operasional',
      dailyRate: rate,
      joinDate: toDateKey(new Date()),
      status: 'active' as const,
      role: 'employee' as const,
      avatarUrl: '',
      bankName: '',
      bankAccount: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, path), payload);
    return {
      id: ref.id,
      ...payload,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveWorkSettings(
  data: Omit<WorkSetting, 'id' | 'updatedAt'>
): Promise<void> {
  const path = 'work_settings/default';
  try {
    await setDoc(doc(db, 'work_settings', 'default'), {
      companyName: clip(data.companyName, 100) || 'Perusahaan',
      workStartTime: clip(data.workStartTime, 5) || '08:00',
      workEndTime: clip(data.workEndTime, 5) || '17:00',
      lateToleranceMinutes: safeNum(data.lateToleranceMinutes, 0, 180),
      workingDays: data.workingDays.slice(0, 7),
      holidays: data.holidays.slice(0, 60),
      defaultDailyRate: safeNum(data.defaultDailyRate),
      updatedBy: clip(data.updatedBy, 128),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertPosition(
  id: string | null,
  data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const path = id ? `positions/${id}` : 'positions';
  try {
    const sanitized = {
      title: clip(data.title, 80),
      department: clip(data.department, 80),
      defaultDailyRate: safeNum(data.defaultDailyRate),
      description: clip(data.description, 300),
      isActive: Boolean(data.isActive),
      updatedAt: serverTimestamp(),
    };
    if (id) {
      await updateDoc(doc(db, 'positions', id), sanitized);
    } else {
      await addDoc(collection(db, 'positions'), {
        ...sanitized,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deletePosition(id: string): Promise<void> {
  const path = `positions/${id}`;
  try {
    await deleteDoc(doc(db, 'positions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createEmployeeWithCredentials(
  data: Omit<Employee, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  password: string
): Promise<void> {
  const normalizedEmail = normalizeLoginIdentifier(data.email);
  if (!normalizedEmail) {
    throw new Error('Username / Email login wajib diisi.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password / PIN login minimal 6 karakter.');
  }

  const secondaryAuth = getSecondaryAuth();
  let newUid = '';
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
    await updateProfile(cred.user, { displayName: clip(data.name, 100) });
    newUid = cred.user.uid;
  } finally {
    await firebaseSignOut(secondaryAuth).catch(() => {});
  }

  await upsertEmployee(null, {
    ...data,
    email: normalizedEmail,
    userId: newUid,
  });
}

export async function upsertEmployee(
  id: string | null,
  data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const path = id ? `employees/${id}` : 'employees';
  try {
    const normalizedEmail = normalizeLoginIdentifier(data.email) || data.email;
    const sanitized = {
      employeeCode: clip(data.employeeCode, 32),
      userId: clip(data.userId, 128),
      name: clip(data.name, 100),
      email: clip(normalizedEmail, 160),
      phone: clip(data.phone, 30),
      address: clip(data.address, 250),
      positionId: clip(data.positionId, 128),
      positionTitle: clip(data.positionTitle, 80),
      department: clip(data.department, 80),
      dailyRate: safeNum(data.dailyRate),
      joinDate: clip(data.joinDate, 20) || toDateKey(new Date()),
      status: data.status === 'inactive' ? 'inactive' : 'active',
      role: data.role === 'admin' ? 'admin' : 'employee',
      avatarUrl: clip(data.avatarUrl, 500),
      bankName: clip(data.bankName, 60),
      bankAccount: clip(data.bankAccount, 40),
      updatedAt: serverTimestamp(),
    };
    if (id) {
      await updateDoc(doc(db, 'employees', id), sanitized);
    } else {
      await addDoc(collection(db, 'employees'), {
        ...sanitized,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function updateOwnProfile(
  employeeId: string,
  updates: { phone: string; address: string; bankName: string; bankAccount: string }
): Promise<void> {
  const path = `employees/${employeeId}`;
  try {
    await updateDoc(doc(db, 'employees', employeeId), {
      phone: clip(updates.phone, 30),
      address: clip(updates.address, 250),
      bankName: clip(updates.bankName, 60),
      bankAccount: clip(updates.bankAccount, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const path = `employees/${id}`;
  try {
    await deleteDoc(doc(db, 'employees', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clockInEmployee(
  employee: Employee,
  photoDataUrl: string,
  note: string,
  workSetting: WorkSetting | null
): Promise<void> {
  const path = 'attendances';
  try {
    const now = new Date();
    const dateKey = toDateKey(now);
    const status = evaluateClockInStatus(
      now,
      workSetting?.workStartTime ?? '08:00',
      workSetting?.lateToleranceMinutes ?? 15
    );

    await addDoc(collection(db, path), {
      employeeId: clip(employee.id, 128),
      userId: clip(employee.userId, 128),
      employeeName: clip(employee.name, 100),
      employeeEmail: clip(employee.email, 160),
      employeeCode: clip(employee.employeeCode, 32),
      positionTitle: clip(employee.positionTitle, 80),
      dateKey,
      clockInTime: now.toISOString(),
      clockOutTime: '',
      clockInPhoto: photoDataUrl.slice(0, 180000),
      clockOutPhoto: '',
      clockInNote: clip(note, 200),
      clockOutNote: '',
      status,
      workMinutes: 0,
      dailyRateSnapshot: safeNum(employee.dailyRate),
      verified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function clockOutEmployee(
  attendance: Attendance,
  photoDataUrl: string,
  note: string
): Promise<void> {
  const path = `attendances/${attendance.id}`;
  try {
    const now = new Date();
    const inDate = new Date(attendance.clockInTime);
    const diffMins = Number.isNaN(inDate.getTime())
      ? 0
      : Math.max(1, Math.min(1440, Math.round((now.getTime() - inDate.getTime()) / 60000)));

    await updateDoc(doc(db, 'attendances', attendance.id), {
      clockOutTime: now.toISOString(),
      clockOutPhoto: photoDataUrl.slice(0, 180000),
      clockOutNote: clip(note, 200),
      workMinutes: diffMins,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateAttendance(
  id: string,
  updates: { status: AttendanceStatus; verified: boolean; clockInNote?: string }
): Promise<void> {
  const path = `attendances/${id}`;
  try {
    const payload: Record<string, unknown> = {
      status: updates.status,
      verified: Boolean(updates.verified),
      updatedAt: serverTimestamp(),
    };
    if (updates.clockInNote !== undefined) {
      payload.clockInNote = clip(updates.clockInNote, 200);
    }
    await updateDoc(doc(db, 'attendances', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminDeleteAttendance(id: string): Promise<void> {
  const path = `attendances/${id}`;
  try {
    await deleteDoc(doc(db, 'attendances', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function generateMonthlyPayrolls(
  periodKey: string,
  employees: Employee[],
  attendances: Attendance[],
  existingPayrolls: Payroll[]
): Promise<number> {
  const path = 'payrolls';
  const { start, end } = getMonthRange(periodKey);
  const periodLabel = formatMonthLabel(periodKey);
  let count = 0;

  try {
    const activeEmployees = employees.filter((e) => e.status === 'active');

    for (const emp of activeEmployees) {
      const empAttendances = attendances.filter(
        (a) =>
          (a.employeeId === emp.id || a.userId === emp.userId) &&
          a.dateKey >= start &&
          a.dateKey <= end &&
          (a.status === 'present' || a.status === 'late')
      );

      const uniqueDates = new Set(empAttendances.map((a) => a.dateKey));
      const daysPresent = Math.min(31, uniqueDates.size);
      const daysLate = Math.min(
        31,
        empAttendances.filter((a) => a.status === 'late').length
      );
      const dailyRate = safeNum(emp.dailyRate);

      const existing = existingPayrolls.find(
        (p) => p.employeeId === emp.id && p.periodKey === periodKey
      );

      if (existing) {
        if (existing.status === 'paid') continue;
        const totalAmount = Math.max(0, daysPresent * dailyRate + existing.bonus - existing.deduction);
        await updateDoc(doc(db, path, existing.id), {
          userId: clip(emp.userId, 128),
          employeeEmail: clip(emp.email, 160),
          employeeName: clip(emp.name, 100),
          employeeCode: clip(emp.employeeCode, 32),
          positionTitle: clip(emp.positionTitle, 80),
          daysPresent,
          daysLate,
          dailyRate,
          totalAmount,
          notes: existing.notes?.startsWith('Perhitungan otomatis')
            ? `Perhitungan otomatis ${daysPresent} hari masuk × Rp ${dailyRate.toLocaleString('id-ID')}/hari`
            : clip(existing.notes, 250),
          updatedAt: serverTimestamp(),
        });
        count++;
      } else {
        const totalAmount = Math.max(0, daysPresent * dailyRate);
        await addDoc(collection(db, path), {
          employeeId: clip(emp.id, 128),
          userId: clip(emp.userId, 128),
          employeeEmail: clip(emp.email, 160),
          employeeName: clip(emp.name, 100),
          employeeCode: clip(emp.employeeCode, 32),
          positionTitle: clip(emp.positionTitle, 80),
          periodKey: clip(periodKey, 20),
          periodLabel: clip(periodLabel, 60),
          periodStart: start,
          periodEnd: end,
          daysPresent,
          daysLate,
          dailyRate,
          bonus: 0,
          deduction: 0,
          totalAmount,
          status: 'pending' as PayrollStatus,
          paidDate: '',
          notes: `Perhitungan otomatis ${daysPresent} hari masuk × Rp ${dailyRate.toLocaleString('id-ID')}/hari`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        count++;
      }
    }
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updatePayrollRecord(
  payroll: Payroll,
  updates: { bonus?: number; deduction?: number; status?: PayrollStatus; notes?: string }
): Promise<void> {
  const path = `payrolls/${payroll.id}`;
  try {
    const bonus = updates.bonus !== undefined ? safeNum(updates.bonus) : payroll.bonus;
    const deduction = updates.deduction !== undefined ? safeNum(updates.deduction) : payroll.deduction;
    const status = updates.status ?? payroll.status;
    const totalAmount = Math.max(0, payroll.daysPresent * payroll.dailyRate + bonus - deduction);
    const paidDate = status === 'paid' ? (payroll.paidDate || toDateKey(new Date())) : '';

    await updateDoc(doc(db, 'payrolls', payroll.id), {
      bonus,
      deduction,
      totalAmount,
      status,
      paidDate,
      notes: clip(updates.notes !== undefined ? updates.notes : payroll.notes, 250),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePayrollRecord(id: string): Promise<void> {
  const path = `payrolls/${id}`;
  try {
    await deleteDoc(doc(db, 'payrolls', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function applyDailyRateToAll(
  rate: number,
  employees: Employee[],
  positions: Position[],
  workSetting: WorkSetting | null,
  adminUid: string
): Promise<void> {
  const sanitizedRate = safeNum(rate);
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'work_settings', 'default'), {
      companyName: clip(workSetting?.companyName, 100) || 'PT Nusa Digital Karya',
      workStartTime: clip(workSetting?.workStartTime, 5) || '08:00',
      workEndTime: clip(workSetting?.workEndTime, 5) || '17:00',
      lateToleranceMinutes: safeNum(workSetting?.lateToleranceMinutes ?? 15, 0, 180),
      workingDays: (workSetting?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']).slice(0, 7),
      holidays: (workSetting?.holidays || []).slice(0, 60),
      defaultDailyRate: sanitizedRate,
      updatedBy: clip(adminUid, 128),
      updatedAt: serverTimestamp(),
    });

    for (const pos of positions) {
      batch.update(doc(db, 'positions', pos.id), {
        defaultDailyRate: sanitizedRate,
        updatedAt: serverTimestamp(),
      });
    }

    for (const emp of employees) {
      batch.update(doc(db, 'employees', emp.id), {
        dailyRate: sanitizedRate,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'employees');
  }
}

export async function submitLeaveRequest(
  employee: Employee,
  input: {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }
): Promise<void> {
  const path = 'leave_requests';
  const totalDays = calculateInclusiveDays(input.startDate, input.endDate);
  if (totalDays < 1 || totalDays > 60) {
    throw new Error('Rentang tanggal cuti tidak valid (minimal 1 hari, maksimal 60 hari).');
  }
  const cleanReason = clip(input.reason, 300);
  if (!cleanReason) {
    throw new Error('Alasan pengajuan cuti wajib diisi.');
  }

  try {
    await addDoc(collection(db, path), {
      employeeId: clip(employee.id, 128),
      userId: clip(employee.userId, 128),
      employeeName: clip(employee.name, 100),
      employeeEmail: clip(employee.email, 160),
      employeeCode: clip(employee.employeeCode, 32),
      positionTitle: clip(employee.positionTitle, 80),
      leaveType: input.leaveType,
      startDate: clip(input.startDate, 10),
      endDate: clip(input.endDate, 10),
      totalDays,
      reason: cleanReason,
      status: 'pending' as LeaveStatus,
      reviewerNote: '',
      reviewedBy: '',
      reviewedAt: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function reviewLeaveRequest(
  leaveId: string,
  status: 'approved' | 'rejected',
  reviewerNote: string,
  adminUid: string
): Promise<void> {
  const path = `leave_requests/${leaveId}`;
  try {
    await updateDoc(doc(db, 'leave_requests', leaveId), {
      status,
      reviewerNote: clip(reviewerNote, 250),
      reviewedBy: clip(adminUid, 128),
      reviewedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteLeaveRequest(leaveId: string): Promise<void> {
  const path = `leave_requests/${leaveId}`;
  try {
    await deleteDoc(doc(db, 'leave_requests', leaveId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
