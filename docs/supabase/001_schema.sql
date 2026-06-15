-- =============================================================================
-- gym-treino-pwa — MVP Supabase (schema + RLS + trigger)
-- Rode no SQL Editor do projeto: https://supabase.com/dashboard → SQL → New query
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Projeto já tinha profiles sem display_name? CREATE IF NOT EXISTS não altera — aplicar migração:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE public.profiles SET display_name = '' WHERE display_name IS NULL;
UPDATE public.profiles SET created_at = now() WHERE created_at IS NULL;
UPDATE public.profiles SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.profiles ALTER COLUMN display_name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN display_name SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- ---------------------------------------------------------------------------
-- workout_templates (fichas / prescrição)
-- exercises: jsonb — ver 002_seed.sql (formato prescrição)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_templates_exercises_is_array
    CHECK (jsonb_typeof(exercises) = 'array')
);

CREATE INDEX IF NOT EXISTS workout_templates_created_by_idx
  ON public.workout_templates (created_by);

-- ---------------------------------------------------------------------------
-- student_assignments (vínculo aluno ↔ ficha)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.workout_templates (id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  UNIQUE (student_id, template_id)
);

CREATE INDEX IF NOT EXISTS student_assignments_student_idx
  ON public.student_assignments (student_id, sort_order);

CREATE INDEX IF NOT EXISTS student_assignments_template_idx
  ON public.student_assignments (template_id);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS workout_templates_set_updated_at ON public.workout_templates;
CREATE TRIGGER workout_templates_set_updated_at
  BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Novo usuário Auth → profile (role default: student)
-- Admin: ajuste manualmente no SQL ou via painel após criar conta
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('admin', 'student')
        THEN (NEW.raw_user_meta_data ->> 'role')::public.app_role
      ELSE 'student'::public.app_role
    END,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(
      NULLIF(trim(EXCLUDED.display_name), ''),
      public.profiles.display_name
    ),
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'student'::public.app_role
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR id = auth.uid());

-- workout_templates
DROP POLICY IF EXISTS templates_select_student ON public.workout_templates;
CREATE POLICY templates_select_student ON public.workout_templates
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
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

-- student_assignments
DROP POLICY IF EXISTS assignments_select_own ON public.student_assignments;
CREATE POLICY assignments_select_own ON public.student_assignments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS assignments_admin_write ON public.student_assignments;
CREATE POLICY assignments_admin_write ON public.student_assignments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- View útil para o app do aluno (fichas atribuídas)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.student_workouts AS
SELECT
  sa.id AS assignment_id,
  sa.student_id,
  sa.sort_order,
  sa.assigned_at,
  wt.id AS template_id,
  wt.label,
  wt.exercises,
  wt.updated_at AS template_updated_at
FROM public.student_assignments sa
JOIN public.workout_templates wt ON wt.id = sa.template_id;

ALTER VIEW public.student_workouts SET (security_invoker = on);

GRANT SELECT ON public.student_workouts TO authenticated;
