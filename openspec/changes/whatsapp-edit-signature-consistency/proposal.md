## Why

Em produção, o conteúdo enviado pelo Chatwoot pode começar com uma assinatura como `**Guilherme:**`. Ao editar essa mensagem, a Evolution já restaura a assinatura original do WhatsApp e pode acrescentá-la novamente ao conteúdo que ainda contém o prefixo, duplicando o nome. A descoberta da ação de editar também depende de uma melhoria de interface no Chatwoot, planejada separadamente.

## What Changes

- Normalizar somente o prefixo de assinatura reconhecido no conteúdo editado antes de reaplicar a assinatura original da mensagem WhatsApp.
- Preservar a presença e o nome da assinatura original quando a mensagem foi enviada com assinatura; não acrescentar assinatura a uma mensagem originalmente sem ela.
- Cobrir em testes os casos de prefixo já presente, conteúdo sem prefixo, mensagem originalmente sem assinatura e texto inicial que não corresponde à assinatura.
- Registrar a dependência externa: o Chatwoot deverá manter a ação de editar visível para mensagens próprias de texto em inbox Evolution e explicar no clique quando o envio ainda não foi confirmado ou o prazo de 15 minutos expirou. Esta change não implementa a interface do Chatwoot.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `chatwoot-integration`: a edição encaminhada ao WhatsApp preserva a assinatura original sem duplicá-la quando o conteúdo recebido do Chatwoot já contém o prefixo.

## Impact

- Integração nativa Chatwoot/Baileys da Evolution e testes direcionados de edição.
- Sem alteração do contrato público da API Evolution ou do banco de dados.
- Dependência de uma change no repositório Chatwoot para visibilidade da ação, alertas de indisponibilidade e edição do corpo sem expor a assinatura no campo.
