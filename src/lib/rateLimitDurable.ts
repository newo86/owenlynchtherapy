import { supabaseAdmin } from './supabase';

/**
 * Durable, cross-instance rate limit backed by Postgres (see
 * supabase/migrations/rate_limits.sql). Unlike the in-memory limiter in
 * rateLimit.ts, this survives serverless cold starts and is shared across
 * instances.
 *
 * Returns true if the request is ALLOWED, false if it should be blocked.
 *
 * FAIL-OPEN: if the migration hasn't been applied yet, or any DB error occurs,
 * we allow the request. This lets the code deploy before the migration without
 * blocking traffic; callers should pair it with the in-memory limiter so there
 * is always a baseline guard.
 */
export async function rateLimitDurable(
  bucket: string,
  ip: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('rate_limit_hit', {
      p_bucket: `${bucket}:${ip}`,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) return true; // fail-open (e.g. function not created yet)
    return data !== false;
  } catch {
    return true; // fail-open on any unexpected error
  }
}
