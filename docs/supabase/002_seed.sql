-- =============================================================================
-- gym-treino-pwa — dados de exemplo (usuários + fichas + vínculos)
-- Pré-requisito: rodar 001_schema.sql antes.
--
-- Usuários de teste (use domínio real — Supabase NÃO aceita @treino.local no login):
--   admin@gymtreino.app     / TreinoAdmin2026!
--   aluno1@gymtreino.app    / TreinoAluno2026!
--   aluno2@gymtreino.app    / TreinoAluno2026!
-- Se já rodou versão antiga com .local, rode também: 003_auth_users_fix.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- UUIDs fixos (facilita debug e re-run do seed)
-- Admin
--   a0000000-0000-4000-8000-000000000001
-- Alunos
--   b0000000-0000-4000-8000-000000000002
--   c0000000-0000-4000-8000-000000000003
-- Fichas
--   f0000001 … f0000005

-- ---------------------------------------------------------------------------
-- Função temporária: cria usuário Auth + identity + profile
-- ---------------------------------------------------------------------------
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
    updated_at = now();

  INSERT INTO public.profiles (id, role, display_name)
  VALUES (p_id, p_role, p_display_name)
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name;
END;
$$;

SELECT public.seed_auth_user(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'admin@gymtreino.app',
  'TreinoAdmin2026!',
  'admin'::public.app_role,
  'Admin Treino'
);

SELECT public.seed_auth_user(
  'b0000000-0000-4000-8000-000000000002'::uuid,
  'aluno1@gymtreino.app',
  'TreinoAluno2026!',
  'student'::public.app_role,
  'Aluno Demo 1'
);

SELECT public.seed_auth_user(
  'c0000000-0000-4000-8000-000000000003'::uuid,
  'aluno2@gymtreino.app',
  'TreinoAluno2026!',
  'student'::public.app_role,
  'Aluno Demo 2'
);

DROP FUNCTION public.seed_auth_user(uuid, text, text, public.app_role, text);

