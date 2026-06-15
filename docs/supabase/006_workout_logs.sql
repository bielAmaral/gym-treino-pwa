-- =============================================================================
-- Histórico de treinos + últimas cargas na nuvem (aluno)
-- Rode após 004 (e 005 se usar NOT NULL em owner)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.workout_templates (id) ON DELETE SET NULL,
  preset_label text,
  day_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_sessions_exercises_is_array CHECK (jsonb_typeof(exercises) = 'array'),
  CONSTRAINT workout_sessions_day_key_format CHECK (day_key ~ '^\d{4}-\d{2}-\d{2}$'),
  UNIQUE (student_id, day_key)
);

CREATE INDEX IF NOT EXISTS workout_sessions_student_completed_idx
  ON public.workout_sessions (student_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS public.student_last_weights (
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.workout_templates (id) ON DELETE CASCADE,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, template_id),
  CONSTRAINT student_last_weights_is_object CHECK (jsonb_typeof(weights) = 'object')
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_last_weights ENABLE ROW LEVEL SECURITY;

-- workout_sessions
DROP POLICY IF EXISTS workout_sessions_select ON public.workout_sessions;
CREATE POLICY workout_sessions_select ON public.workout_sessions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS workout_sessions_insert ON public.workout_sessions;
CREATE POLICY workout_sessions_insert ON public.workout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS workout_sessions_update ON public.workout_sessions;
CREATE POLICY workout_sessions_update ON public.workout_sessions
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.is_admin())
  WITH CHECK (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS workout_sessions_delete ON public.workout_sessions;
CREATE POLICY workout_sessions_delete ON public.workout_sessions
  FOR DELETE TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

-- student_last_weights
DROP POLICY IF EXISTS student_last_weights_select ON public.student_last_weights;
CREATE POLICY student_last_weights_select ON public.student_last_weights
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS student_last_weights_upsert ON public.student_last_weights;
CREATE POLICY student_last_weights_insert ON public.student_last_weights
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS student_last_weights_update ON public.student_last_weights;
CREATE POLICY student_last_weights_update ON public.student_last_weights
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.is_admin())
  WITH CHECK (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS student_last_weights_delete ON public.student_last_weights;
CREATE POLICY student_last_weights_delete ON public.student_last_weights
  FOR DELETE TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_last_weights TO authenticated;
