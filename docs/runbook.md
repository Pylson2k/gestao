# Runbook de Produção

## Checklist pré-release
- Executar `npm run quality`.
- Validar login, criação/edição de orçamento, pagamento e backup/restauração.
- Confirmar que variáveis de ambiente obrigatórias estão definidas (`DATABASE_URL`).

## Monitoramento inicial após deploy
- Acompanhar erros de autenticação em rotas `/api/*`.
- Verificar tempo de resposta das rotas críticas: `/api/quotes`, `/api/payments`, `/api/services`.
- Conferir geração de PDF em desktop e mobile.

## Procedimento de rollback
1. Reverter para a última tag estável no provedor de deploy.
2. Rodar smoke test manual dos fluxos críticos.
3. Registrar incidente (causa, impacto, mitigação e ação preventiva).

## Incidentes comuns
- **401/403 inesperado**: validar header `x-user-id`, sessão e regras do `middleware`.
- **Falha no PDF**: usar fallback de impressão e validar carregamento do bundle `html2pdf`.
- **Banco indisponível**: confirmar `DATABASE_URL`, rede e status do provedor.

