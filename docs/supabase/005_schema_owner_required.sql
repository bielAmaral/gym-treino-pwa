-- =============================================================================
-- Fichas individuais: owner_student_id obrigatório (após 004)
-- =============================================================================

-- Garantir dono em fichas órfãs (sem assignment)
UPDATE public.workout_templates wt
SET owner_student_id = sa.student_id
FROM public.student_assignments sa
WHERE wt.id = sa.template_id
  AND wt.owner_student_id IS NULL;

-- Fichas ainda sem dono: apagar ou atribua manualmente antes de NOT NULL
-- DELETE FROM public.workout_templates WHERE owner_student_id IS NULL;

ALTER TABLE public.workout_templates
  ALTER COLUMN owner_student_id SET NOT NULL;

COMMENT ON COLUMN public.workout_templates.owner_student_id IS
  'Aluno dono desta ficha (individual; não compartilhada).';
