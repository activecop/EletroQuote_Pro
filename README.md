# ⚡ ELETROQUOTE PRO

**“Do primeiro ponto ao orçamento final.”**

Plataforma web profissional de orçamentação de empreitadas elétricas para empreiteiros,
empresas e profissionais de instalações elétricas.

## Funcionalidades

- **Dashboard** com KPIs (orçamentos do mês, em aberto, aprovados, valor orçamentado, valor ganho, margem média, obras em execução), evolução semanal/mensal/trimestral/anual e distribuição por estado.
- **Orçamentos** com numeração automática `ORC-2026-0001`, versões (`V1 → V2 → V3`) com histórico, estados (rascunho, enviado, em negociação, aprovado, recusado, expirado, em execução, concluído), duplicação e eliminação.
- **Editor** com sistema de linhas por tipo (material, mão de obra, equipamento, serviço, outro), categoria/subcategoria, unidade, quantidade, **desperdício**, custo interno, **margem**, desconto, IVA por linha, margem global, desconto global (% e €), despesas adicionais (fixas ou percentuais) e painel de resumo financeiro em tempo real.
- **Biblioteca de categorias elétricas** (quadros, tomadas, iluminação, ITED, cablagem, tubagem, mecanismos, mão de obra, equipamentos) + categorias personalizadas.
- **Biblioteca de Preços** com pesquisa instantânea, filtros, ordenação, favoritos, duplicação e margem calculada.
- **Modelos de orçamento** (Moradia T3, ITED, Wallbox…) reutilizáveis num clique.
- **Proposta profissional** pré-visualizável e **PDF A4** (jsPDF + autotable) com paginação “Página X de Y”, logótipo da empresa, totais e assinaturas.
- **Partilha** via Web Share API (ficheiro PDF), email, WhatsApp e cópia de resumo.
- **Clientes** com histórico e valor contratado; **Relatórios** com filtros por período e exportação CSV.
- **Definições da empresa** (logótipo incluído nos PDFs), padrões de IVA/validade/pagamento.
- **Backup/Restauro** JSON e exportação CSV; dados 100% locais (`localStorage`).
- **Modo dia / modo noite** com preferência persistente.
- **PWA**: manifest + service worker, instalável e utilizável offline.

## Arquitetura

```
src/
├── App.tsx            → router + shell
├── store.tsx          → estado global, persistência, tema, toasts
├── types.ts           → modelo de dados
├── calc.ts            → motor de cálculo (cêntimos inteiros, sem erros de arredondamento)
├── data.ts            → categorias elétricas + dados de demonstração
├── pdf.ts             → geração do PDF A4 profissional
├── components/        → ui kit, gráficos SVG, layout
└── pages/             → dashboard, orçamentos, editor, proposta, clientes,
                         biblioteca, modelos, relatórios, definições
public/                → manifest.json, service worker, ícones
```

Todos os valores monetários são calculados em **cêntimos inteiros**, evitando erros de
virgula flutuante. Nenhum dado sai do dispositivo.
