## Context

O serviço Chatwoot já recebe `messageRaw.message` depois de `prepareMessage`, e a integração atual abre alguns wrappers, extrai botões de `buttonsMessage` e `interactiveMessage.nativeFlowMessage`, renderiza listas e mantém estado em cache por instância e conversa com TTL de 1.800 segundos. A extração ainda depende de condições espalhadas, `getTypeMessage` escolhe o primeiro campo conhecido e não há tratamento explícito para `interactiveResponseMessage`. Veja `proposal.md` para a motivação.

## Goals / Non-Goals

**Goals:**

- Centralizar a descoberta, abertura, normalização e renderização de conteúdo interativo sem alterar a forma bruta publicada pelo webhook.
- Preservar a semântica existente do atendimento numérico e torná-la segura para várias famílias, direções e menus concorrentes.
- Reutilizar o download de mídia e manter PIX, catálogos, pedidos, enquetes, listas, citações e mensagens comuns fora de regressão.
- Deixar explícitas a cobertura comprovada, os fallbacks e as limitações do envio nativo.

**Non-Goals:**

- Atualizar Baileys, migrar dados ou acrescentar dependências apenas para obter variantes novas.
- Alegar que o envio de um rótulo de texto simula um clique nativo ou executar ações externas sem suporte do provedor.
- Publicar payloads brutos, parâmetros pessoais ou detalhes de protocolo na conversa do atendente.

## Decisions

### Normalizador interno extensível

Criar um normalizador tipado no domínio Chatwoot que recebe a mensagem aberta e produz texto, opções, ações, cartões, mídia, resposta selecionada, citação, avisos e classificação de suporte. A renderização e o estado numérico consomem esse resultado, enquanto `messageRaw.message` continua bruto. Isto evita repetir seleção de campos em `getMessageContent`, `extractButtonsFromMessage` e `getSelectedButtonFromPayload`.

Alternativas consideradas:

- Adicionar mais `if`s nos métodos atuais: rejeitada por continuar a perder metadados e dificultar variantes futuras.
- Converter a mensagem para texto com helpers do Baileys: rejeitada como fonte única porque pode descartar botões, cartões e mídia.

### Abertura defensiva de wrappers e redetecção da família

Abrir `ephemeralMessage`, `viewOnceMessage`, `viewOnceMessageV2`, `viewOnceMessageV2Extension`, `associatedChildMessage` e `deviceSentMessage` quando presentes, com profundidade máxima fixa e guards para objetos vazios. Após cada abertura, redetectar a família pelos campos de conteúdo conhecidos, ignorando metadados como `messageContextInfo`.

Alternativas consideradas:

- Usar sempre a primeira chave de `message`: rejeitada porque envelopes e metadados podem preceder o conteúdo.
- Abrir wrappers sem limite: rejeitada para evitar payloads recursivos ou malformados.

### Opções e ações têm contratos diferentes

Cada opção normalizada terá índice apresentado, ID original, rótulo, tipo de ação e origem de cartão ou seção. Só opções selecionáveis entram no mapa numérico. URL, telefone, cópia, PIX e ações desconhecidas são renderizadas separadamente, preservando os parâmetros para diagnóstico interno. `buttonParamsJson` e `paramsJson` são analisados independentemente, com limite de tamanho e resultado de parse que retém a cadeia original e o erro sem registrar conteúdo sensível.

Alternativas consideradas:

- Numerar toda ação visível: rejeitada porque um texto enviado pelo atendente não executa uma ação nativa.
- Assumir `id`/`title` em todos os JSONs: rejeitada porque native flows não possuem formato universal.

### Estado de menu identificado e atualização condicional

O cache continuará usando o TTL atual de 1.800 segundos, mas o valor guardará instância, conversa, JID ou participante quando disponível, mensagem de origem, direção, opções e versão/tempo do estado. Citações explícitas prevalecem; o fallback só considera um menu ativo compatível e não ambíguo. Ao consumir ou limpar estado, a operação verificará se o estado ainda corresponde à mensagem processada para não apagar um menu posterior.

Alternativas consideradas:

- Usar apenas o último menu da conversa: rejeitada porque associa respostas antigas ou números casuais ao menu errado.
- Persistir um novo modelo de banco: adiada; o TTL curto e a infraestrutura de cache existente atendem o fluxo atual.

### Renderização e mídia orientadas ao resultado normalizado

O texto para Chatwoot será composto uma vez por mensagem a partir de título, corpo, rodapé, seções, cartões e fallback. Mídias normalizadas apontarão para o caminho atual de download sem duplicar base64. PIX mantém o tratamento especial existente. A assinatura será decidida por variáveis locais do envio, sem mutar `provider.signMsg` ou `provider.signDelimiter`.

