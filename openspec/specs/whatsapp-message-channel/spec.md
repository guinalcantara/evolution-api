# whatsapp-message-channel Specification

## Purpose

Definir como o canal WhatsApp baseado em Baileys recebe, preserva, envia e disponibiliza mensagens e mídias para os consumidores da Evolution API.

## Requirements

### Requirement: Mensagens recebidas preservam conteúdo e identidade
O sistema SHALL transformar uma mensagem WhatsApp recebida em um registro de mensagem que preserve chave, direção, tipo, timestamp, contexto disponível e conteúdo serializável. O payload de conteúdo MUST permanecer disponível para persistência, integrações e webhooks.

#### Scenario: Mensagem recebida válida
- **WHEN** o canal recebe uma mensagem de notificação ou anexação com conteúdo válido
- **THEN** o sistema prepara um registro contendo a chave original, o tipo detectado e o conteúdo serializado

#### Scenario: Mensagem de controle ou sem conteúdo
- **WHEN** o canal recebe uma atualização que não é uma mensagem de conteúdo processável
- **THEN** o sistema não a trata como uma nova mensagem de conversa

#### Scenario: Mensagem com citação
- **WHEN** uma mensagem recebida tiver contexto de citação
- **THEN** o sistema preserva a referência necessária para consumidores correlacionarem a mensagem citada

### Requirement: Mensagens e mídia podem ser encaminhadas por integrações
O sistema SHALL encaminhar mensagens processadas às integrações habilitadas e MUST reutilizar o mecanismo de download de mídia para formatos suportados, preservando texto ou legenda associados.

#### Scenario: Mensagem de mídia suportada
- **WHEN** uma mensagem recebida tiver mídia suportada e a integração de destino estiver habilitada
- **THEN** o sistema disponibiliza a mídia e o texto associado à integração sem substituir o payload original

#### Scenario: Mensagem textual enviada
- **WHEN** uma integração solicita o envio de texto para uma instância conectada
- **THEN** o sistema envia o texto ao destinatário informado e registra o resultado do fluxo de mensagem

### Requirement: Atualizações de mensagens permanecem distinguíveis
O sistema SHALL distinguir criação, edição, exclusão e atualização de status de mensagem para que consumidores não confundam uma atualização com uma nova mensagem.

#### Scenario: Mensagem editada
- **WHEN** o canal recebe um protocolo de edição com chave de mensagem existente
- **THEN** o sistema atualiza o registro correspondente e emite o evento de edição aplicável

#### Scenario: Mensagem excluída
- **WHEN** o canal recebe uma atualização de exclusão
- **THEN** o sistema publica uma atualização de exclusão sem recriar a mensagem como conteúdo novo
