# Security Specification — HRM Backoffice & Mobile PWA

## 1. Data Invariants
1. **Admin Authority**: Only the bootstrapped admin (`pideksaarsy1206@gmail.com` with `email_verified == true`) or UIDs present in `/admins/{uid}` may manage master records (`positions`, `work_settings`, `employees`, `payrolls`) or edit verified attendance records.
2. **PII Isolation**: Employee records (`/employees/{employeeId}`) contain PII (`email`, `phone`, `address`, `bankAccount`). Non-admin users may only `get` or `list` records matching their verified `request.auth.uid` or `request.auth.token.email`.
3. **Self-Registration Guard**: Unlisted employees signing in via Google may only create their own profile with `role == 'employee'` and `userId == request.auth.uid` and `email == request.auth.token.email`—never self-escalating to `role == 'admin'`.
4. **Attendance Integrity & Terminal Lock**: Employees can only create an attendance record for their own `userId` and verified `employeeEmail`, must reference an existing `employees/{employeeId}`, and may only update their record once to submit `clockOutTime` while `clockOutTime == ""` (terminal lock once clocked out; only admins may override).
5. **Payroll Authority**: Payroll calculations and payment status updates (`pending` -> `paid`) are strictly admin-only. Employees can only read their own payroll records.
6. **Temporal Integrity**: `createdAt` and `updatedAt` are strictly validated against `request.time`; `createdAt` is immutable on update.
7. **Size & Type Boundaries**: Every string has strict `.size()` caps, IDs match `^[a-zA-Z0-9_-]+$`, selfie photos are capped at 180,000 chars, and shadow fields are blocked via `keys().hasOnly(...)`.

## 2. "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: User with `email: "pideksaarsy1206@gmail.com"` and `email_verified: false` tries to write `/work_settings/default`.
2. **Self-Admin Escalation**: Employee creates `/employees/emp_hack` with `role: "admin"` and `userId: request.auth.uid`.
3. **Cross-Employee PII Read**: Employee A calls `get(/employees/emp_B)` or `list(/employees)` without matching `email` or `userId`.
4. **Shadow Field Injection on Employee**: Employee creates `/employees/emp_1` including extra field `isSuperAdmin: true`.
5. **Orphan Attendance Write**: Employee creates `/attendances/att_1` referencing a non-existent `employeeId: "fake_emp"`.
6. **Attendance Identity Spoof**: Employee A creates `/attendances/att_1` with `userId: "other_uid"`.
7. **Clock-Out Tampering After Terminal Lock**: Employee tries to update `clockInTime` or `dailyRateSnapshot` or re-clock-out after `clockOutTime != ""`.
8. **Client Timestamp Forgery**: User submits `createdAt` with a past client timestamp instead of `serverTimestamp()`.
9. **Oversized ID Poisoning**: User attempts `create` on `/attendances/{200-char-junk-id}` or invalid characters `$#`.
10. **Payroll Forgery by Employee**: Employee attempts to create or update `/payrolls/pay_1` to set `status: "paid"` or inflate `totalAmount`.
11. **Work Settings Tampering**: Non-admin employee attempts to update `/work_settings/default` `lateToleranceMinutes` to `999`.
12. **Blanket Attendance List**: Employee executes `getDocs(collection(db, 'attendances'))` without filtering to own `userId`/`employeeEmail`.
