import CnipForm from '@/components/questionnaires/CnipForm';
import { QInvalid } from '@/components/questionnaires/ui';
import { checkQuestionnaireToken } from '@/lib/questionnaires/tokens';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Therapy preferences',
  robots: { index: false, follow: false },
};

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const state = await checkQuestionnaireToken(token, 'cnip');
  if (!state.ok) return <QInvalid reason={state.reason} />;
  return <CnipForm token={token!} firstName={state.firstName} />;
}
