# Deploy — gym-treino-pwa

## 1. Supabase (SQL na ordem)

1. `001_schema.sql` (+ `001b` se profiles antiga)
2. `002_seed.sql` ou usuários reais
3. `003_auth_users_fix.sql` (se seed antigo)
4. `004_owner_student.sql`
5. `005_schema_owner_required.sql` (opcional, NOT NULL)
6. `006_workout_logs.sql` (histórico + cargas na nuvem)

**Auth:** Email provider ligado. Em dev pode desligar “Confirm email”.

## 2. Criar aluno (escolha A ou B)

### A) Script local (mais rápido, sem CLI Supabase)

1. Dashboard → **Project Settings → API**
2. Copie **service_role** (`secret`) — não é a `anon` key
3. No `gym-treino-pwa/.env` (crie a partir de `.env.example`):

```env
SUPABASE_URL=https://SEU-REF.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` podem já estar no `config.json`; a **service_role** só no `.env`.

4. Rode:

```bash
cd gym-treino-pwa
npm run create-student -- --email maria@gymtreino.app --password 'SenhaForte8!' --name "Maria"
```

### B) Edge Function + botão “Novo aluno” no painel

**Login na CLI** (abre o browser; o erro `Access token not provided` some depois disso):

```bash
cd gym-treino-pwa
npx supabase login
```

**Project ref** = subdomínio da URL do projeto  
(ex.: `https://gpibvvgddmzlheefueuf.supabase.co` → ref `gpibvvgddmzlheefueuf`)

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase functions deploy create-student
```

**Secrets** (Dashboard → **Edge Functions** → **Secrets**, ou `supabase secrets set`):

| Nome | Valor |
|------|--------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret |

Sem deploy da função, o painel mostra erro 404 ao criar aluno — use o script **A** até deployar.

## 3. PWA estático

Qualquer host de ficheiros estáticos:

- [Vercel](https://vercel.com): root = `gym-treino-pwa`, build = nenhum, output = `.`
- [Netlify](https://netlify.com): publish directory = `gym-treino-pwa`

**Variáveis no deploy (ou `config.json` no servidor):**

- Não commitar `config.json` com chaves reais.
- Opção: gerar `supabase-env.js` no CI com `npm run build:supabase-env` e variáveis `SUPABASE_URL` / `SUPABASE_ANON_KEY`.

**Supabase Auth → URL Configuration:**

- Site URL = URL do PWA (ex. `https://treino.seudominio.com`)
- Redirect URLs = mesma URL + `/**` se usar reset de senha

## 4. Checklist pós-deploy

- [ ] Login admin e aluno
- [ ] Criar aluno pelo painel (função deployada)
- [ ] Nova ficha → aluno vê no app
- [ ] Concluir treino → linha em `workout_sessions` (Table Editor)
- [ ] Esqueci a senha envia e-mail
- [ ] PWA: “Adicionar à Tela de Início” no iPhone

## 5. Script local (sem Edge Function)

Com `SUPABASE_SERVICE_ROLE_KEY` no `.env` (não usar no browser):

```bash
node scripts/create-student.mjs --email aluno@exemplo.com --password 'SenhaForte8!' --name "Maria"
```
