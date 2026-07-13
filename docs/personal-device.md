# Celular pessoal — treino sem login (só o seu iPhone)

O app público exige **login** (alunos do treinador). O **seu** treino (`presets.js`) abre **sem conta** apenas em aparelhos que você autorizar uma vez.

## Como funciona

1. Você define um **segredo** (`PERSONAL_LOCAL_UNLOCK`) no servidor — **não** vai no Git.
2. No iPhone, abre **uma vez** o link com o segredo na URL.
3. O app grava no `localStorage` deste aparelho que é “pessoal”.
4. Daí em diante abre direto na planilha (5 fichas), sem login e sem botão visível para outros.

Quem não tem o link secreto só vê a tela de **Entrar**.

## Passo a passo (Netlify)

1. **Gere um segredo** (ex. no Terminal):

   ```bash
   openssl rand -hex 16
   ```

2. No Netlify ? **Site configuration ? Environment variables**, adicione:

   | Variável | Valor |
   |----------|--------|
   | `PERSONAL_LOCAL_UNLOCK` | o segredo gerado (ex. `a1b2c3…`) |

   As variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` já devem existir.

3. **Redeploy** do site (o build roda `npm run build:supabase-env` e embute o segredo no `supabase-env.js`).

4. No iPhone (Safari), abra **uma vez**:

   ```text
   https://SEU-DOMINIO.netlify.app/?personal=SEU_SEGREDO
   ```

   (também aceita `?me=` em vez de `?personal=`)

5. Confirme que entrou na planilha ? **Compartilhar ? Adicionar à Tela de Início**.

6. Daqui pra frente use **só o ícone** na Tela de Início. Não precisa do `?personal=` de novo neste aparelho.

## Desenvolvimento local

No `.env` na raiz do projeto (não commitar):

```env
PERSONAL_LOCAL_UNLOCK=seu-segredo-local
```

Depois:

```bash
npm run build:supabase-env
npm start
```

No celular na mesma rede: `http://IP-DO-MAC:5173/?personal=seu-segredo-local`

Ou coloque `PERSONAL_LOCAL_UNLOCK` só no seu `config.json` local (gitignored).

## Resetar este aparelho

Safari ? Ajustes do site ? **Apagar dados do site** (ou remover o atalho e limpar dados). O segredo na URL será necessário de novo.

## Segurança (expectativa real)

- O segredo na URL não é criptografia militar: quem souber o link desbloqueia.
- Use segredo longo e **não compartilhe** o link.
- Não commite `PERSONAL_LOCAL_UNLOCK` no repositório.
- Alunos reais continuam usando **login**; só o seu iPhone fica no modo planilha local.
