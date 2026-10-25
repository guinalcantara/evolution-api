## 1. Cobertura do contrato de edição

- [x] 1.1 Ampliar `test/chatwoot-message-edit.test.ts` para cobrir conteúdo iniciado por `**Nome:**` equivalente à assinatura original e verificar que o texto enviado ao WhatsApp contém uma única assinatura.
- [x] 1.2 Cobrir no mesmo teste conteúdo sem prefixo, mensagem originalmente sem assinatura e prefixo diferente; verificar que cada caso preserva o corpo esperado sem assinatura indevida.

## 2. Integração Evolution/Chatwoot

- [x] 2.1 Deduplicar no fluxo `message_updated` somente o prefixo inicial equivalente à assinatura original reconhecida; verificar que os testes direcionados passam e que o mapeamento da mensagem editada permanece o mesmo.
- [x] 2.2 Confirmar que a edição não cria outra mensagem no Chatwoot nem modifica o tratamento de falha assíncrona; verificar os testes existentes de envio único e comunicação de erro.

## 3. Validação e dependência externa

- [x] 3.1 Executar o teste direcionado, a checagem TypeScript e o lint dos arquivos alterados; registrar comandos e resultados na revisão da change.
- [ ] 3.2 Validar em ambiente integrado uma edição de mensagem assinada com prefixo no conteúdo Chatwoot e outra sem assinatura; verificar no WhatsApp que a mensagem original muda sem nome duplicado nem nova mensagem.
- [x] 3.3 Registrar na entrega que a visibilidade permanente da ação, os alertas de confirmação/prazo e o campo que oculta a assinatura são trabalho do repositório Chatwoot; verificar que esta change não inclui código de interface.
