# Calculadora Profissional de Obra

## Estrutura implementada
- `modules/calculator/engine`: motor central desacoplado.
- `modules/calculator/catalog`: coeficientes técnicos e perdas por padrão.
- `modules/calculator/modules/mvp`: pintura, piso, concreto.
- `modules/calculator/modules/advanced`: estrutural, acabamentos, instalações, gestão, drywall/serralheria.
- `modules/calculator/services`: composição do projeto completo e orçamento.
- `app/calculadora`: interface principal de simulação.

## Padrões técnicos
- Perdas configuráveis por módulo e padrão da obra.
- Arredondamento inteligente para peça/caixa/lote.
- Cálculo de orçamento com custo direto, indireto e margem.
- Saída em lista de materiais reutilizável por adaptadores.

## Próximos incrementos sugeridos
- Persistência de simulações e cenários por cliente.
- Exportação de orçamento técnico para PDF em layout dedicado.
- Integração automática para criação de lista de materiais no fluxo existente.

