## Context

O processamento de `message_updated` na integração Chatwoot já localiza a mensagem WhatsApp mapeada e reconhece uma assinatura no início do texto original. O conteúdo recebido do Chatwoot passa pela conversão de Markdown antes da edição Baileys. Assim, `**Guilherme:**` pode chegar à montagem final como `*Guilherme:*`, enquanto a assinatura extraída da mensagem original é acrescentada novamente. A confirmação do identificador externo pela API do Chatwoot já está na `master` da Evolution desde `5ba3c669` e não precisa ser reimplementada aqui.

## Goals / Non-Goals

**Goals:**

- Produzir uma única assinatura no WhatsApp quando o conteúdo editado já contiver o mesmo prefixo.
- Manter o comportamento atual para mensagem assinada sem prefixo, mensagem originalmente sem assinatura e prefixo diferente.
- Permitir que a interface Chatwoot passe o conteúdo completo ou apenas o corpo, sem exigir um novo contrato de webhook.

**Non-Goals:**

- Implementar o menu, os alertas de prazo/confirmação ou o campo de edição do Chatwoot neste repositório.
- Alterar a janela de 15 minutos, as regras de elegibilidade do Chatwoot ou editar mensagens da Cloud API oficial.
- Inferir uma assinatura nova apenas da configuração atual quando a mensagem WhatsApp original não a tinha.

## Decisions

### Comparar o prefixo após a normalização existente

O fluxo deverá reutilizar o texto WhatsApp original mapeado e a assinatura já reconhecida nele. Depois da conversão Markdown do conteúdo atualizado, remover do início do corpo no máximo um prefixo igual à assinatura reconhecida e sua quebra de linha adjacente. Em seguida, montar o texto com essa assinatura uma única vez. Isso atende tanto ao conteúdo completo (`**Nome:**` mais corpo) quanto ao corpo isolado que uma futura interface Chatwoot poderá enviar.

Alternativa rejeitada: remover qualquer linha inicial em negrito. Ela apagaria títulos ou texto legítimo e poderia transformar uma mensagem originalmente sem assinatura em uma mensagem diferente da solicitada.

### Conservar o critério de reconhecimento da assinatura original

O prefixo só será deduplicado quando o fluxo atual reconhecer uma assinatura na mensagem WhatsApp original. Se ela não for reconhecida, o texto atualizado seguirá sem assinatura adicionada nem prefixo removido. Isso preserva o caso já coberto em testes em que o WhatsApp começa com um rótulo em negrito que não é o nome do atendente.

Alternativa rejeitada: usar `signMsg` atual como prova de que a mensagem antiga tinha assinatura. A configuração pode mudar depois do envio.

### Tratar a UX como dependência entre repositórios

Uma change no Chatwoot deverá deixar a ação “Editar” encontrável nas mensagens próprias de texto da inbox Evolution, com alerta específico quando faltar confirmação de envio ou quando os 15 minutos expirarem. O Chatwoot também deverá mostrar apenas o corpo no editor quando reconhecer um prefixo de assinatura e preservar o prefixo ao salvar. A Evolution não expõe nem implementa essa interface; seus testes devem aceitar conteúdo de edição com e sem prefixo.

## Risks / Trade-offs

- [Um prefixo digitado manualmente igual à assinatura original pode ser tratado como duplicata] → limitar a remoção ao início do texto, à assinatura reconhecida na mensagem original e a uma única ocorrência; verificar o comportamento com texto de prefixo diferente.
- [A configuração atual do delimitador pode diferir da usada no envio original] → não alterar nesta change a política existente de delimitador; preservar como prioridade a presença e o nome da assinatura original.
- [A interface Chatwoot pode ser publicada antes da correção da Evolution] → manter compatibilidade com conteúdo completo e corpo isolado e validar os dois formatos antes da publicação conjunta.

## Migration Plan

Não há migração de dados. Publicar uma nova imagem da Evolution contendo esta change e validar edição de mensagens assinadas e não assinadas junto da versão do Chatwoot que implementará a UX dependente. O rollback é retornar à imagem Evolution anterior, mantendo a ressalva de que a assinatura pode voltar a ser duplicada quando o conteúdo editado trouxer o prefixo.
