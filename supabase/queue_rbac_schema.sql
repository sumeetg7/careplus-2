-- SmartCare OPD Queue & Token Management - Supabase PostgreSQL Schema, RBAC & Atomic RPCs
-- Enforces strict Admin-only queue control at the database layer when Supabase is connected.
-- Patients/public users have READ-ONLY SELECT access to queue & token progress; only authenticated admins
-- (app_metadata.role = 'admin') can call next patients, start/complete consultations, skip tokens, or configure doctors.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Doctor Queue Configuration & Live State (Per-Doctor Independent Queues)
CREATE TABLE IF NOT EXISTS public.doctor_queues (
  doctor_id TEXT PRIMARY KEY,
  doctor_name TEXT NOT NULL,
  department_id TEXT NOT NULL,
  department_name TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  avg_consultation_minutes INTEGER NOT NULL DEFAULT 10 CHECK (avg_consultation_minutes BETWEEN 1 AND 120),
  avg_consultation_override BOOLEAN NOT NULL DEFAULT FALSE,
  current_serving_token INTEGER NOT NULL DEFAULT 0 CHECK (current_serving_token >= 0),
  total_tokens_today INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens_today >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Complete Patient Token Lifecycle Table
CREATE TABLE IF NOT EXISTS public.queue_tokens (
  id TEXT PRIMARY KEY, -- e.g. SC-2026-1021
  token_number INTEGER NOT NULL CHECK (token_number > 0),
  doctor_id TEXT NOT NULL REFERENCES public.doctor_queues(doctor_id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  department_id TEXT NOT NULL,
  department_name TEXT NOT NULL,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  patient_age INTEGER CHECK (patient_age BETWEEN 1 AND 120),
  patient_gender TEXT,
  patient_phone TEXT NOT NULL,
  appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_slot TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'WAITING'
    CHECK (status IN ('WAITING', 'CALLED', 'IN CONSULTATION', 'COMPLETED', 'SKIPPED', 'CANCELLED')),
  estimated_wait_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_wait_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at TIMESTAMPTZ,
  consultation_start_at TIMESTAMPTZ,
  consultation_end_at TIMESTAMPTZ,
  actual_duration_minutes NUMERIC(6, 2),
  UNIQUE (doctor_id, appointment_date, token_number)
);

CREATE INDEX IF NOT EXISTS idx_queue_tokens_doctor_status
  ON public.queue_tokens (doctor_id, status, token_number);

-- Enforce single active (CALLED or IN CONSULTATION) token per doctor at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_token_per_doctor
  ON public.queue_tokens (doctor_id)
  WHERE status IN ('CALLED', 'IN CONSULTATION');

-- Legacy department summary compatibility table
CREATE TABLE IF NOT EXISTS public.department_queues (
  department_id TEXT PRIMARY KEY,
  department_name TEXT NOT NULL,
  current_serving_token INTEGER NOT NULL DEFAULT 1 CHECK (current_serving_token >= 0),
  total_tokens_today INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens_today >= 0),
  estimated_minutes_per_patient INTEGER NOT NULL DEFAULT 10 CHECK (estimated_minutes_per_patient > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.doctor_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_queues ENABLE ROW LEVEL SECURITY;

-- Public & patients: READ-ONLY access to doctor queues & token status
DROP POLICY IF EXISTS "Read-only doctor queue visibility" ON public.doctor_queues;
CREATE POLICY "Read-only doctor queue visibility"
  ON public.doctor_queues
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage doctor queues" ON public.doctor_queues;
CREATE POLICY "Admins manage doctor queues"
  ON public.doctor_queues
  FOR ALL
  TO authenticated
  USING (public.is_smartcare_admin())
  WITH CHECK (public.is_smartcare_admin());

DROP POLICY IF EXISTS "Read-only queue tokens visibility" ON public.queue_tokens;
CREATE POLICY "Read-only queue tokens visibility"
  ON public.queue_tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Patients insert waiting tokens" ON public.queue_tokens;
CREATE POLICY "Patients insert waiting tokens"
  ON public.queue_tokens
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'WAITING');

DROP POLICY IF EXISTS "Admins manage all queue tokens" ON public.queue_tokens;
CREATE POLICY "Admins manage all queue tokens"
  ON public.queue_tokens
  FOR ALL
  TO authenticated
  USING (public.is_smartcare_admin())
  WITH CHECK (public.is_smartcare_admin());

DROP POLICY IF EXISTS "Read-only queue visibility" ON public.department_queues;
CREATE POLICY "Read-only queue visibility"
  ON public.department_queues
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage department queues" ON public.department_queues;
CREATE POLICY "Admins manage department queues"
  ON public.department_queues
  FOR ALL
  TO authenticated
  USING (public.is_smartcare_admin())
  WITH CHECK (public.is_smartcare_admin());

-- Rolling average duration across last 10 completed consultations for a doctor
CREATE OR REPLACE FUNCTION public.calculate_doctor_avg_duration(p_doctor_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_avg NUMERIC;
  v_doc public.doctor_queues;
BEGIN
  SELECT * INTO v_doc FROM public.doctor_queues WHERE doctor_id = p_doctor_id;
  IF NOT FOUND THEN
    RETURN 10;
  END IF;
  IF v_doc.avg_consultation_override THEN
    RETURN v_doc.avg_consultation_minutes;
  END IF;

  SELECT ROUND(AVG(actual_duration_minutes)) INTO v_avg
  FROM (
    SELECT actual_duration_minutes
    FROM public.queue_tokens
    WHERE doctor_id = p_doctor_id
      AND status = 'COMPLETED'
      AND actual_duration_minutes >= 1
    ORDER BY consultation_end_at DESC
    LIMIT 10
  ) recent;

  RETURN COALESCE(GREATEST(1, v_avg::INTEGER), v_doc.avg_consultation_minutes, 10);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Atomic Admin RPC: Call Next Patient (WAITING -> CALLED)
CREATE OR REPLACE FUNCTION public.admin_call_next_patient(p_doctor_id TEXT)
RETURNS public.queue_tokens AS $$
DECLARE
  v_doc public.doctor_queues;
  v_active public.queue_tokens;
  v_next public.queue_tokens;
BEGIN
  IF NOT public.is_smartcare_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only authorized hospital administrators can call the next patient.';
  END IF;

  SELECT * INTO v_doc
  FROM public.doctor_queues
  WHERE doctor_id = p_doctor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Doctor queue % not found.', p_doctor_id;
  END IF;

  IF NOT v_doc.is_available THEN
    RAISE EXCEPTION 'Doctor % is currently unavailable.', v_doc.doctor_name;
  END IF;

  SELECT * INTO v_active
  FROM public.queue_tokens
  WHERE doctor_id = p_doctor_id
    AND status IN ('CALLED', 'IN CONSULTATION')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Doctor already has an active patient (Token #%). Complete or skip first.', v_active.token_number;
  END IF;

  SELECT * INTO v_next
  FROM public.queue_tokens
  WHERE doctor_id = p_doctor_id
    AND status = 'WAITING'
  ORDER BY token_number ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No waiting patients remaining for %.', v_doc.doctor_name;
  END IF;

  UPDATE public.queue_tokens
  SET status = 'CALLED',
      called_at = NOW()
  WHERE id = v_next.id
  RETURNING * INTO v_next;

  UPDATE public.doctor_queues
  SET current_serving_token = v_next.token_number,
      updated_at = NOW()
  WHERE doctor_id = p_doctor_id;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Admin RPC: Start Consultation (CALLED -> IN CONSULTATION)
CREATE OR REPLACE FUNCTION public.admin_start_consultation(p_token_id TEXT)
RETURNS public.queue_tokens AS $$
DECLARE
  v_token public.queue_tokens;
BEGIN
  IF NOT public.is_smartcare_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only authorized administrators can start consultations.';
  END IF;

  SELECT * INTO v_token
  FROM public.queue_tokens
  WHERE id = p_token_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token % not found.', p_token_id;
  END IF;

  IF v_token.status <> 'CALLED' THEN
    RAISE EXCEPTION 'Only CALLED tokens can start consultation (current: %).', v_token.status;
  END IF;

  UPDATE public.queue_tokens
  SET status = 'IN CONSULTATION',
      consultation_start_at = NOW()
  WHERE id = p_token_id
  RETURNING * INTO v_token;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Admin RPC: Complete Consultation (IN CONSULTATION -> COMPLETED)
CREATE OR REPLACE FUNCTION public.admin_complete_consultation(p_token_id TEXT)
RETURNS public.queue_tokens AS $$
DECLARE
  v_token public.queue_tokens;
  v_start TIMESTAMPTZ;
  v_duration NUMERIC(6, 2);
BEGIN
  IF NOT public.is_smartcare_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only authorized administrators can complete consultations.';
  END IF;

  SELECT * INTO v_token
  FROM public.queue_tokens
  WHERE id = p_token_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token % not found.', p_token_id;
  END IF;

  IF v_token.status NOT IN ('CALLED', 'IN CONSULTATION') THEN
    RAISE EXCEPTION 'Only active tokens can be completed (current: %).', v_token.status;
  END IF;

  v_start := COALESCE(v_token.consultation_start_at, v_token.called_at, NOW());
  v_duration := GREATEST(0.1, ROUND((EXTRACT(EPOCH FROM (NOW() - v_start)) / 60.0)::NUMERIC, 1));

  UPDATE public.queue_tokens
  SET status = 'COMPLETED',
      consultation_start_at = v_start,
      consultation_end_at = NOW(),
      actual_duration_minutes = v_duration
  WHERE id = p_token_id
  RETURNING * INTO v_token;

  UPDATE public.doctor_queues
  SET avg_consultation_minutes = public.calculate_doctor_avg_duration(v_token.doctor_id),
      updated_at = NOW()
  WHERE doctor_id = v_token.doctor_id;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Admin RPC: Skip Patient Token
CREATE OR REPLACE FUNCTION public.admin_skip_token(p_token_id TEXT)
RETURNS public.queue_tokens AS $$
DECLARE
  v_token public.queue_tokens;
BEGIN
  IF NOT public.is_smartcare_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only authorized administrators can skip tokens.';
  END IF;

  UPDATE public.queue_tokens
  SET status = 'SKIPPED'
  WHERE id = p_token_id
    AND status IN ('WAITING', 'CALLED', 'IN CONSULTATION')
  RETURNING * INTO v_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token % cannot be skipped or was not found.', p_token_id;
  END IF;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