-- ---------------------------------------------------------------------------
-- Fichas (prescrição — mesmo formato da planilha: nSets, reps, suggestedRestSec)
-- ---------------------------------------------------------------------------
INSERT INTO public.workout_templates (id, label, exercises, created_by)
VALUES
  (
    'f0000001-0000-4000-8000-000000000001'::uuid,
    'Puxada / costas (A)',
    '[
      {"name":"Puxada alta articulada","nSets":4,"reps":10,"suggestedRestSec":60,"note":null},
      {"name":"Puxada alta (pega neutra)","nSets":4,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Abdômen infra paralelo (flexão de joelhos)","nSets":4,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Puxada alta articulada (pega pronada)","nSets":4,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Remada baixa (pega neutra)","nSets":3,"reps":7,"suggestedRestSec":90,"note":"Drop set 7+7+7 em cada série"},
      {"name":"Pull down","nSets":4,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Remada curvada (máquina)","nSets":4,"reps":10,"suggestedRestSec":60,"note":null},
      {"name":"Encolhimento / elevação escapular","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Crucifixo inverso polia (unilateral)","nSets":4,"reps":12,"suggestedRestSec":60,"note":null}
    ]'::jsonb,
    'a0000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'f0000002-0000-4000-8000-000000000002'::uuid,
    'Peito / ombro (B)',
    '[
      {"name":"Supino inclinado (halter)","nSets":4,"reps":8,"suggestedRestSec":90,"note":"1ª série de aquec.: 30–40% da carga máx."},
      {"name":"Crucifixo (polia em pé)","nSets":4,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Supino reto (máq. articulada)","nSets":4,"reps":10,"suggestedRestSec":60,"note":null},
      {"name":"Flexão de braço (entre 2 step)","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Crucifixo (máquina)","nSets":3,"reps":7,"suggestedRestSec":90,"note":"Drop 7+7+7"},
      {"name":"Desenvolvimento (máq. articulada)","nSets":4,"reps":10,"suggestedRestSec":60,"note":null},
      {"name":"Elevação frontal (rotação neutra → pronada)","nSets":4,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Elevação lateral (halter em pé)","nSets":3,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Remada alta (polia)","nSets":3,"reps":12,"suggestedRestSec":60,"note":null}
    ]'::jsonb,
    'a0000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'f0000003-0000-4000-8000-000000000003'::uuid,
    'Braço + cardio (C)',
    '[
      {"name":"Tríceps testa (barra W)","nSets":5,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Tríceps francês (polia)","nSets":5,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Tríceps corda (polia)","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Rosca Scott (halter unilateral)","nSets":5,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Rosca alternada c/ halter (isometria)","nSets":5,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Rosca direta (barra polia)","nSets":4,"reps":7,"suggestedRestSec":60,"note":"Drop 7+7+7 em cada série"},
      {"name":"Rosca punho (barra)","nSets":3,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Cardio — corrida (esteira)","nSets":1,"reps":0,"suggestedRestSec":60,"note":"Duração: 30 min"}
    ]'::jsonb,
    'a0000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'f0000004-0000-4000-8000-000000000004'::uuid,
    'Pernas (D)',
    '[
      {"name":"Agachamento (barra livre)","nSets":4,"reps":10,"suggestedRestSec":60,"note":null},
      {"name":"Leg press 45°","nSets":4,"reps":10,"suggestedRestSec":60,"note":null},
      {"name":"Cadeira extensora (unilateral)","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Cadeira flexora","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Elevação pélvica (máquina)","nSets":4,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Abdutor (máquina)","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Adutor (máquina)","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Panturrilha banco (solear)","nSets":4,"reps":20,"suggestedRestSec":60,"note":null}
    ]'::jsonb,
    'a0000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'f0000005-0000-4000-8000-000000000005'::uuid,
    'Full body (E)',
    '[
      {"name":"Supino declinado (barra livre)","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Remada “cavalo” (máq., pega pronada)","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Elevação frontal (polia)","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Tríceps coice (polia) unilateral","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Rosca direta (barra livre)","nSets":4,"reps":15,"suggestedRestSec":60,"note":null},
      {"name":"Prancha lateral","nSets":4,"reps":30,"suggestedRestSec":60,"note":"30 s por lado; reps no campo = segundos"},
      {"name":"Recuo alternado (ou com carga)","nSets":4,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Agachamento sumô (máq. triângulo)","nSets":4,"reps":12,"suggestedRestSec":60,"note":null},
      {"name":"Mesa flexora","nSets":4,"reps":12,"suggestedRestSec":60,"note":null}
    ]'::jsonb,
    'a0000000-0000-4000-8000-000000000001'::uuid
  )
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  exercises = EXCLUDED.exercises,
  created_by = EXCLUDED.created_by,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Vínculos aluno ↔ ficha
-- Aluno 1: A, B, C  |  Aluno 2: D, E
-- ---------------------------------------------------------------------------
INSERT INTO public.student_assignments (student_id, template_id, sort_order, assigned_by)
VALUES
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'f0000001-0000-4000-8000-000000000001'::uuid, 1, 'a0000000-0000-4000-8000-000000000001'::uuid),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'f0000002-0000-4000-8000-000000000002'::uuid, 2, 'a0000000-0000-4000-8000-000000000001'::uuid),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'f0000003-0000-4000-8000-000000000003'::uuid, 3, 'a0000000-0000-4000-8000-000000000001'::uuid),
  ('c0000000-0000-4000-8000-000000000003'::uuid, 'f0000004-0000-4000-8000-000000000004'::uuid, 1, 'a0000000-0000-4000-8000-000000000001'::uuid),
  ('c0000000-0000-4000-8000-000000000003'::uuid, 'f0000005-0000-4000-8000-000000000005'::uuid, 2, 'a0000000-0000-4000-8000-000000000001'::uuid)
ON CONFLICT (student_id, template_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  assigned_by = EXCLUDED.assigned_by;
