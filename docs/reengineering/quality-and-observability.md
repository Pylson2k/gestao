# Qualidade, SLOs e Hardening Operacional

## SLOs de migração
- Disponibilidade API: >= 99.9%
- Erro 5xx por domínio migrado: < 1%
- P95 de latência por endpoint crítico: <= 350ms
- Taxa de sucesso de fluxos críticos (login, orçamento, pagamento): >= 99%

## Camadas de teste
- Unit: engine de cálculo, regras de domínio, adapters.
- Integração: API v1/v2 com banco e contratos.
- E2E: fluxos críticos no frontend legado e v2.
- Regressão visual: telas de orçamento e pagamentos.

## Gates obrigatórios de pipeline
- `npm run lint`
- `npm run test`
- `npm run build`
- `backend-rust`: `cargo fmt --check`, `cargo clippy`, `cargo test`

## Observabilidade
- Logs estruturados com correlation id.
- Métricas por versão de API (`v1` vs `v2`).
- Alertas para erro, latência e saturação.
- Dashboards por domínio em rollout canário.

## Hardening
- Validação forte de entrada em todos os endpoints.
- Idempotência em fluxos financeiros.
- Rollback documentado por fase e testado antes do aumento de tráfego.
