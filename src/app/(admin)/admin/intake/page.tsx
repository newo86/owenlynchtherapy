'use client';

import { AuthGate } from '@/components/admin/AuthGate';
import { AdminShell } from '@/components/admin/AdminShell';

export default function AdminIntakePage() {
  return (
    <AuthGate>
      <AdminShell />
    </AuthGate>
  );
}
