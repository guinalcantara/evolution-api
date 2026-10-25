# Revisão da implementação

## Contrato coberto

- Conteúdo editado com assinatura equivalente à mensagem WhatsApp original mantém uma única assinatura.
- Conteúdo sem prefixo, prefixo diferente e mensagem originalmente sem assinatura preservam seus textos.
- A edição continua usando a chave da mensagem WhatsApp original; o teste existente cobre envio único e o relatório de erro assíncrono ao Chatwoot.

## Verificações locais

- `ESBUILD_BINARY_PATH=/home/guilh/chatwoot/node_modules/.pnpm/@esbuild+linux-x64@0.25.12/node_modules/@esbuild/linux-x64/bin/esbuild node --import tsx test/chatwoot-message-edit.test.ts`: passou, 2 testes.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: passou.
- `node node_modules/eslint/bin/eslint.js src/api/integrations/chatbot/chatwoot/services/chatwoot.service.ts`: passou.
- `openspec validate whatsapp-edit-signature-consistency --strict`: passou.
- `git diff --check`: passou.
- O ESLint deste projeto usa `parserOptions.project` que exclui `test/`; por isso o lint aplicável é o do arquivo de produção.

## Pendente no ambiente integrado

- Validar no WhatsApp real as edições de mensagem com e sem assinatura. O Docker Desktop não está acessível neste WSL (`docker` indisponível na distribuição; `docker.exe` falha ao abrir o socket WSL), então esta verificação não foi marcada como concluída.

## Dependência do Chatwoot

A ação Editar sempre visível, os alertas para envio ainda sem confirmação ou prazo expirado e o campo de edição que oculta a assinatura pertencem ao repositório Chatwoot. Esta change altera apenas a Evolution e seus testes; não inclui código de interface.
