# chatwoot-integration Specification

## Purpose

Definir o espelhamento de conversas entre uma instância WhatsApp e o Chatwoot, preservando a direção, as citações, mídias e os comportamentos interativos atualmente suportados.

## Requirements

### Requirement: Conversas e mensagens são espelhadas entre os canais
Quando a integração está habilitada, o sistema SHALL criar ou localizar a conversa correspondente e espelhar mensagens WhatsApp e Chatwoot com a direção adequada. Mensagens comuns MUST preservar o conteúdo disponível, a identidade externa e a referência de citação quando ela puder ser correlacionada. Mensagens interativas MUST ser normalizadas internamente depois de wrappers suportados, preservando família, variante, textos, rodapé, opções, ações, cartões, mídia, contexto e indicação de suporte parcial, sem alterar o payload bruto de webhook.

#### Scenario: Mensagem WhatsApp recebida
- **WHEN** uma mensagem de conteúdo chega a uma instância com Chatwoot habilitado
- **THEN** o sistema a publica como mensagem de entrada na conversa Chatwoot correspondente

#### Scenario: Mensagem enviada pelo atendente
- **WHEN** o Chatwoot envia uma mensagem de saída para uma conversa vinculada
- **THEN** o sistema a encaminha para o contato WhatsApp correspondente com a assinatura configurada para mensagens comuns

#### Scenario: Resposta citada
- **WHEN** uma mensagem de um canal referencia uma mensagem já correlacionada do outro canal
- **THEN** o sistema usa a referência disponível para manter a citação no destino

#### Scenario: Conteúdo interativo dentro de wrapper
- **WHEN** uma mensagem interativa estiver em um wrapper admitido pelo protocolo
- **THEN** o sistema processa o conteúdo interno até o limite seguro de profundidade e preserva o contexto necessário para citação

#### Scenario: Conteúdo parcialmente reconhecido
- **WHEN** uma variante tiver campos úteis e componentes ainda não interpretados
- **THEN** o sistema apresenta os componentes reconhecidos e indica representação parcial sem publicar o payload bruto ao atendente

### Requirement: Mídias e conteúdos especiais existentes são preservados
O sistema SHALL encaminhar mídias suportadas e preservar os tratamentos existentes para listas, PIX, catálogos, pedidos, reações e mensagens de anúncio sem criar mensagens duplicadas. Cabeçalhos de template, mensagens interativas e cartões MUST reutilizar o caminho de mídia existente quando seus metadados forem compatíveis com o downloader.

#### Scenario: Mídia recebida
- **WHEN** uma mensagem WhatsApp com mídia suportada é recebida
- **THEN** o sistema envia a mídia e o conteúdo textual associado à conversa Chatwoot

#### Scenario: Interação PIX existente
- **WHEN** uma mensagem interativa de pagamento PIX já reconhecida é recebida
- **THEN** o sistema apresenta as informações de pagamento disponíveis sem tratar a ação como uma escolha textual comum

#### Scenario: Mídia em template ou cartão
- **WHEN** uma mensagem interativa tiver mídia em cabeçalho, template ou cartão compatível com o downloader existente
- **THEN** o sistema envia a mídia e o conteúdo textual associado sem duplicar a mensagem

### Requirement: Opções interativas legadas mantêm resposta numérica
O sistema SHALL apresentar opções selecionáveis de `buttonsMessage`, templates hidratados ou estruturados, `listMessage`, native flows e cartões de carrossel em formato numerado e não ambíguo dentro do menu ativo. Quando houver um estado ativo compatível, uma resposta `1`, `1.` ou `1)` MUST ser transformada no rótulo correspondente antes de ser enviada como texto citado. O estado MUST registrar instância, conversa, mensagem de origem, direção, índice apresentado, ID original, rótulo e origem de cartão ou seção, expirar no TTL configurado e não ser consumido por número fora do intervalo ou de outra conversa. Ações de URL, telefone, cópia e pagamento MUST ser apresentadas separadamente até haver capacidade comprovada de execução nativa.

