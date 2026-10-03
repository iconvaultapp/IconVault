-- IconVault admin features: coupons, support tickets, error logs, tool
-- settings, takedowns, changelog, referrals, campaigns, user bans.
-- Runs BEFORE 20261003100000_user_features.sql, which creates
-- support_tickets / ticket_replies / referrals with CREATE TABLE IF NOT
-- EXISTS: the schemas defined here win, the later file only adds its
-- indexes and policies on top (all referenced columns exist here).
-- Idempotent: safe to re-run.

-- ================= coupons =================
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percent int NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
  max_uses int NULL,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz NULL,
  active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ================= support_tickets =================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  email text NOT NULL,
  subject text NOT NULL,
  -- Original ticket body. Kept for the user-facing createTicket/getMyTickets
  -- functions in user-account.functions.ts (NULL so admin-created rows stay valid).
  message text NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status, created_at DESC);
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================= ticket_replies =================
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NULL,
  is_admin bool NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_replies_ticket_created_idx ON public.ticket_replies (ticket_id, created_at ASC);
GRANT ALL ON public.ticket_replies TO service_role;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- ================= error_logs =================
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  stack text NULL,
  url text NULL,
  user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS error_logs_created_idx ON public.error_logs (created_at DESC);
GRANT ALL ON public.error_logs TO service_role;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- ================= tool_settings =================
CREATE TABLE IF NOT EXISTS public.tool_settings (
  tool_id text PRIMARY KEY,
  enabled bool NOT NULL DEFAULT true,
  free_limit int NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tool_settings TO service_role;
ALTER TABLE public.tool_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tool settings" ON public.tool_settings;
CREATE POLICY "Public read tool settings" ON public.tool_settings
  FOR SELECT TO anon, authenticated USING (true);
DROP TRIGGER IF EXISTS tool_settings_updated_at ON public.tool_settings;
CREATE TRIGGER tool_settings_updated_at
  BEFORE UPDATE ON public.tool_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================= takedown_requests =================
CREATE TABLE IF NOT EXISTS public.takedown_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_email text NOT NULL,
  icon_set text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS takedown_requests_status_idx ON public.takedown_requests (status, created_at DESC);
GRANT ALL ON public.takedown_requests TO service_role;
ALTER TABLE public.takedown_requests ENABLE ROW LEVEL SECURITY;

-- ================= changelog_posts =================
CREATE TABLE IF NOT EXISTS public.changelog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  published bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.changelog_posts TO service_role;
ALTER TABLE public.changelog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published changelog" ON public.changelog_posts;
CREATE POLICY "Public read published changelog" ON public.changelog_posts
  FOR SELECT TO anon, authenticated USING (published = true);
DROP TRIGGER IF EXISTS changelog_posts_updated_at ON public.changelog_posts;
CREATE TRIGGER changelog_posts_updated_at
  BEFORE UPDATE ON public.changelog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================= referrals =================
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid UNIQUE NOT NULL,
  -- Denormalized email for the user-facing getMyReferrals list.
  referred_email text NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referrals_referrer_created_idx ON public.referrals (referrer_id, created_at DESC);
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- ================= campaigns =================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- ================= profiles: ban columns =================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_reason text NULL;
