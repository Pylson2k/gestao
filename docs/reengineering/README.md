# Reengenharia Total: Front + Back + Banco

## Entregáveis implementados nesta fase
- `baseline-and-risk-map.md`: baseline funcional e mapa de riscos.
- `target-architecture.md`: coexistência legacy + Rust com versionamento.
- `database-migration-plan.md`: estratégia expand/contract sem downtime.
- `quality-and-observability.md`: SLOs, testes em camadas e hardening.
- `cutover-and-legacy-removal.md`: checklist de corte final e remoção legada.

## Artefatos técnicos adicionados
- Gateway v2 no Next: `app/api/v2/[...path]/route.ts`
- Feature flags de rollout: `lib/migration-flags.ts`
- Estratégia de roteamento Rust: `lib/rust-gateway.ts`
- Frontend progressivo v2: `app/v2/page.tsx`, `components/v2/shell.tsx`
- Backend Rust inicial: `backend-rust/*`
- Workflow CI Rust: `.github/workflows/rust-quality.yml`
- Migração expand inicial: `prisma/migrations/20260428_expand_coexistence/migration.sql`
- Migração de idempotência: `prisma/migrations/20260804_idempotency_keys/migration.sql` (tabela `idempotency_keys`)

## Hardening aplicado (item 2 do roadmap)
- Idempotência nos POSTs financeiros (`payments`, `expenses`, `cash-closings`) via header `Idempotency-Key`: replay da resposta original em retry, `409` quando a mesma chave é reutilizada com payload diferente. Helper `run_with_idempotency`/`request_hash` em `backend-rust/src/modules/common.rs`.
- Testes de integração por contrato em `backend-rust/tests/contract.rs` (CRUD de `material-lists` + idempotência em `expenses`/`payments`/`cash-closings` + conflito `409`), gateados por `DATABASE_URL` (skip silencioso em CI sem banco). Para isso, `main.rs` foi refatorado em `lib.rs` com `build_app` público.
- Gates verdes: `cargo fmt`, `cargo clippy --all-targets -- -D warnings`, `cargo test` (23 unit + 5 contrato com DB).

## Domínios implementados no Rust
- `clients` — CRUD `/v2/clients` com paridade ao legado, busca, `_count.quotes` e auditoria.
- `services` — CRUD `/v2/services` com paridade ao legado, filtros `isActive`/`search`, escopo por proprietário e auditoria.
- `quotes` — CRUD `/v2/quotes` com shape completo (client, services, materials, payments), geração de número `ORC-YYYY-NNN`, upsert de cliente e auditoria (create/status/discount/total/delete).
- `payments` — CRUD `/v2/payments` com paridade ao legado: validação de método e de excedente ao total do orçamento, sincronização de inadimplência (`clearDelinquencyIfFullyPaid`) e auditoria.
- `expenses` — CRUD `/v2/expenses` com paridade ao legado: filtros `startDate`/`endDate`/`category`, descrição default = categoria, textos especiais de auditoria para vales/valores altos.
- `cash-closings` — GET (lista com `?limit=`) e POST (criação com validações e auditoria `create_cash_closing`) em `/v2/cash-closings`, exatamente como o legado `/api/cash-closings`.
- `material-lists` — CRUD `/v2/material-lists` com paridade ao legado: lista (200, com client resumido + itens por `id` asc), detalhe (client completo + itens), criação/edição com geração de número `LM-YYYY-NNN` (fallback por timestamp), itens normalizados (quantidade fracionária, unidades válidas, preço >= 0), substituição atômica de itens e auditoria (create/update/delete). Helpers de unidade/quantidade extraídos para `modules/common.rs` e reutilizados por `quotes` e `material_lists`.

- Teste de paridade (shadow traffic): `npm run db:parity` (`scripts/parity-check.ts`) compara leituras do legado (`/api/*` via Next) com o Rust (`/v2/*`) e reporta divergências.

Próximo passo: ligar rollout `MIGRATION_CLIENTS_ROLLOUT=100` / `MIGRATION_SERVICES_ROLLOUT=100` + `RUST_API_BASE_URL` e executar `npm run db:parity` com ambos os serviços de pé.

## Roadmap restante (fase progressiva)
1. Validar paridade de `payments`/`expenses`/`cash-closings`/`material-lists` com `npm run db:parity` (serviços de pé) — ✅ validado (13/13 PASS).
2. Harden: idempotência em fluxos financeiros e testes de integração por contrato — ✅ aplicado (ver "Hardening aplicado").
3. Aumentar rollout por domínio de 10% → 100% com janelas de observação (`cutover-and-legacy-removal.md`).
