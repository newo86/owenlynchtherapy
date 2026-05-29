import { supabaseAdmin } from './supabase';
import { verifyTotp } from './totp';

// Storage + state for admin two-factor (TOTP). The secret lives in the
// admin_mfa table (see supabase/migrations/admin_mfa.sql). All helpers fail
// safe: if the table is missing or a query errors, MFA reads as disabled so a
// missing migration can never lock the admin out.

const OWNER = 'admin';

/** Whether two-factor is currently enabled. */
export async function isMfaEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_mfa')
      .select('enabled')
      .eq('owner', OWNER)
      .maybeSingle();
    if (error) return false;
    return Boolean(data?.enabled);
  } catch {
    return false;
  }
}

/** Store a freshly generated secret as pending (enabled = false) during setup. */
export async function savePendingSecret(secret: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('admin_mfa').upsert(
    { owner: OWNER, secret, enabled: false, updated_at: new Date().toISOString() },
    { onConflict: 'owner' },
  );
  if (error) console.error('[adminMfa] savePendingSecret error:', error.message);
  return !error;
}

/** Flip the enabled flag (true to activate after confirmation, false to turn off). */
export async function setEnabled(enabled: boolean): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('admin_mfa')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('owner', OWNER);
  if (error) console.error('[adminMfa] setEnabled error:', error.message);
  return !error;
}

/** Verify a 6-digit code against the stored secret. */
export async function verifyStored(code: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('admin_mfa')
    .select('secret')
    .eq('owner', OWNER)
    .maybeSingle();
  if (error || !data?.secret) return false;
  return verifyTotp(code, data.secret as string);
}
