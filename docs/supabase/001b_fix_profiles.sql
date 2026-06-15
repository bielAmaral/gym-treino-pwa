-- =============================================================================
-- Correção: tabela public.profiles já existia SEM display_name (schema antigo)
-- Rode ISTO no SQL Editor e depois execute 002_seed.sql de novo.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Colunas que o MVP precisa (idempotente)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Se existir full_name (schema antigo), copia para display_name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    EXECUTE $q$
      UPDATE public.profiles
      SET display_name = COALESCE(NULLIF(trim(display_name), ''), NULLIF(trim(full_name), ''))
      WHERE display_name IS NULL OR trim(display_name) = ''
    $q$;
  END IF;
END $$;

UPDATE public.profiles
SET display_name = COALESCE(NULLIF(trim(display_name), ''), 'Usuário')
WHERE display_name IS NULL OR trim(display_name) = '';

UPDATE public.profiles
SET display_name = split_part(u.email, '@', 1)
FROM auth.users u
WHERE u.id = public.profiles.id
  AND (public.profiles.display_name IS NULL OR trim(public.profiles.display_name) = '' OR public.profiles.display_name = 'Usuário');

ALTER TABLE public.profiles ALTER COLUMN display_name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN display_name SET NOT NULL;

UPDATE public.profiles SET created_at = now() WHERE created_at IS NULL;
UPDATE public.profiles SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN updated_at SET NOT NULL;

-- role: garantir coluna com tipo app_role (se era text, converte)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN role public.app_role NOT NULL DEFAULT 'student';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.table_name = 'profiles'
      AND c.column_name = 'role' AND c.udt_name = 'text'
  ) THEN
    ALTER TABLE public.profiles
      ALTER COLUMN role TYPE public.app_role
      USING (
        CASE
          WHEN role::text IN ('admin', 'student') THEN role::text::public.app_role
          ELSE 'student'::public.app_role
        END
      );
  END IF;
END $$;

-- Trigger atualizado (substitui versão antiga que quebrava no seed)
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
