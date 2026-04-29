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

## Rollout
- O Next.js encaminha para Rust apenas quando:
  - `RUST_API_BASE_URL` está configurada
  - percentual de rollout do domínio (`MIGRATION_*_ROLLOUT`) permite
