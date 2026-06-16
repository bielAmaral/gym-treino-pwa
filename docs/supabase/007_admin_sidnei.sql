-- =============================================================================
-- Admin sidnei.admin@gymtreino.app (autocontido)
-- Rode no SQL Editor do Supabase.
--
-- Pré-requisito: 001_schema.sql (tabela profiles + tipo app_role).
-- Se o projeto é novo, prefira 001 + 002 em vez deste arquivo.
--
-- Login após rodar:
--   sidnei.admin@gymtreino.app / TreinoAdmin2026!
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.seed_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_role public.app_role,
  p_display_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_instance_id uuid;
BEGIN
  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    v_instance_id,
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('role', p_role::text, 'display_name', p_display_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_id,
    p_email,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    updated_at = now();

  INSERT INTO public.profiles (id, role, display_name)
  VALUES (p_id, p_role, p_display_name)
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name;
END;
$$;

DELETE FROM auth.identities
WHERE user_id = 'a0000000-0000-4000-8000-000000000001'::uuid
  AND provider = 'email';

SELECT public.seed_auth_user(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'sidnei.admin@gymtreino.app'::text,
  'TreinoAdmin2026!'::text,
  'admin'::public.app_role,
  'Sidnei'::text
);

SELECT u.email, p.role, p.display_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.id = 'a0000000-0000-4000-8000-000000000001'::uuid;
