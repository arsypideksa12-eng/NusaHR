import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { BackofficeApp } from './components/BackofficeApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginView } from './components/LoginView';
import { MobileEmployeeApp } from './components/MobileEmployeeApp';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  bootstrapAdminAccount,
  checkIsAdmin,
  ensureEmployeeProfile,
  seedInitialWorkspaceIfNeeded,
} from './services/hrmService';
import {
  AppPortalMode,
  Attendance,
  Employee,
  Payroll,
  Position,
  WorkSetting,
} from './types/hrm';
import { normalizeLoginIdentifier } from './utils/formatters';

function mapFirebaseAuthError(err: unknown): { message: string; needsProvider: boolean } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('auth/operation-not-allowed') || raw.includes('auth/admin-restricted-operation')) {
    return {
      message:
        'Provider Email/Password belum diaktifkan di proyek Firebase Anda.',
      needsProvider: true,
    };
  }
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('auth/user-not-found')) {
    return {
      message: 'Username/Email atau Password tidak sesuai. Jika baru pertama kali menggunakan Backoffice, pilih tab Aktivasi Admin Baru.',
      needsProvider: false,
    };
  }
  if (raw.includes('auth/email-already-in-use')) {
    return {
      message: 'Username atau Email ini sudah terdaftar. Silakan masuk melalui tab Masuk.',
      needsProvider: false,
    };
  }
  if (raw.includes('auth/weak-password')) {
    return {
      message: 'Password terlalu singkat. Gunakan minimal 6 karakter.',
      needsProvider: false,
    };
  }
  if (raw.includes('auth/invalid-email')) {
    return {
      message: 'Format Username atau Email tidak valid. Gunakan huruf/angka tanpa spasi.',
      needsProvider: false,
    };
  }
  return { message: raw, needsProvider: false };
}

