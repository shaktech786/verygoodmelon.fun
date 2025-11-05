-- Timeless Minds: Custom Thinker Requests
-- Users can pay a small fee (donated to charity) to request new thinkers
-- RULE: Only deceased historical figures (no living people)
-- PURPOSE: "Talk to minds you can no longer reach in real life"

-- Table: thinker_requests
-- Stores user requests for deceased historical figures to add
CREATE TABLE IF NOT EXISTS public.thinker_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Requester info
  requester_email VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255),

  -- Request details
  requested_name VARCHAR(255) NOT NULL,
  requested_era VARCHAR(100),
  requested_field VARCHAR(100),
  reason_for_request TEXT NOT NULL, -- Why they want this person
  personal_connection TEXT, -- Optional: personal connection to this figure

  -- Payment
  payment_amount INTEGER NOT NULL DEFAULT 500, -- Amount in cents ($5.00)
  payment_intent_id VARCHAR(255), -- Stripe payment intent ID
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_receipt_url TEXT,

  -- Charity donation
  charity_name VARCHAR(255) DEFAULT 'Direct Relief', -- Default charity
  donation_receipt_url TEXT,

  -- Request status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, researching, completed
  admin_notes TEXT,
  rejection_reason TEXT,

  -- Research & approval
  research_completed BOOLEAN NOT NULL DEFAULT false,
  research_notes JSONB, -- Stores research findings
  approved_by VARCHAR(255), -- Admin who approved
  approved_at TIMESTAMPTZ,

  -- Generated thinker
  thinker_id VARCHAR(100) UNIQUE, -- ID in thinkers.ts (generated from name)
  thinker_data JSONB, -- Full thinker object once created
  avatar_generated BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,

  -- User access
  phone_book_access_granted BOOLEAN NOT NULL DEFAULT false,
  phone_book_access_expires_at TIMESTAMPTZ -- Optional: time-limited access
);

-- Table: thinker_phone_book_access
-- Tracks who has access to the phone book feature (select specific thinkers)
CREATE TABLE IF NOT EXISTS public.thinker_phone_book_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- User identification
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),

  -- Access details
  access_granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_expires_at TIMESTAMPTZ, -- NULL = lifetime access
  access_type VARCHAR(50) NOT NULL DEFAULT 'custom_request', -- custom_request, purchase, gift

  -- Related request (if from custom request)
  request_id UUID REFERENCES public.thinker_requests(id) ON DELETE SET NULL,

  -- Payment (if purchased separately)
  payment_intent_id VARCHAR(255),
  payment_amount INTEGER,

  -- Active status
  is_active BOOLEAN NOT NULL DEFAULT true,

  UNIQUE(user_email, access_type)
);

-- Table: thinker_selections
-- Tracks user selections from the phone book
CREATE TABLE IF NOT EXISTS public.thinker_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- User
  user_email VARCHAR(255) NOT NULL,

  -- Selection
  thinker_id VARCHAR(100) NOT NULL,
  thinker_name VARCHAR(255) NOT NULL,

  -- Conversation tracking
  conversation_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversation_ended_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,

  -- Satisfaction
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback TEXT
);

-- Indexes for performance
CREATE INDEX idx_thinker_requests_email ON public.thinker_requests(requester_email);
CREATE INDEX idx_thinker_requests_status ON public.thinker_requests(status);
CREATE INDEX idx_thinker_requests_payment_status ON public.thinker_requests(payment_status);
CREATE INDEX idx_phone_book_access_email ON public.thinker_phone_book_access(user_email);
CREATE INDEX idx_phone_book_access_active ON public.thinker_phone_book_access(is_active);
CREATE INDEX idx_thinker_selections_email ON public.thinker_selections(user_email);
CREATE INDEX idx_thinker_selections_thinker ON public.thinker_selections(thinker_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thinker_requests_updated_at
  BEFORE UPDATE ON public.thinker_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.thinker_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thinker_phone_book_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thinker_selections ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view their own requests
CREATE POLICY "Users can view their own requests"
  ON public.thinker_requests
  FOR SELECT
  USING (requester_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Policies: Users can create new requests
CREATE POLICY "Users can create requests"
  ON public.thinker_requests
  FOR INSERT
  WITH CHECK (true);

-- Policies: Users can view their own phone book access
CREATE POLICY "Users can view their own phone book access"
  ON public.thinker_phone_book_access
  FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Policies: Users can view all thinker selections (anonymized)
CREATE POLICY "Users can view popular selections"
  ON public.thinker_selections
  FOR SELECT
  USING (true);

-- Policies: Users can create their own selections
CREATE POLICY "Users can create selections"
  ON public.thinker_selections
  FOR INSERT
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE public.thinker_requests IS 'Custom thinker requests from users - payment goes to charity';
COMMENT ON TABLE public.thinker_phone_book_access IS 'Tracks who can access the phone book feature to select specific thinkers';
COMMENT ON TABLE public.thinker_selections IS 'Tracks which thinkers users select from the phone book';

COMMENT ON COLUMN public.thinker_requests.payment_amount IS 'Amount in cents (e.g., 500 = $5.00)';
COMMENT ON COLUMN public.thinker_requests.status IS 'pending, approved, rejected, researching, completed';
COMMENT ON COLUMN public.thinker_requests.payment_status IS 'pending, completed, failed, refunded';
COMMENT ON COLUMN public.thinker_phone_book_access.access_type IS 'How access was granted: custom_request, purchase, gift';
