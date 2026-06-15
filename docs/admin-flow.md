# Fluxo admin — fichas individuais por aluno

## Modelo

- Cada ficha pertence a **um** aluno (`owner_student_id`).
- Vários alunos × várias fichas = arsenal global (aba **Arsenal**).
- Histórico e cargas do aluno sincronizam na nuvem após `006_workout_logs.sql`.

## Painel

| Aba | Uso |
|-----|-----|
| **Por aluno** | Lista → **Fichas** → nova / editar / duplicar / ↑↓ ordem / excluir |
| **Arsenal** | Todas as fichas com nome do dono |
| **Novo aluno** | Modal (Edge Function `create-student`) ou `npm run create-student -- --email ...` |

## SQL obrigatório (projeto existente)

1. `004_owner_student.sql`
2. `006_workout_logs.sql`
3. (opcional) `005_schema_owner_required.sql`

Ver [`deploy.md`](./deploy.md).
