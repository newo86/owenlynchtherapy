import CnipForm from '@/components/questionnaires/CnipForm';
import { QInvalid } from '@/components/questionnaires/ui';
import { checkQuestionnaireToken } from '@/lib/questionnaires/tokens';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Therapy preferences',
  robots: { index: false, follow: false },
  // The URL carries a private token: never pass it on as a referrer.
  referrer: 'no-referrer' as const,
};

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const state = await checkQuestionnaireToken(token, 'cnip');
  if (!state.ok) return <QInvalid reason={state.reason} />;
  return <CnipForm token={token!} firstName={state.firstName} />;
}
