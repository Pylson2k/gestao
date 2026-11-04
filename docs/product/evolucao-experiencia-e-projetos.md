# Evolução do produto Gestão — experiência e gestão de projetos

> Documento-base de produto e implementação. Esta proposta preserva os fluxos existentes e evolui o produto por entregas pequenas, testáveis e reversíveis.

## Objetivo

Evoluir o Gestão de um sistema centrado em orçamento/financeiro para uma plataforma integrada de gestão de serviços e obras: comercial → projeto/obra → planejamento → execução → equipe → financeiro → encerramento.

A experiência deve ser simples para operação em campo e suficientemente completa para gestão. Não copiar a complexidade de ClickUp/Asana: adotar seus melhores padrões com foco em pequenas empresas de serviços e obras.

## Diagnóstico confirmado no repositório

- O modelo `Quote` concentra o ciclo comercial e parte do ciclo operacional em `status` (draft, sent, approved, rejected, in_progress, completed, cancelled), além de `serviceStartedAt` e `serviceCompletedAt`.
- Existem entidades para clientes, itens de serviço/material, pagamentos, despesas, funcionários, presença e vales.
- Não há modelos próprios para projeto/obra, etapa, tarefa, subtarefa, dependência, comentário, anexo ou atividade de projeto.
- O portal `/trabalhador` ainda trata as APIs de atribuições como não implementadas (501).
- A navegação atual distribui rotas entre `/dashboard`, `/orcamentos`, `/financeiro`, `/operacao` e `/getao`; há oportunidades de consolidar a arquitetura de informação sem quebrar URLs existentes.
- `/v2` é uma tela de validação da camada de gateway, não uma interface de produto pronta.
- O projeto usa Next.js 16, React 19, TypeScript, Prisma/PostgreSQL, Tailwind e componentes Radix/shadcn-style. Scripts de qualidade: `npm run lint`, `npm test`, `npm run build` e `npm run quality`.

## Princípios de produto

1. **Uma fonte de verdade:** orçamento aprovado pode originar um projeto, mas orçamento e projeto mantêm estados e responsabilidades distintos.
2. **Mesmo dado, várias visualizações:** quadro, lista, calendário e cronograma Gantt consultam o mesmo conjunto de tarefas; não duplicar tarefas por visualização.
3. **Ação com contexto:** abrir detalhes de tarefa em painel lateral preserva o quadro/cronograma e o contexto de navegação.
4. **Mobile-first operacional:** toda ação por arrastar deve ter alternativa acessível por menu/controles; não depender exclusivamente de hover ou drag-and-drop.
5. **Feedback explícito:** loading, vazio, erro, sucesso, offline/sincronização e confirmação de ações destrutivas.
6. **Progressive enhancement:** preservar rotas, dados e fluxos atuais; introduzir novas capacidades gradualmente.
7. **Segurança por propriedade:** toda consulta e mutação de projeto/tarefa deve validar o usuário/empresa autenticado no servidor. Nunca confiar em IDs enviados pelo cliente.
8. **Financeiro consistente:** valores financeiros existentes não devem ser recalculados ou alterados implicitamente por mudança de status de tarefa.

## Arquitetura de informação proposta

- **Visão geral:** painel, agenda do dia, pendências, indicadores e atividade recente.
- **Projetos e obras:** portfólio, quadro, lista, calendário, cronograma e equipe.
- **Comercial:** clientes, orçamentos e listas de materiais.
- **Equipe:** funcionários, presença, atribuições e pagamentos de equipe.
- **Financeiro:** faturamento, pagamentos, despesas, inadimplência e relatórios.
- **Administração:** empresa, perfil, permissões, auditoria e configurações.

Manter compatibilidade com URLs atuais. Novos itens de navegação podem apontar para rotas novas; rotas antigas devem continuar funcionando até migração validada.

## Modelo de domínio proposto

