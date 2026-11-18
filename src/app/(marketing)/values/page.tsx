import ValuesForm from '@/components/questionnaires/ValuesForm';
import { QInvalid } from '@/components/questionnaires/ui';
import { checkQuestionnaireToken } from '@/lib/questionnaires/tokens';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Finding your values',
  robots: { index: false, follow: false },
  // The URL carries a private token: never pass it on as a referrer.
  referrer: 'no-referrer' as const,
};

export default async function ValuesPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const state = await checkQuestionnaireToken(token, 'values');
  if (!state.ok) return <QInvalid reason={state.reason} />;
  return <ValuesForm token={token!} firstName={state.firstName} />;
}
