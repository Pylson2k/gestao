# Plano de Migração de Banco (Expand/Contract)

## Objetivo
Evoluir o schema sem interromper leitura/escrita do sistema legado durante coexistência com backend Rust.

## Estratégia
1. **Expand**: adicionar novas colunas/tabelas sem remover antigas.
2. **Dual-write**: legado e Rust escrevem em estruturas compatíveis.
3. **Backfill**: preencher dados históricos em lotes.
4. **Read switch**: migrar leitura para schema canônico por domínio.
5. **Contract**: remover legado somente após estabilidade e auditoria.

## Mudanças canônicas previstas
- Tabela `api_migration_control` para rastrear status por domínio.
- Tabela `outbox_events` para sincronização segura e idempotente.
- Índices compostos para consultas de orçamento/pagamento por usuário e data.
- Colunas de rastreabilidade (`source_system`, `version_tag`) em entidades críticas.

## Operação sem downtime
- Migrations pequenas e reversíveis.
- Janela de deploy sem lock pesado.
- Feature flags para controle de caminho de leitura/escrita.

## Rollback
- Reverter leitura para campos/tabelas legadas.
- Manter estruturas antigas durante janela de estabilização.
