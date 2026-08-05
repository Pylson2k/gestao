# Runbook de Rollout (item 3 do roadmap)

Sequência para abrir o canário Rust em produção e escalar a 100%. Executar após
**auth de um clique** (Vercel login + chave do Render) — ver "Acesso necessário".

## Acesso necessário (uma vez)
- **Vercel (Next):** `npx vercel login` no terminal do dono (login no navegador),
  ou exportar `VERCEL_TOKEN` com um token de `https://vercel.com/account/tokens`.
- **Render (Rust):** chave de API em `https://dashboard.render.com/account/api-keys`
  → exportar como `RENDER_API_KEY`. O projeto `Pylson2k/gestao` no GitHub já é o remoto de `main`.
- GitHub já autenticado (push funciona).

## Passo 1 — Schema no Neon
A tabela `idempotency_keys` já existe no Neon (mesmo `DATABASE_URL` usado no dev;
`prisma/migrations/20260804_idempotency_keys` foi aplicado). Para reaplicar em outro ambiente:
```bash
node -e "require('fs').readFileSync('prisma/migrations/20260804_idempotency_keys/migration.sql','utf8')"
# ou
npx prisma db push
```

## Passo 2 — Deploy do Rust no Render
1. Dashboard Render → **New → Blueprint** → selecionar `Pylson2k/gestao`.
2. O `render.yaml` cria o web service `gestao-rust-api` (Docker, plano free, `/health`).
3. Definir `DATABASE_URL` (mesma connection string do Neon; campo `sync: false`).
   - ⚠️ A `DATABASE_URL` é a do **Neon de produção**, NUNCA a `localhost` do `.env` dev.
   - ⚠️ O `.env` local guarda o valor **entre aspas** (`DATABASE_URL="postgresql://..."`);
     ao enviar via API, remover as aspas (`Trim().Trim('"')`).
   - ⚠️ Se `DATABASE_URL` ficar vazia/relativa, o app sobe e morre com
     `error with configuration: relative URL without a base` (parse do sqlx) ou
     `pool timed out while waiting for an open connection` (host inacessível).
4. Anotar a URL do serviço (ex.: `https://gestao-rust-api.onrender.com`).
5. Verificar saúde: `curl https://<rust-url>/health` → `{"status":"ok"}`,
   e uma rota real com header `x-user-id: <qualquer>`: `GET /v2/material-lists` → 200.

## Passo 3 — Env vars no Vercel (Next)
Definir no projeto (`v0-saa-s-service-app`):
```
RUST_API_BASE_URL=https://<rust-url>       # sem /api — o gateway acrescenta /v2
MIGRATION_AUTH_ROLLOUT=0
MIGRATION_CLIENTS_ROLLOUT=10
MIGRATION_SERVICES_ROLLOUT=10
MIGRATION_QUOTES_ROLLOUT=10
MIGRATION_PAYMENTS_ROLLOUT=10
MIGRATION_EXPENSES_ROLLOUT=10
MIGRATION_CASH_CLOSINGS_ROLLOUT=10  # Vercel não aceita hífen no nome da env var
MIGRATION_MATERIALS_ROLLOUT=10
```
CLI equivalente:
```bash
npx vercel env add RUST_API_BASE_URL production
npx vercel env add MIGRATION_CLIENTS_ROLLOUT production  # valor 10
...
npx vercel --prod
```
⚠️ **Mudar env var via API NÃO dispara redeploy automático.** Depois de
criar/atualizar `RUST_API_BASE_URL` e as flags, disparar um deploy de produção
(auto-deploy do push em `main` ou `POST /v13/deployments` com `gitSource` github,
`repoId` do projeto, `ref: main`, `target: production`). Confirmar o `readyState=READY`
antes de testar.

## Passo 4 — Verificação do canário
- ⚠️ Requer **sessão autenticada**: o `proxy.ts` bloqueia `/api/*` sem cookie com 401.
  Testar logado no navegador do dono (abrir a URL `/api/v2/<dominio>` direto).
- ⚠️ `/api/v2/status` NÃO tem mapeamento de domínio → responde 503 por design (é o
  comportamento esperado da página demo `/v2`; use uma rota de domínio real para testar).
- ⚠️ **`net::ERR_CONTENT_DECODING_FAILED` (página branca)**: o gateway relia o corpo com
  `upstream.text()` (já descomprimido) mas copiava `Content-Encoding: gzip` do upstream.
  Fix: `app/api/v2/[...path]/route.ts` remove `content-encoding`, `content-length`,
  `transfer-encoding` da resposta. Sem esse fix, nenhuma rota proxeada renderiza no browser.
- `GET /api/v2/clients` via gateway com flag ligada → responde do Rust (status 200, não 503).
- `GET /api/v2/clients` com flag 0 → 503 esperado (fallback consciente).
- ⚠️ **Rollout é binário (single-tenant)**: o proxy injeta `x-user-id = OWNER_SESSION_USER_ID`
  (`'1'`) após validar a sessão, então o seed do hash é sempre `'1'` → `bucket('1') = 49`.
  Na prática: flag ≤ 49 = desligado, flag ≥ 50 = **100% para o dono** (percentual por
  usuário não se aplica — há 1 usuário).
- Paridade contra produção (substituir URLs):
```bash
NEXT_BASE_URL=https://<app>.vercel.app RUST_BASE_URL=https://<rust-url> npm run db:parity
```
- `npm run quality` local (lint + test + build) e CI `Quality`/`rust-quality` verdes.

## Passo 5 — Escala por domínio (janelas de observação)
- Subir rollout por domínio (10 → 50 → 100) editando as env vars no Vercel + redeploy.
  Lembrando: com seed fixo `'1'`, 50 já equivale a 100% para o dono (ver Passo 4).
- Critérios para avançar (quality-and-observability.md): erro 5xx < 1%, P95 ≤ 350ms,
  disponibilidade ≥ 99.9%, sem incidentes P1/P2 em fluxos críticos.
- Mínimo de **7 dias a 100%** antes do cutover (cutover-and-legacy-removal.md).

## Rollback
- Zerar `MIGRATION_<DOMINIO>_ROLLOUT` da env var do Vercel (fallback imediato para o legado).
- Para remover o Rust: parar o serviço no Render (sem afetar o Next).
- O rollout é por domínio: um domínio pode recuar sem afetar os outros.

## Lembretes de segurança
- Nunca commitar `.env` (contém `DATABASE_URL`/`ADMIN_OPERATIONS_SECRET`).
- O gateway só roteia com `RUST_API_BASE_URL` presente; sem ela, `/api/v2/*` responde 503
  (nunca cai para o legado automaticamente — falha fechada).
