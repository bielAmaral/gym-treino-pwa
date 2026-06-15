-- =============================================================================
-- Fichas individuais por aluno (owner_student_id)
-- Rode após 001_schema + seed. SQL Editor → New query
-- =============================================================================

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS owner_student_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE;

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Dono = primeiro vínculo existente (seed antigo)
UPDATE public.workout_templates wt
SET owner_student_id = sa.student_id
FROM (
  SELECT DISTINCT ON (template_id) template_id, student_id, sort_order
  FROM public.student_assignments
  ORDER BY template_id, sort_order ASC, assigned_at ASC
) sa
WHERE wt.id = sa.template_id
  AND wt.owner_student_id IS NULL;

UPDATE public.workout_templates wt
SET sort_order = sa.sort_order
FROM public.student_assignments sa
WHERE sa.template_id = wt.id
  AND wt.sort_order = 0
  AND sa.sort_order > 0;

CREATE INDEX IF NOT EXISTS workout_templates_owner_idx
  ON public.workout_templates (owner_student_id, sort_order);

-- Uma ficha só pode pertencer a um aluno (via assignments)
CREATE UNIQUE INDEX IF NOT EXISTS student_assignments_template_unique
  ON public.student_assignments (template_id);

-- Aluno lê fichas onde é dono (sem depender só do vínculo)
DROP POLICY IF EXISTS templates_select_student ON public.workout_templates;
CREATE POLICY templates_select_student ON public.workout_templates
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR owner_student_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.student_assignments sa
      WHERE sa.template_id = workout_templates.id
        AND sa.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS templates_admin_write ON public.workout_templates;
CREATE POLICY templates_admin_write ON public.workout_templates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- View: fichas do aluno (cada linha = uma ficha individual daquele aluno)
-- CREATE OR REPLACE não pode remover colunas (ex.: assignment_id da view antiga) → DROP primeiro
DROP VIEW IF EXISTS public.student_workouts;

CREATE VIEW public.student_workouts AS
SELECT
  wt.id AS template_id,
  wt.owner_student_id AS student_id,
  wt.sort_order,
  wt.created_at AS assigned_at,
  wt.label,
  wt.exercises,
  wt.updated_at AS template_updated_at
FROM public.workout_templates wt
WHERE wt.owner_student_id IS NOT NULL;

ALTER VIEW public.student_workouts SET (security_invoker = on);
GRANT SELECT ON public.student_workouts TO authenticated;
