import { supabaseAdmin } from '@/lib/supabase';
import IntakeForm from '@/components/intake/IntakeForm';
import IntakeInvalid from '@/components/intake/IntakeInvalid';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Client Intake Form',
  robots: 'noindex, nofollow',
};

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <IntakeInvalid reason="no-token" />;
  }

  const { data, error } = await supabaseAdmin
    .from('intake_tokens')
    .select('id, client_name, client_email, expires_at, is_used')
    .eq('token', token)
    .single();

  if (error || !data) {
    return <IntakeInvalid reason="invalid" />;
  }

  if (data.is_used) {
    return <IntakeInvalid reason="used" />;
  }

  if (new Date(data.expires_at) < new Date()) {
    return <IntakeInvalid reason="expired" />;
  }

  return (
    <IntakeForm
      token={token}
      clientName={data.client_name ?? ''}
      clientEmail={data.client_email ?? ''}
    />
  );
}