### Project (Projeto/Obra)
- id, userId, clientId, quoteId opcional e único quando aplicável
- name, description, status (planning, active, on_hold, completed, cancelled)
- startDate, dueDate, completedAt
- createdAt, updatedAt
- relações: tasks, members, milestones, activities

### ProjectTask (Tarefa)
- id, projectId, parentTaskId opcional
- title, description, status configurável por workflow (todo, in_progress, review, blocked, done)
- priority (low, normal, high, urgent)
- startDate, dueDate, completedAt
- assigneeFuncionarioId opcional; preparar vínculo futuro com usuários do sistema sem presumir que funcionário é conta de login
- position para ordenação estável no quadro/lista
- progress opcional; evitar percentual manual obrigatório em tarefas simples
- createdAt, updatedAt

### Relações auxiliares em etapas posteriores
- ProjectMember: participação e papel no projeto
- TaskDependency: predecessor/successor e tipo de dependência
- TaskChecklistItem: checklist ordenável
- ProjectActivity: auditoria legível de mudanças
- TaskComment e TaskAttachment: comunicação e evidências
- ProjectMilestone: marcos do cronograma

### Regras fundamentais
- Converter orçamento aprovado em projeto deve ser idempotente: não criar dois projetos para o mesmo orçamento.
- Projeto pode existir sem orçamento (serviço avulso).
- Alterar status da tarefa não altera status do orçamento.
- Finalizar orçamento/serviço não deve concluir automaticamente tarefas sem confirmação explícita.
- Tarefas concluídas não podem ser movidas para trás silenciosamente; registrar histórico.
- Exclusão deve considerar dependências e oferecer arquivamento quando houver histórico.
- Datas devem ser persistidas com semântica consistente e exibidas no fuso local da empresa/usuário.
- Percentual do projeto deve ser calculado de forma previsível a partir de tarefas/etapas; pesos devem ser recurso posterior, não requisito do MVP.

## Experiência do módulo Projetos

### Portfólio
- Título, busca, filtros por status/responsável/cliente/prazo e ordenação.
- Cards/lista com cliente, progresso, próxima entrega, prazo e alerta de atraso.
- Ações: abrir, editar, pausar, arquivar e criar projeto.
- Ação “Criar projeto a partir de orçamento aprovado”.

### Quadro Kanban (MVP)
- Colunas: A fazer, Em andamento, Em revisão, Bloqueado, Concluído.
- Contagem por coluna e estados vazios úteis.
- Cards com título, responsável, prazo, prioridade e sinalização de atraso.
- Drag-and-drop com persistência no servidor, optimistic UI e rollback em falha.
- Alternativa acessível por menu “Mover para”.
- Reordenação estável com position; tratar concorrência e evitar duplicação/perda.
- Filtros por responsável, prioridade, prazo e texto.
- Criar tarefa na coluna e abrir painel lateral de detalhes.
- Não implementar WIP limits ou automações complexas no primeiro corte.

### Detalhe da tarefa
- Painel lateral/drawer responsivo: título, descrição, status, prioridade, responsável, datas, checklist e atividade.
- Ações de salvar, cancelar, excluir/arquivar com confirmação.
- Teclado, foco e leitor de tela devidamente suportados.
- No celular, painel ocupa tela e oferece controles grandes; drag-and-drop não é obrigatório.

### Visualizações posteriores
- Lista: agrupamento por status/responsável e edição rápida.
- Calendário: tarefas por data/prazo.
- Gantt: duração, dependências, marcos, escala dia/semana/mês e caminho crítico apenas quando houver base confiável.
- Equipe: carga e disponibilidade, sem atribuições conflitantes.

## Melhorias transversais de UX

