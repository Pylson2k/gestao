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
