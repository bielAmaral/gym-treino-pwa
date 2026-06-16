-- =============================================================================
-- Troca o admin de teste para sidnei.admin@gymtreino.app
-- Rode no SQL Editor do Supabase (projeto ativo).
--
-- Pré-requisito: função seed_auth_user (rode 003_auth_users_fix.sql antes, ou 002).
--
-- Login após rodar:
--   sidnei.admin@gymtreino.app / TreinoAdmin2026!
-- (altere a senha abaixo ou no Dashboard → Authentication → Users)
-- =============================================================================

-- Remove identidades e-mail antigas do UUID do admin (evita lixo ao trocar e-mail)
DELETE FROM auth.identities
WHERE user_id = 'a0000000-0000-4000-8000-000000000001'::uuid
  AND provider = 'email';

SELECT public.seed_auth_user(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'sidnei.admin@gymtreino.app',
  'TreinoAdmin2026!',
  'admin'::public.app_role,
  'Sidnei'
);

-- Confirma
SELECT u.email, p.role, p.display_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.id = 'a0000000-0000-4000-8000-000000000001'::uuid;
