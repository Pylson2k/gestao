# Backend Rust (Fase Progressiva)

Serviço Axum para migração por domínio via `/api/v2` com gateway no Next.js.

## Executar local
1. Configure `DATABASE_URL`
2. (Opcional) Configure `RUST_API_BIND` (default `0.0.0.0:4000`)
3. Rode:

```bash
cargo run
```

## Endpoints iniciais
- `GET /health`
- `GET /v2/status`
- `GET/POST /v2/clients`
- `GET/PUT/DELETE /v2/clients/:id`
- `GET/POST /v2/services`
- `GET/PUT/DELETE /v2/services/:id`

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
