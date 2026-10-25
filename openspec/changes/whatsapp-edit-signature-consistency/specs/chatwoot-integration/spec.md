## ADDED Requirements

### Requirement: Edição de mensagem assinada não duplica a assinatura

Ao encaminhar uma edição originada no Chatwoot para uma mensagem WhatsApp previamente enviada, o sistema SHALL preservar a presença, o nome e a posição da assinatura original. Se o conteúdo editado já começar com um prefixo equivalente a essa assinatura, o sistema MUST enviar somente uma ocorrência da assinatura ao WhatsApp. O sistema MUST NOT acrescentar assinatura a mensagens originalmente não assinadas nem remover um prefixo inicial que não corresponda à assinatura original reconhecida.

#### Scenario: Conteúdo editado já contém a assinatura original

- **WHEN** uma mensagem WhatsApp originalmente assinada recebe do Chatwoot uma edição cujo conteúdo começa com o mesmo nome em negrito
- **THEN** o texto editado no WhatsApp contém a assinatura original uma única vez, seguida do novo corpo

#### Scenario: Conteúdo editado contém somente o corpo

- **WHEN** uma mensagem WhatsApp originalmente assinada recebe do Chatwoot uma edição sem o prefixo de assinatura
- **THEN** o texto editado no WhatsApp mantém a assinatura original uma única vez antes do novo corpo

#### Scenario: Mensagem originalmente sem assinatura

- **WHEN** uma mensagem WhatsApp originalmente não assinada é editada após a configuração de assinatura ter sido ativada
- **THEN** o texto editado não ganha uma assinatura nova e preserva o conteúdo enviado pelo Chatwoot

#### Scenario: Prefixo inicial diferente da assinatura original

- **WHEN** o corpo editado começa com um nome ou rótulo em negrito diferente da assinatura original reconhecida
- **THEN** o sistema preserva esse prefixo como parte do corpo, sem tratá-lo como uma assinatura duplicada
