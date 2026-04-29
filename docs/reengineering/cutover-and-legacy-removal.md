# Cutover Final e Desativação Legada

## Pré-cutover
- Domínios com 100% em `/api/v2` por no mínimo 7 dias.
- SLOs estáveis por 3 janelas consecutivas.
- Sem incidentes P1/P2 em fluxos críticos.
- Backups e plano de rollback testados.

## Execução do cutover
1. Congelar releases paralelos.
2. Fixar flags de leitura/escrita em Rust.
3. Monitorar SLOs em tempo real por 2h.
4. Validar checklist de produto (login, clientes, serviços, orçamento, pagamentos, PDF).

## Pós-cutover
- Manter dual-read somente para auditoria por janela definida.
- Remover endpoints v1 de domínios estabilizados.
- Aplicar fase contract no banco (drop de colunas/tabelas temporárias).

## Desativação do legado
- Remover rotas e serviços legados por domínio.
- Limpar feature flags obsoletas.
- Atualizar runbook final de operação e incidentes.
