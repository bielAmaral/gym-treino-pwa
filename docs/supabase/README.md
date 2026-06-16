# Supabase — gym-treino-pwa (MVP)

## Ordem de execução

No **SQL Editor** do projeto Supabase, rode **na ordem**:

1. [`001_schema.sql`](./001_schema.sql) — tabelas, RLS, trigger de profile, view `student_workouts`
2. [`002_seed.sql`](./002_seed.sql) — usuários de teste, 5 fichas, vínculos aluno ↔ ficha
3. [`004_owner_student.sql`](./004_owner_student.sql) — **fichas individuais** (`owner_student_id`); rode em projetos já com seed
4. [`005_schema_owner_required.sql`](./005_schema_owner_required.sql) — opcional: `owner_student_id` NOT NULL
5. [`006_workout_logs.sql`](./006_workout_logs.sql) — histórico de treinos + últimas cargas na nuvem

### Erro `column "display_name" of relation "profiles" does not exist`

Significa que o projeto **já tinha** uma tabela `profiles` antiga (o `CREATE TABLE IF NOT EXISTS` não adiciona colunas novas).

1. Rode [`001b_fix_profiles.sql`](./001b_fix_profiles.sql)
2. Rode [`002_seed.sql`](./002_seed.sql) de novo

## Usuários de teste (após o seed)

| Papel   | E-mail                   | Senha              |
|---------|--------------------------|--------------------|
| Admin   | `sidnei.admin@gymtreino.app` | `TreinoAdmin2026!` |
| Aluno 1 | `aluno1@gymtreino.app`   | `TreinoAluno2026!` |
| Aluno 2 | `aluno2@gymtreino.app`   | `TreinoAluno2026!` |

**Não use `@treino.local`** — o Auth do Supabase rejeita no login. Se já rodou seed antigo, execute [`003_auth_users_fix.sql`](./003_auth_users_fix.sql).

Se o admin ainda for `admin@gymtreino.app`, rode [`007_admin_sidnei.sql`](./007_admin_sidnei.sql) para trocar para `sidnei.admin@gymtreino.app` (mantém o mesmo UUID e fichas criadas por esse usuário).

Troque essas senhas antes de ir para produção.

## O que cada aluno vê

- **Aluno 1:** fichas A, B, C (costas, peito/ombro, braço+cardio)
- **Aluno 2:** fichas D, E (pernas, full body)

## Formato `exercises` (JSONB)

Prescrição (admin grava assim; o app monta as séries na hora):

```json
{
  "name": "Puxada alta articulada",
  "nSets": 4,
  "reps": 10,
  "suggestedRestSec": 60,
  "note": null
}
```

## Consultas úteis

**Aluno — minhas fichas** (como usuário autenticado `aluno1@...`):

```sql
SELECT * FROM public.student_workouts ORDER BY sort_order;
```

**Admin — listar alunos:**

```sql
SELECT id, display_name, role, created_at
FROM public.profiles
WHERE role = 'student'
ORDER BY display_name;
```

## Se o seed de usuários falhar

Alguns projetos restringem `INSERT` em `auth.users`. Nesse caso:

1. Crie os usuários em **Authentication → Users → Add user** (mesmos e-mails).
2. Ajuste o papel do admin:

```sql
UPDATE public.profiles
SET role = 'admin', display_name = 'Admin Treino'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@treino.local');
```

3. Rode só a parte de fichas/vínculos de `002_seed.sql` (blocos `INSERT INTO workout_templates` e `student_assignments`), trocando os UUIDs pelos `id` reais dos usuários, se necessário.

## Variáveis no PWA (obrigatório para ver a tela de login)

No dashboard Supabase: **Project Settings → API** → copie **Project URL** e **anon public** key.

**Opção A — `config.json` (mais rápido)**

1. Na raiz do `gym-treino-pwa`: `cp config.example.json config.json`
2. Cole URL e anon key no JSON
3. Recarregue [http://localhost:5173](http://localhost:5173) → aparece **Entrar**

**Opção B — `.env` + script**

1. `cp .env.example .env` e preencha
2. `npm run build:supabase-env`
3. Recarregue o app

**Auth no Supabase:** Authentication → Providers → Email ligado. Para dev, pode desligar “Confirm email”.

**Sem chaves:** o app abre em modo local (planilha fixa, **sem** login).
