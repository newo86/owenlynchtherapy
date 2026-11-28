import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { DemoProvider } from '@/components/admin/DemoProvider';

// Dev-only: the REAL dashboard (AdminShell, Dashboard, PhoneApp, every
// section) running on made-up data, with no login and no database. Returns 404
// in every deployment (NODE_ENV is 'production' on Vercel previews and
// production), so it never exists live. The layout follows the window: open it
// at 390px wide for the phone version. Single cards: /admin-demo/parts.
export default function AdminDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <DemoProvider>
      <AdminShell />
    </DemoProvider>
  );
}
