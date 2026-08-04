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

## Domínios implementados no Rust
- `clients` — CRUD `/v2/clients` com paridade ao legado, busca, `_count.quotes` e auditoria.
- `services` — CRUD `/v2/services` com paridade ao legado, filtros `isActive`/`search`, escopo por proprietário e auditoria.
- Teste de paridade (shadow traffic): `npm run db:parity` (`scripts/parity-check.ts`) compara leituras do legado (`/api/*` via Next) com o Rust (`/v2/*`) e reporta divergências.

Próximo passo: ligar rollout `MIGRATION_CLIENTS_ROLLOUT=100` / `MIGRATION_SERVICES_ROLLOUT=100` + `RUST_API_BASE_URL` e executar `npm run db:parity` com ambos os serviços de pé.