function AppShell() {
  const [portalMode, setPortalMode] = useState<AppPortalMode>(() => {
    try {
      const saved = localStorage.getItem('nusahr_portal_mode');
      return saved === 'backoffice' ? 'backoffice' : 'employee';
    } catch {
      return 'employee';
    }
  });

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [needsProviderActivation, setNeedsProviderActivation] = useState(false);

  const [workSetting, setWorkSetting] = useState<WorkSetting | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  const handleChangePortalMode = (mode: AppPortalMode) => {
    setPortalMode(mode);
    setAuthError('');
    setNeedsProviderActivation(false);
    try {
      localStorage.setItem('nusahr_portal_mode', mode);
    } catch {
      // ignore storage errors
    }
  };

  const syncUserSession = async (firebaseUser: User, preferredName?: string) => {
    const adminStatus = await checkIsAdmin(firebaseUser);
    setIsAdmin(adminStatus);

    if (adminStatus) {
      await seedInitialWorkspaceIfNeeded(firebaseUser);
    }

    let ws: WorkSetting | null = null;
    try {
      const wsSnap = await getDoc(doc(db, 'work_settings', 'default'));
      if (wsSnap.exists()) {
        ws = { id: wsSnap.id, ...(wsSnap.data() as Omit<WorkSetting, 'id'>) };
      }
    } catch {
      // ignore if settings not yet created
    }

    const emp = await ensureEmployeeProfile(firebaseUser, ws, preferredName);
    setCurrentEmployee(emp);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
        setCurrentEmployee(null);
        setProfileReady(false);
        setAuthReady(true);
        return;
      }

      setUser(firebaseUser);
      setProfileReady(false);
      try {
        await syncUserSession(firebaseUser);
      } catch (err) {
        setAuthError(
          err instanceof Error ? err.message : 'Gagal memuat profil dari database online.'
        );
      } finally {
        setProfileReady(true);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Attach real-time Firestore listeners only after auth + profile initialization
  useEffect(() => {
    if (!authReady || !user || !profileReady) return;

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'work_settings', 'default'),
        (snap) => {
          if (snap.exists()) {
            setWorkSetting({ id: snap.id, ...(snap.data() as Omit<WorkSetting, 'id'>) });
          } else {
            setWorkSetting(null);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'work_settings/default')
      )
    );

    const posRef = isAdmin
      ? collection(db, 'positions')
      : query(collection(db, 'positions'), where('isActive', '==', true));
    unsubs.push(
      onSnapshot(
        posRef,
        (snap) => {
          setPositions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Position, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'positions')
      )
    );

    const empRef = isAdmin
      ? collection(db, 'employees')
      : query(collection(db, 'employees'), where('userId', '==', user.uid));
    unsubs.push(
      onSnapshot(
        empRef,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Employee, 'id'>) }));
          setEmployees(list);
          const mine = list.find((e) => e.userId === user.uid);
          if (mine) setCurrentEmployee(mine);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'employees')
      )
    );

    const attRef = isAdmin
      ? collection(db, 'attendances')
      : query(collection(db, 'attendances'), where('userId', '==', user.uid));
    unsubs.push(
      onSnapshot(
        attRef,
        (snap) => {
          setAttendances(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Attendance, 'id'>) }))
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'attendances')
      )
    );

    const payRef = isAdmin
      ? collection(db, 'payrolls')
      : query(collection(db, 'payrolls'), where('userId', '==', user.uid));
    unsubs.push(
      onSnapshot(
        payRef,
        (snap) => {
          setPayrolls(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Payroll, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'payrolls')
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, user, profileReady, isAdmin]);

  const handleLogin = async (identifier: string, password: string) => {
    setAuthError('');
    setNeedsProviderActivation(false);
    const normalizedEmail = normalizeLoginIdentifier(identifier);
    if (!normalizedEmail) {
      setAuthError('Masukkan Username atau Email Anda.');
      return;
    }

    const isStarterAdmin =
      normalizedEmail === 'admin@nusahr.id' && password === 'admin123';
    const isStarterEmployee =
      normalizedEmail === 'karyawan@nusahr.id' && password === 'karyawan123';

    setLoginLoading(true);
    try {
      let signedUser: User;
      try {
        const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        signedUser = cred.user;
      } catch (signInErr) {
        const errText = signInErr instanceof Error ? signInErr.message : String(signInErr);
        const canAutoProvision =
          (isStarterAdmin || isStarterEmployee) &&
          (errText.includes('auth/user-not-found') || errText.includes('auth/invalid-credential'));

        if (!canAutoProvision) {
          throw signInErr;
        }

        const created = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        const displayName = isStarterAdmin ? 'HR Administrator' : 'Budi Santoso';
        await updateProfile(created.user, { displayName });
        if (isStarterAdmin) {
          await bootstrapAdminAccount(created.user, displayName);
        }
        await syncUserSession(created.user, displayName);
        setProfileReady(true);
        signedUser = created.user;
      }

      if (portalMode === 'backoffice') {
        let adminOk = await checkIsAdmin(signedUser);
        if (!adminOk && isStarterAdmin) {
          try {
            await bootstrapAdminAccount(signedUser, 'HR Administrator');
            await syncUserSession(signedUser, 'HR Administrator');
            adminOk = true;
          } catch {
            // admins_meta/initialized already exists
          }
        }
        if (!adminOk) {
          setAuthError(
            `Akun ${identifier} terdaftar sebagai Karyawan, bukan Administrator Backoffice.`
          );
        }
      }
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setAuthError(mapped.message);
      setNeedsProviderActivation(mapped.needsProvider);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (name: string, identifier: string, password: string) => {
    setAuthError('');
    setNeedsProviderActivation(false);
    const normalizedEmail = normalizeLoginIdentifier(identifier);
    if (!normalizedEmail) {
      setAuthError('Masukkan Username atau Email yang valid.');
      return;
    }

    setLoginLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await updateProfile(cred.user, { displayName: name.trim() });

      if (portalMode === 'backoffice') {
        await bootstrapAdminAccount(cred.user, name.trim());
      }
      await syncUserSession(cred.user, name.trim());
      setProfileReady(true);
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setAuthError(mapped.message);
      setNeedsProviderActivation(mapped.needsProvider);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthError('');
    setNeedsProviderActivation(false);
    await signOut(auth);
  };

  if (!authReady || (user && !profileReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <img
            src="/icon.svg"
            alt="NusaHR"
            className="mx-auto h-12 w-12 rounded-2xl"
            referrerPolicy="no-referrer"
          />
          <p className="mt-4 text-sm font-bold text-slate-900">Menghubungkan ke Database Online...</p>
          <p className="mt-1 text-xs text-slate-500">Menyinkronkan data presensi &amp; payroll</p>
        </div>
      </div>
    );
  }

  if (!user || (portalMode === 'backoffice' && !isAdmin)) {
    const displayedError =
      user && portalMode === 'backoffice' && !isAdmin
        ? `Akun ${user.email} tidak memiliki izin Administrator Backoffice. Silakan beralih ke Mobile App Karyawan.`
        : authError;

    return (
      <>
        <LoginView
          portalMode={portalMode}
          onChangePortalMode={handleChangePortalMode}
          onLogin={handleLogin}
          onRegister={handleRegister}
          isLoading={loginLoading}
          authError={displayedError}
          needsProviderActivation={needsProviderActivation}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (portalMode === 'backoffice' && isAdmin) {
    return (
      <>
        <BackofficeApp
          currentUser={user}
          workSetting={workSetting}
          positions={positions}
          employees={employees}
          attendances={attendances}
          payrolls={payrolls}
          onSwitchToEmployeeApp={() => handleChangePortalMode('employee')}
          onLogout={handleLogout}
        />
        <OfflineIndicator />
      </>
    );
  }

  const myAttendances = attendances.filter((a) => a.userId === user.uid);
  const myPayrolls = payrolls.filter((p) => p.userId === user.uid);

  if (!currentEmployee) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm font-bold text-slate-900">Profil Karyawan Belum Tersedia</p>
          <p className="mt-2 text-xs text-slate-600">
            Hubungi administrator HR Anda untuk mengaktifkan akun Anda.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobileEmployeeApp
        employee={currentEmployee}
        workSetting={workSetting}
        attendances={myAttendances}
        payrolls={myPayrolls}
        isAdmin={isAdmin}
        onSwitchToBackoffice={() => handleChangePortalMode('backoffice')}
        onLogout={handleLogout}
      />
      <OfflineIndicator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
