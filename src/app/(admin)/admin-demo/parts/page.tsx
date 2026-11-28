import { notFound } from 'next/navigation';
import { PaymentPromptsDemo } from '@/components/admin/PaymentPromptsDemo';
import { FollowedFromGoogleDemo } from '@/components/admin/FollowedFromGoogleDemo';

// Dev-only: the older single-card previews (payment prompts, followed from
// Google) with made-up data. 404 in every deployment (NODE_ENV is 'production'
// on Vercel previews and production).
export default function AdminDemoPartsPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <>
      <PaymentPromptsDemo />
      <FollowedFromGoogleDemo />
    </>
  );
}
