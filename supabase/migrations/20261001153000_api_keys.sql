-- API keys for the IconVault REST API.
--
-- HOW TO APPLY: this file cannot be run from the app. Open the Supabase
-- dashboard for the production project -> SQL Editor -> paste the whole
-- file -> Run. The /api-access "Your API keys" section starts working
-- immediately after; until then it shows a friendly "not set up yet" notice.
--
-- SECURITY NOTES
-- - Only the SHA-256 hash of a key is stored (key_hash). The full key is
--   shown to the owner exactly once at creation time and never again.
-- - RLS is enabled. App users can SELECT / INSERT / UPDATE only their own
--   rows. There is intentionally NO delete policy: keys are revoked by
--   setting revoked = true, which keeps an audit trail.
-- - The service_role key (used by the API edge routes) bypasses RLS.

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scope text NOT NULL DEFAULT 'read' CHECK (scope IN ('read', 'read-write')),
  monthly_quota int NOT NULL DEFAULT 1000,
  used_this_month int NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_user_id_idx ON public.api_keys (user_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
