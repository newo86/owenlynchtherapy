import { notFound } from 'next/navigation';
import { PaymentPromptsDemo } from '@/components/admin/PaymentPromptsDemo';
import { FollowedFromGoogleDemo } from '@/components/admin/FollowedFromGoogleDemo';

// Dev-only: lets the UI be previewed with made-up data without logging in or
// touching the database. Returns 404 in every deployment (NODE_ENV is
// 'production' on Vercel previews and production), so it never exists live.
export default function AdminDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <>
      <PaymentPromptsDemo />
      <FollowedFromGoogleDemo />
    </>
  );
}
