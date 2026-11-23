import type { Metadata } from 'next';
import RespondForm from './RespondForm';

export const metadata: Metadata = {
  title: { absolute: 'Waiting list | Owen Lynch Psychotherapy' },
  description: 'Let Owen know whether you are still looking for therapy.',
  robots: { index: false, follow: false },
};

// Landing page for the yes/no buttons in a waiting-list email. Opening the
// link records nothing: the answer is sent only when the person presses the
// button here (email link scanners open links automatically).
export default async function WaitlistRespondPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const { t, a } = await searchParams;
  return (
    <section
      style={{ backgroundColor: '#2A4D3C' }}
      className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-[120px] pb-24"
    >
      <div className="card-soft bg-white rounded-2xl max-w-md w-full px-8 py-10 text-center">
        <p className="text-orange text-sm font-semibold mb-4">Waiting list</p>
        <RespondForm token={t ?? ''} initial={a === 'no' ? 'no' : 'yes'} />
      </div>
    </section>
  );
}