#### Scenario: Menu de botões reconhecido
- **WHEN** uma mensagem com botões reconhecidos é espelhada ao Chatwoot
- **THEN** o atendente visualiza rótulos numerados e a instrução para responder com o número da opção

#### Scenario: Resposta numérica válida
- **WHEN** o atendente envia um número válido para um menu ativo da mesma conversa
- **THEN** o sistema envia o rótulo da opção correspondente e preserva a citação disponível

#### Scenario: Mensagem comum sem estado de menu
- **WHEN** o atendente envia uma mensagem que não corresponde a uma opção ativa
- **THEN** o sistema a encaminha como mensagem comum com o comportamento de assinatura configurado

#### Scenario: Lista ou carrossel com agrupamento
- **WHEN** uma lista tiver várias seções ou um carrossel tiver vários cartões com rótulos repetidos
- **THEN** o sistema preserva a origem de seção ou cartão, IDs distintos e numeração inequívoca para o menu ativo

#### Scenario: Menus sucessivos ou escolha inválida
- **WHEN** uma resposta citar um menu anterior, houver um menu mais novo ou o número estiver fora do intervalo
- **THEN** o sistema prioriza a referência explícita, não remove estado mais novo e mantém a mensagem não associada visível

### Requirement: Respostas interativas estruturadas são preservadas e associadas
O sistema SHALL extrair `buttonsResponseMessage`, `templateButtonReplyMessage`, `listResponseMessage` e `interactiveResponseMessage`, preservando IDs, texto disponível, contexto de citação, parâmetros estruturados e identificação do fluxo. `paramsJson` e `buttonParamsJson` MUST ser analisados independentemente de forma segura, mantendo seu valor original e um diagnóstico sem dados sensíveis quando não puderem ser analisados. Uma resposta MUST ser associada somente a um menu da mesma instância e conversa quando a citação ou a identidade da opção for inequívoca.

#### Scenario: Resposta de native flow válida
- **WHEN** uma `interactiveResponseMessage` contiver `nativeFlowResponseMessage.paramsJson` JSON válido
- **THEN** o sistema preserva o objeto completo, nome e versão do fluxo, texto do corpo e contexto de citação sem pressupor uma chave universal de ID

#### Scenario: Resposta de native flow inválida
- **WHEN** `paramsJson` estiver ausente, vazio ou contiver JSON inválido
- **THEN** o sistema preserva o valor original, registra diagnóstico seguro e mantém a conversa visível

#### Scenario: Resposta ligada a menu existente
- **WHEN** uma resposta recebida tiver ID nativo ou citação de um menu ativo da mesma instância e conversa
- **THEN** o sistema associa a resposta à opção correta sem confundir ID de opção, ID de mensagem e índice de cartão

### Requirement: Conteúdo não suportado permanece visível de forma segura
O sistema MUST manter mensagens de conteúdo utilizável que tenham família desconhecida visíveis na conversa por meio de fallback identificado. Eventos internos, recibos, placeholders técnicos e payloads vazios MUST permanecer fora da conversa pública. A supressão de assinatura para uma resposta interativa MUST ser decidida localmente para aquele envio, sem alterar a configuração compartilhada do provedor.

#### Scenario: Tipo de conteúdo desconhecido
- **WHEN** uma mensagem de conteúdo utilizável tiver uma família não reconhecida
- **THEN** o Chatwoot recebe um fallback no formato `[Mensagem do WhatsApp com formato ainda não suportado: tipo_detectado]`

#### Scenario: Envio simultâneo de mensagens
- **WHEN** uma resposta interativa e uma mensagem comum forem enviadas concorrentemente em conversas distintas
- **THEN** somente a resposta interativa suprime sua assinatura e a configuração compartilhada do provedor permanece inalterada
