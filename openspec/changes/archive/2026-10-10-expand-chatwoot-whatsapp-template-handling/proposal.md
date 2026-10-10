## Why

A integração com Chatwoot preserva o payload bruto recebido pelo Baileys, mas só reconhece diretamente botões legacy, parte de native flows e listas. Templates, carrosséis e respostas interativas podem chegar sem conteúdo útil para o atendente ou sem associação segura à opção original, enquanto o atendimento por opções numeradas já existente precisa permanecer estável.

## What Changes

- Normalizar internamente o conteúdo interativo recebido do WhatsApp antes de renderizá-lo no Chatwoot, preservando família, variante, textos, ações, opções, mídia, contexto e dados ainda não interpretados.
- Ampliar a extração para templates hidratados e estruturados, listas, native flows, carrosséis e suas respostas, incluindo tratamento explícito de `interactiveResponseMessage`.
- Estender o estado de opções numeradas para registrar a mensagem, direção, conversa, IDs nativos e agrupamento que originaram cada opção, sem alterar a semântica atual de enviar o rótulo como texto citado.
- Tornar a abertura de wrappers, o parse de JSON de fluxos, o fallback de tipos desconhecidos, a detecção de mídia e a supressão de assinatura por envio mais seguros.
- Adicionar fixtures anonimizadas e verificações finitas para os caminhos normalizados e as regressões de Chatwoot.

## Capabilities

### New Capabilities

- Nenhuma.

### Modified Capabilities

- `chatwoot-integration`: ampliar a representação de templates, interações e respostas WhatsApp, preservando o fluxo numérico e os contratos existentes da ponte Chatwoot.

## Impact

- Afeta principalmente `src/api/integrations/chatbot/chatwoot/services/chatwoot.service.ts` e reutiliza a preparação de mensagens e download de mídia de `src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts`.
- Não altera o contrato bruto dos webhooks; `messageRaw.message` continua sendo a fonte de diagnóstico e compatibilidade.
- Não requer atualização de Baileys, migração de banco ou nova dependência. A cobertura será limitada aos campos e variantes comprovados pela versão `7.0.0-rc.9` instalada e por fixtures anonimizadas.
