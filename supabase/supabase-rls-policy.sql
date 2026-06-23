-- SECURITY HARDENING: ROW LEVEL SECURITY (RLS) POLICIES
-- This script formalises RLS on all tables containing clinical or sensitive data.
-- It ensures that even if the public Anon Key is leaked, no data can be accessed.
-- Access is restricted exclusively to the 'service_role' (used by our API routes).

-- 1. CLIENTS TABLE
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all public access to clients" ON public.clients;
CREATE POLICY "Deny all public access to clients" 
  ON public.clients 
  FOR ALL 
  TO anon, authenticated 
  USING (false) 
  WITH CHECK (false);

-- 2. SESSIONS TABLE
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all public access to sessions" ON public.sessions;
CREATE POLICY "Deny all public access to sessions" 
  ON public.sessions 
  FOR ALL 
  TO anon, authenticated 
  USING (false) 
  WITH CHECK (false);

-- 3. INTAKE TOKENS TABLE
ALTER TABLE public.intake_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all public access to intake_tokens" ON public.intake_tokens;
CREATE POLICY "Deny all public access to intake_tokens" 
  ON public.intake_tokens 
  FOR ALL 
  TO anon, authenticated 
  USING (false) 
  WITH CHECK (false);

-- 4. INTAKE SUBMISSIONS TABLE
ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all public access to intake_submissions" ON public.intake_submissions;
CREATE POLICY "Deny all public access to intake_submissions" 
  ON public.intake_submissions 
  FOR ALL 
  TO anon, authenticated 
  USING (false) 
  WITH CHECK (false);

-- 5. GOOGLE OAUTH TOKENS TABLE (Already hardened, but reinforced here)
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no anon access" ON public.google_oauth_tokens;
CREATE POLICY "no anon access" 
  ON public.google_oauth_tokens 
  FOR ALL 
  TO anon, authenticated 
  USING (false) 
  WITH CHECK (false);

-- EXPLICIT GRANTS
-- While service_role bypasses RLS, explicit grants ensure permissions are correctly
-- assigned if tables were created via raw SQL.
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.sessions TO service_role;
GRANT ALL ON public.intake_tokens TO service_role;
GRANT ALL ON public.intake_submissions TO service_role;
GRANT ALL ON public.google_oauth_tokens TO service_role;
