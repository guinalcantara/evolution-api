# Roteiro manual de validação Chatwoot ↔ WhatsApp

## Preparação

1. Use uma instância descartável com Chatwoot habilitado e uma conversa de teste sem dados pessoais.
2. Ative assinatura no provedor para diferenciar mensagens comuns de respostas de menu.
3. Registre os IDs da conversa, da mensagem de menu e da mensagem citada no ambiente de teste, sem copiá-los para documentação ou tickets.

## Recebimento no Chatwoot

1. Envie para a instância, em mensagens separadas, `buttonsMessage`, template hidratado, template estruturado, lista, native flow e carrossel.
2. Confirme que o Chatwoot mostra título, texto, rodapé, cartões e somente escolhas selecionáveis numeradas.
3. Confirme que URL, telefone, cópia e pagamento aparecem como ações informativas, fora da numeração.
4. Envie um template ou cartão com imagem, vídeo ou documento compatível. Confirme uma única mensagem com o anexo e o texto associado; depois repita sem mídia e confirme que o texto ainda chega.
5. Envie uma resposta de botão, template, lista e native flow, incluindo `paramsJson` vazio e inválido. Confirme que a conversa continua visível e que JSON bruto não aparece ao atendente.
6. Envie uma família de conteúdo desconhecida em ambiente controlado. Confirme o fallback identificado e que protocolo, recibo, reação e enquete não criam mensagem pública indevida.

## Resposta do atendente

1. Responda `1`, `1.` e `1)` diretamente ao menu ativo. Confirme o envio do rótulo como texto citado e a ausência de assinatura somente nesse envio.
2. Responda com índice fora do intervalo, por exemplo `99`, e confirme que o texto é enviado sem associação.
3. Abra dois menus consecutivos na mesma conversa. Responda citando o primeiro e confirme que apenas ele é consumido; o segundo deve continuar disponível quando aplicável.
4. Faça o mesmo em duas conversas distintas. Confirme que uma resposta interativa não remove estado nem altera a assinatura da outra conversa.
5. Envie uma mensagem textual comum após o teste e confirme que a assinatura do provedor permanece ativa.

## Regressão de integrações existentes

1. Verifique mensagem de texto, imagem, vídeo, áudio, documento e citação comum.
2. Verifique lista, PIX, catálogo, pedido, anúncio e enquete usando payloads permitidos pelo ambiente.
3. Para PIX, confirme que o tratamento especial existente prevalece e não transforma pagamento em escolha numérica.

## Limitações registradas

- O sistema não simula clique, URL, telefone, cópia, pagamento ou cartão de forma nativa; ele encaminha somente o rótulo textual quando há uma opção selecionável comprovada.
- Em um carrossel com várias mídias, apenas a primeira mídia compatível segue para o downloader atual. Os demais cartões continuam presentes no texto.
- Localizações, produtos e formatos sem downloader compatível ficam como conteúdo parcial ou fallback; nenhum base64 adicional é criado.
- A validação deste roteiro depende de uma instância WhatsApp, Chatwoot e credenciais que não fazem parte das fixtures locais.
