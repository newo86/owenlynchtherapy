import type { Metadata } from 'next';
import UnsubscribeForm from './UnsubscribeForm';

export const metadata: Metadata = {
  title: { absolute: 'Unsubscribe from reminders | Owen Lynch Psychotherapy' },
  description: 'Manage your session reminder emails.',
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <section
      style={{ backgroundColor: '#2A4D3C' }}
      className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-[120px] pb-24"
    >
      <div className="bg-white rounded-2xl max-w-md w-full px-8 py-10 text-center" style={{ boxShadow: '0 24px 64px rgba(42,77,60,0.18)' }}>
        <p className="text-orange text-xs font-semibold uppercase tracking-[2px] mb-4">Session reminders</p>
        <UnsubscribeForm token={token ?? ''} />
      </div>
    </section>
  );
}