### Matriz de cobertura comprovada

A matriz foi conferida contra os tipos protobuf de `baileys@7.0.0-rc.9`, os caminhos de `prepareMessage` e `getBase64FromMediaMessage`, e as fixtures sintéticas em `test/fixtures/chatwoot/interactive-messages.json`.

| Família ou variante | Extração e renderização | Evidência automatizada | Limite conhecido |
| --- | --- | --- | --- |
| `buttonsMessage` | Texto, opções, ID e cabeçalho de mídia compatível | Fixture `buttons` | Apenas opções selecionáveis entram no fluxo numérico |
| `hydratedTemplate` e `hydratedFourRowTemplate` | Texto, botões rápidos, URL/telefone separados e imagem/vídeo/documento compatível | Fixture `hydratedTemplate` | Ações externas continuam somente informativas |
| `fourRowTemplate` | Campos altamente estruturados por `fallbackLg`/`fallbackLc`, botões e mídia compatível | Fixture `fourRowTemplate` | Campos estruturados sem texto de fallback ficam parciais |
| `interactiveMessageTemplate` | Reutiliza a extração de native flow e carrossel | Fixture `interactiveTemplate` | Não envia clique nativo |
| `interactiveMessage.nativeFlowMessage` | Opções, ações URL/telefone/cópia/pagamento e parâmetros seguros | Fixture `nativeFlow` | Formato de `buttonParamsJson` sem ID universal é parcial |
| `interactiveMessage.carouselMessage` | Cartões, origem do cartão, opções e primeira mídia compatível | Fixture `carousel` | Somente a primeira mídia compatível é encaminhada; não há envio nativo de cartão |
| `listMessage` e `listResponseMessage` | Seções, linhas, IDs distintos e resposta | Fixture `list` e `responses.list` | Associação requer menu compatível ou citação |
| Respostas de botão/template/lista/native flow | ID, rótulo, cartão, nome/versão e JSON válido, vazio ou inválido | Fixtures `responses.*` | Dados de protocolo não são expostos ao atendente |
| PIX, catálogo, pedido, enquete, anúncio e mídia comum | Caminhos existentes preservados; PIX continua especial | Regressão de código e roteiro manual | Serviços externos e payloads criptografados exigem validação no ambiente integrado |
| Famílias futuras de conteúdo | Fallback identificado sem payload bruto | Fixture `unknown` | Não há promessa de ação nativa |

### Exemplos anonimizados de resultado normalizado

- Um `hydratedTemplate` com botão rápido `morning` e CTA URL resulta em uma opção `{ index: 1, id: 'morning', label: 'Manhã' }` e uma ação `url` fora da numeração.
- Um carrossel guarda `cards` com índice, título e corpo, enquanto cada opção mantém `cardIndex`; isso impede que rótulos repetidos percam sua origem.
- Uma `interactiveResponseMessage` com `paramsJson` inválido preserva a cadeia somente no resultado interno, marca `paramsParseError: 'invalid_json'` e apresenta fallback seguro na conversa.

### Roteiro manual de instância de teste

O roteiro detalhado de validação integrada está em `manual-validation.md`. As fixtures são sintéticas, sem credenciais, telefones reais ou payloads de clientes. O envio para WhatsApp mantém o contrato atual: o rótulo é enviado como texto citado, e não como clique nativo.

## Risks / Trade-offs

- [A forma de campos do protocolo variar entre releases] → usar guards e manter a cobertura ligada à versão instalada e às fixtures.
- [Um número comum ser interpretado como escolha] → aceitar somente expressão numérica inteira quando houver estado compatível ou citação explícita.
- [Resposta antiga apagar menu novo] → comparar origem e versão do estado antes de limpar ou consumir.
- [Falha de parse ocultar informação útil] → preservar a string original internamente e renderizar uma indicação parcial sem despejar JSON.
- [Mídia interativa não ser baixável pelo caminho atual] → enviar texto e fallback parcial, documentando a limitação no inventário.

## Migration Plan

1. Introduzir o normalizador e fixtures sem alterar o payload de webhook ou o esquema de banco.
2. Trocar os consumidores de conteúdo, opções, respostas e mídia pelo resultado normalizado de forma compatível.
3. Executar validação OpenSpec, typecheck, lint e testes finitos antes de disponibilizar a mudança.
4. Fazer rollout como alteração compatível; rollback consiste em reverter o código da mudança, pois o estado em cache expira em até 1.800 segundos e não há migração persistente.