- Busca global com resultados agrupados por clientes, orçamentos, projetos, tarefas e pagamentos.
- Paleta de comandos (Ctrl/Cmd+K) depois que a busca estiver estável.
- Ações rápidas no dashboard.
- Navegação com seções consistentes, ativo claramente indicado, sidebar recolhível e menu mobile.
- Componentes compartilhados para PageHeader, filtros, tabelas/listas, empty states, skeletons, confirmação e toast.
- Formulários com validação próxima ao campo, preservação de dados e prevenção de perda acidental.
- Tabelas com filtros claros, ordenação, paginação quando necessário e layout mobile apropriado.
- Preferências de visualização persistidas por usuário somente quando houver infraestrutura adequada.
- Acessibilidade WCAG 2.2 AA como meta: foco visível, contraste, labels, alvos de toque, teclado e alternativa ao arrastar.

## Roadmap de entrega

### Entrega 0 — Fundamentos e auditoria
- Mapear shell, navegação, tokens, padrões de página e componentes duplicados.
- Inventariar rotas e fluxos existentes, sem alterar comportamento.
- Identificar contratos de autenticação, escopo por usuário e padrões de API.
- Definir testes de regressão para orçamento, financeiro e PWA.
- Resultado: mapa de arquitetura e backlog técnico priorizado.

### Entrega 1 — UX base
- Consolidar navegação por áreas sem remover URLs antigas.
- Padronizar cabeçalhos, espaçamentos, estados vazios, carregamento e erros.
- Melhorar dashboard como centro de comando, preservando os indicadores existentes.
- Corrigir filtros inconsistentes e pontos de responsividade confirmados.
- Resultado: interface consistente sem regressão funcional.

### Entrega 2 — Projetos + Kanban MVP
- Adicionar modelos e migração Prisma compatível com dados atuais.
- Implementar APIs autenticadas e autorizadas.
- Criar portfólio de projetos e conversão idempotente de orçamento.
- Criar quadro com tarefas, status, prioridade, prazo, responsável e movimentação.
- Criar painel lateral e alternativa acessível para mover cards.
- Adicionar testes de domínio, API e componentes.
- Resultado: ciclo básico de execução utilizável em desktop e mobile.

### Entrega 3 — Cronograma e equipe
- Calendário e Gantt com dependências e marcos.
- Atribuições e disponibilidade de equipe.
- Portal do trabalhador integrado com permissões adequadas.
- Evidências/fotos e histórico de execução.

### Entrega 4 — Inteligência operacional e produto comercial
- Custos e rentabilidade por projeto.
- Automações e notificações.
- Onboarding, multiempresa, papéis/permissões e planos, após auditoria do modelo de tenancy atual.

## Critérios de aceite obrigatórios

- Nenhuma regressão em criar/editar orçamento, PDF, pagamentos, despesas, fechamento de caixa, clientes e PWA.
- Todas as rotas existentes continuam acessíveis.
- Toda leitura/escrita de projeto e tarefa valida autenticação e propriedade no servidor.
- Atualização de status e posição é persistida e recuperável após reload.
- Falha de rede reverte estado otimista e informa o usuário.
- Drag-and-drop possui alternativa por teclado/toque.
- Layout funcional a partir de 320px, sem overflow horizontal não intencional.
- Estados de carregamento, erro, vazio e sucesso implementados.
- TypeScript sem erros; testes passam; build de produção passa.
- Não marcar uma fase como concluída sem evidência dos comandos executados.

## Fora do escopo inicial

- Reescrever o sistema inteiro.
- Substituir Prisma/PostgreSQL ou migrar para Rust por motivação estética.
- Implementar billing/assinaturas antes de validar tenancy e permissões.
- Criar automações complexas antes do fluxo básico de projetos estar estável.
- Mudar identidade visual sem auditoria das telas e tokens atuais.

## Referências de produto

- ClickUp: https://clickup.com/features
- ClickUp Views: https://help.clickup.com/hc/en-us/articles/6310138874391-Intro-to-Views
- Linear: https://linear.app/
- Asana Project Management: https://asana.com/features/project-management
- monday.com: https://monday.com/projects/features
- WCAG 2.2: https://www.w3.org/TR/WCAG22/

Essas referências são inspiração de padrões e funcionalidades, não requisitos para reproduzir integralmente os concorrentes.
