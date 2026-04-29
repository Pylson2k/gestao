# Baseline Funcional e Mapa de Riscos

## Fluxos críticos atuais
- Autenticação gestor: `POST /api/auth/login`
- Gestão de clientes: `GET/POST/PUT/DELETE /api/clients`
- Gestão de serviços: `GET/POST/PUT/DELETE /api/services`
- Orçamentos: `GET/POST/PUT/DELETE /api/quotes`
- Pagamentos e recibos: `GET/POST/PUT/DELETE /api/payments`
- Listas de materiais: `GET/POST/PATCH/DELETE /api/material-lists`
- Configurações da empresa: `GET /api/bootstrap`, `PUT /api/company`

## Domínios para migração progressiva
1. Auth/Profile
2. Clients/Services
3. Quotes/MaterialLists
4. Payments/Expenses
5. Audit/Reporting

## Riscos técnicos por domínio
- **Auth:** dependência de estratégia atual por header e middleware/proxy.
- **Quotes/Payments:** fluxo com alto acoplamento UI + API + PDF.
- **MaterialLists:** múltiplos usos em operação e orçamento.
- **Audit:** trilha de auditoria não pode ser interrompida no cutover.

## Matriz de risco (impacto x probabilidade)
- Alta/Alta: regressão em criação/edição de orçamento.
- Alta/Média: inconsistência de pagamento durante dual-write.
- Média/Alta: divergência de UI entre rotas legadas e v2.
- Média/Média: latência extra no proxy de coexistência.

## Estratégia de mitigação
- Canary por domínio com rollback rápido.
- Contratos de API versionados (`/api/v1` legado, `/api/v2` novo).
- Teste de paridade funcional por fluxo crítico.
- Shadow traffic para validar backend Rust sem corte de tráfego inicial.
