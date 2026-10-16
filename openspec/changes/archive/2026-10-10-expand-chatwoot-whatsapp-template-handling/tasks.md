## 1. Inventário e fixtures

- [x] 1.1 Inspecionar os tipos protobuf da versão instalada do Baileys e os caminhos reais de recepção para consolidar no inventário as variantes, campos, mídia, resposta, testes e limitações; verificar revisando `design.md` e fixtures anonimizadas.
- [x] 1.2 Criar fixtures anonimizadas e um teste finito para botões, templates hidratados e estruturados, listas, native flows, carrosséis, respostas e wrappers; verificar que casos válidos, ausentes, vazios e inválidos são exercitados sem credenciais externas.

## 2. Normalização de mensagens interativas

- [x] 2.1 Implementar tipos, guards, abertura limitada de wrappers e redetecção da família para produzir um resultado normalizado interno; verificar que wrappers aninhados e metadados anteriores ao conteúdo preservam a família e o contexto corretos.
- [x] 2.2 Implementar extratores de textos, opções, ações, cartões e mídia para botões, templates, listas, native flows e carrosséis; verificar que ações externas não aparecem como escolhas numéricas e que IDs e origem de cartão ou seção são preservados.
- [x] 2.3 Implementar extração explícita das quatro famílias de resposta, incluindo `interactiveResponseMessage` e parse seguro e independente de `paramsJson` e `buttonParamsJson`; verificar JSON válido, ausente, vazio, inválido e sem ID universal.
- [x] 2.4 Substituir a renderização dispersa do Chatwoot pelo resultado normalizado e adicionar fallback para conteúdo parcial ou desconhecido; verificar que eventos internos permanecem fora da conversa e que uma mensagem de conteúdo não é silenciosamente descartada.

## 3. Estado e envio de opções numéricas

- [x] 3.1 Estender o estado em cache para identificar instância, conversa, participante quando disponível, mensagem de origem, direção, versão, opção e agrupamento; verificar TTL de 1.800 segundos, menus sucessivos, conversas concorrentes e seleção fora do intervalo.
- [x] 3.2 Associar respostas por citação explícita antes do fallback de menu ativo e manter o rótulo como texto citado no envio; verificar os dois sentidos do fluxo, IDs nativos distintos de índices e ausência de associação para números comuns.
- [x] 3.3 Tornar a supressão de assinatura local por envio e condicionar a remoção de estado à origem correta; verificar por teste que um envio interativo simultâneo não altera assinatura ou estado de outra conversa.

## 4. Mídia e regressões de integração

- [x] 4.1 Conectar as mídias normalizadas de templates, cabeçalhos interativos e cartões ao downloader e encaminhamento existentes; verificar mídia presente e ausente sem duplicação de mensagem ou base64 adicional.
- [x] 4.2 Executar regressões de PIX, catálogos, pedidos, enquetes, listas, mensagens de texto, mídia e citações; verificar que o comportamento existente não muda e documentar variantes cuja capacidade seja apenas parcial ou fallback.

## 5. Validação e documentação operacional

- [x] 5.1 Atualizar a matriz de cobertura, exemplos anonimizados de entrada e resultado normalizado e o roteiro manual de instância de teste; verificar que a documentação distingue fixture sintética, extração, envio textual e envio nativo não suportado.
- [x] 5.2 Executar `openspec validate --strict`, typecheck/build, lint e os testes finitos aplicáveis; verificar que os resultados e limitações de serviços ou credenciais indisponíveis estão registrados na entrega.
