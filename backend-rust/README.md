# Backend Rust (Fase Progressiva)

Serviço Axum para migração por domínio via `/api/v2` com gateway no Next.js.

## Executar local
1. Configure `DATABASE_URL`
2. (Opcional) Configure `RUST_API_BIND` (default `0.0.0.0:4000`)
3. Rode:

```bash
cargo run
```

## Deploy em nuvem (Render + Neon)
- O banco é o Neon (mesmo `DATABASE_URL` do Next.js).
- `render.yaml` + `Dockerfile` preparam um web service Docker gratuito.
- No painel do Render, crie um Blueprint a partir de `backend-rust/render.yaml`,
  defina `DATABASE_URL` com a connection string do Neon e o serviço expõe `/v2/*`.
- A porta lida com `PORT` (Render) ou `RUST_API_BIND` (custom).

## Endpoints iniciais
- `GET /health`
- `GET /v2/status`
- `GET/POST /v2/clients`
- `GET/PUT/DELETE /v2/clients/:id`
- `GET/POST /v2/services`
- `GET/PUT/DELETE /v2/services/:id`
- `GET/POST /v2/quotes`
- `GET/PUT/DELETE /v2/quotes/:id`
- `GET/POST /v2/payments`
- `GET/PUT/DELETE /v2/payments/:id`
- `GET/POST /v2/expenses`
- `GET/PUT/DELETE /v2/expenses/:id`
- `GET/POST /v2/cash-closings`
- `GET/POST /v2/material-lists`
- `GET/PATCH/DELETE /v2/material-lists/:id`

## Domínio Clients
CRUD de clientes com paridade com o legado `/api/clients`:
- Lista com busca (`?search=`), contagem de orçamentos (`_count.quotes`) e ordenação por nome.
- Criação/edição/exclusão com validações idênticas ao legado.
- Trilha de auditoria (`audit_logs`) best-effort para criar/editar/excluir.
- Auth por header `x-user-id` (injetado pelo proxy Next.js após validar a sessão).

## Domínio Services
CRUD de serviços com paridade com o legado `/api/services`:
- Lista com filtros `?isActive=` e `?search=`, restrito ao usuário proprietário.
- Criação/edição/exclusão com validações idênticas (nome obrigatório, preço >= 0).
- Trilha de auditoria best-effort.
- Auth por header `x-user-id`.

## Domínio Payments
CRUD de pagamentos com paridade com o legado `/api/payments`:
- Lista com filtro `?quoteId=`, sempre com orçamento e cliente embutidos.
- Validações idênticas (orçamento obrigatório, valor > 0, data obrigatória, método válido).
- Rejeita valor que exceda o total do orçamento (retorna `totalPaid`/`remaining`).
- Sincroniza lista de inadimplentes (`clearDelinquencyIfFullyPaid`).
- Trilha de auditoria best-effort (create/update/delete).

## Domínio Expenses
CRUD de despesas com paridade com o legado `/api/expenses`:
- Lista com filtros `?startDate=`/`?endDate=`/`?category=`, ordenada por data desc.
- Validações idênticas (categoria, valor > 0 e data obrigatórios; descrição default = categoria).
- Textos especiais de auditoria para vales e exclusão de valores altos (> R$ 1000).
- Trilha de auditoria best-effort (create/update/delete).

## Domínio Cash Closings
Mesmo contrato do legado `/api/cash-closings` (GET lista + POST cria):
- GET com `?limit=` (default 50, máximo 500), ordenado por data fim desc.
- POST com validações idênticas (período/start/end obrigatórios; valores financeiros obrigatórios; `companyCash` default 0).
- Auditoria `create_cash_closing` com período formatado pt-BR e valores.

## Domínio Material Lists
CRUD de listas de materiais com paridade com o legado `/api/material-lists`:
- Lista (máx. 200) com client resumido (`id/name/phone/address/email`) e itens ordenados por `id` asc; detalhe com client completo + itens.
- Criação/edição com geração de número `LM-YYYY-NNN` (fallback por timestamp em colisão), itens normalizados (quantidade fracionária como `1 1/2`, unidades válidas, preço >= 0) e substituição atômica de itens.
- Validações idênticas (client obrigatório/existente, ao menos um material com descrição; PATCH sem campos = 400).
- Helpers de unidade/quantidade centralizados em `modules/common.rs` e reutilizados por `quotes`.
- Trilha de auditoria best-effort (create/update/delete).

## Idempotência em fluxos financeiros
Os POSTs de `payments`, `expenses` e `cash-closings` aceitam o header `Idempotency-Key`:
- Sem header: executa normalmente (sem persistir estado extra).
- Chave nova + sucesso (2xx): status + corpo da resposta são armazenados em `idempotency_keys` (`key`+`userId` como PK) para replay.
- Chave já usada com o mesmo payload: replay da resposta original (não cria duplicado).
- Chave já usada com payload diferente: `409 Conflict`.

Implementação em `modules/common.rs` (`run_with_idempotency` + `request_hash`). Schema/migração: `prisma/migrations/20260804_idempotency_keys/migration.sql`.

## Testes de integração por contrato
`tests/contract.rs` exercita os contratos HTTP contra o banco real (via `build_app` em `lib.rs`):
- CRUD completo de `material-lists` (POST → GET → PATCH → DELETE → 404).
- Idempotência em `expenses`, `payments` e `cash-closings`: POST com mesma `Idempotency-Key` não duplica a linha.
- Conflito: mesma chave com payload diferente retorna `409`.

Quando `DATABASE_URL` não está disponível (ex.: CI), os testes são pulados silenciosamente. Para rodar localmente com banco:
```bash
$env:DATABASE_URL = "<url>"
cargo test --test contract
```

## Qualidade
```bash
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
cargo test
```

## Rollout
- O Next.js encaminha para Rust apenas quando:
  - `RUST_API_BASE_URL` está configurada
  - percentual de rollout do domínio (`MIGRATION_*_ROLLOUT`) permite
