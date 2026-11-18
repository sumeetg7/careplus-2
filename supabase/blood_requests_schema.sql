-- SmartCare Blood Bank Module - Simplified PostgreSQL Schema & RLS
-- Supports:
-- 1. Live Blood Stock Inventory across all 8 blood groups (Admin-managed, Publicly searchable)
-- 2. Simple Blood Request workflow with strictly 4 statuses: Pending, Approved, Rejected, Completed
-- 3. Strict authorization: Patients cannot modify stock or approve/reject requests; new requests always begin in Pending status.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Blood Stock Inventory Table (8 Blood Groups)
CREATE TABLE IF NOT EXISTS public.blood_stock (
  blood_group TEXT PRIMARY KEY CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  available_units INTEGER NOT NULL DEFAULT 0 CHECK (available_units >= 0 AND available_units <= 500),
  availability_status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN available_units <= 0 THEN 'Out of Stock'
      WHEN available_units <= 3 THEN 'Low Stock'
      ELSE 'Available'
    END
  ) STORED,
  hospital_name TEXT NOT NULL DEFAULT 'SmartCare Central Blood Bank',
  contact_number TEXT NOT NULL DEFAULT '+91 800 227 3758 (Ext. 214)',
  location TEXT NOT NULL DEFAULT 'Ground Floor, Wing B, SmartCare Medical Center',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial blood bank stock if empty
INSERT INTO public.blood_stock (blood_group, available_units)
VALUES
  ('A+', 14),
  ('A-', 3),
  ('B+', 18),
  ('B-', 2),
  ('O+', 22),
  ('O-', 2),
  ('AB+', 8),
  ('AB-', 0)
ON CONFLICT (blood_group) DO NOTHING;

-- 2. Simple Blood Requests Table
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE,
  patient_name TEXT NOT NULL CHECK (char_length(trim(patient_name)) >= 2),
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  units_required INTEGER NOT NULL CHECK (units_required BETWEEN 1 AND 20),
  hospital_name TEXT NOT NULL CHECK (char_length(trim(hospital_name)) >= 2),
  contact_number TEXT NOT NULL CHECK (char_length(regexp_replace(contact_number, '\D', '', 'g')) >= 10),
  required_date DATE NOT NULL,
  additional_info TEXT NOT NULL DEFAULT '',
  request_status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (request_status IN ('Pending', 'Approved', 'Rejected', 'Completed')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blood_requests_status
  ON public.blood_requests (request_status, blood_group, created_at DESC);

-- 3. Updated-at Triggers
CREATE OR REPLACE FUNCTION public.set_blood_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blood_requests_updated_at ON public.blood_requests;
CREATE TRIGGER trg_blood_requests_updated_at
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_blood_request_updated_at();

CREATE OR REPLACE FUNCTION public.set_blood_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blood_stock_updated_at ON public.blood_stock;
CREATE TRIGGER trg_blood_stock_updated_at
  BEFORE UPDATE ON public.blood_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.set_blood_stock_updated_at();

-- 4. Admin Role Helper (JWT app_metadata.role = 'admin')
CREATE OR REPLACE FUNCTION public.is_smartcare_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    FALSE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Safe Status Transition Guard (Prevents reprocessing Approved/Rejected/Completed requests accidentally)
CREATE OR REPLACE FUNCTION public.admin_transition_blood_request(
  p_request_id UUID,
  p_next_status TEXT
)
RETURNS public.blood_requests AS $$
DECLARE
  v_row public.blood_requests;
BEGIN
  IF NOT public.is_smartcare_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only authorized administrators may process blood requests.';
  END IF;

  SELECT * INTO v_row FROM public.blood_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Blood request not found.';
  END IF;

  IF v_row.request_status = 'Pending' AND p_next_status IN ('Approved', 'Rejected') THEN
    UPDATE public.blood_requests
      SET request_status = p_next_status
      WHERE id = p_request_id
      RETURNING * INTO v_row;
    RETURN v_row;
  ELSIF v_row.request_status = 'Approved' AND p_next_status = 'Completed' THEN
    UPDATE public.blood_requests
      SET request_status = 'Completed'
      WHERE id = p_request_id
      RETURNING * INTO v_row;
    RETURN v_row;
  ELSE
    RAISE EXCEPTION 'Invalid transition from % to %. Already processed requests cannot be reprocessed.', v_row.request_status, p_next_status;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Row Level Security (RLS)
ALTER TABLE public.blood_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can search/view blood stock availability
DROP POLICY IF EXISTS "Public view blood stock" ON public.blood_stock;
CREATE POLICY "Public view blood stock"
  ON public.blood_stock
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Only admins can add or update blood stock
DROP POLICY IF EXISTS "Admins manage blood stock" ON public.blood_stock;
CREATE POLICY "Admins manage blood stock"
  ON public.blood_stock
  FOR ALL
  TO authenticated
  USING (public.is_smartcare_admin())
  WITH CHECK (public.is_smartcare_admin());

-- Patients can view their own submitted blood requests
DROP POLICY IF EXISTS "Users view own blood requests" ON public.blood_requests;
CREATE POLICY "Users view own blood requests"
  ON public.blood_requests
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Patients/users can insert new blood requests ONLY in Pending status
DROP POLICY IF EXISTS "Users submit pending blood requests" ON public.blood_requests;
CREATE POLICY "Users submit pending blood requests"
  ON public.blood_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    request_status = 'Pending'
    AND (submitted_by IS NULL OR submitted_by = auth.uid())
  );

-- Only authorized administrators can view all requests & update status
DROP POLICY IF EXISTS "Admins manage all blood requests" ON public.blood_requests;
CREATE POLICY "Admins manage all blood requests"
  ON public.blood_requests
  FOR ALL
  TO authenticated
  USING (public.is_smartcare_admin())
  WITH CHECK (public.is_smartcare_admin());
