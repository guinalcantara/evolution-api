# chatbot-integrations Specification

## Purpose

Definir a integração de instâncias WhatsApp com provedores de atendimento e automação conversacional habilitados por instância.

## Requirements

### Requirement: Integrações são habilitadas por instância
O sistema SHALL configurar e acionar provedores de chatbot somente para a instância a que pertencem. Dados de configuração de uma integração MUST não ser reutilizados por outra instância.

#### Scenario: Provedor habilitado na instância
- **WHEN** uma instância possui um provedor de chatbot habilitado e recebe um evento compatível
- **THEN** o sistema encaminha o evento ao provedor configurado para aquela instância

#### Scenario: Provedor desabilitado
- **WHEN** um provedor não está habilitado para a instância
- **THEN** o sistema não cria uma chamada externa para esse provedor ao processar a mensagem

### Requirement: Falhas de provedores externos não alteram a identidade da mensagem
O sistema MUST preservar a identidade e o contexto da mensagem de origem ao tratar falhas de um provedor externo, permitindo que outros fluxos de mensagem e eventos continuem observáveis.

#### Scenario: Falha de integração externa
- **WHEN** um provedor externo falha ao receber uma mensagem da instância
- **THEN** o sistema registra a falha no fluxo de integração sem reatribuir a mensagem a outra instância ou contato

### Requirement: Integrações reutilizam a infraestrutura comum de mensagens
O sistema SHALL usar o canal de mensagens e a persistência comuns para correlacionar envios, mensagens recebidas e citações quando o provedor oferecer esses dados.

#### Scenario: Resposta do provedor
- **WHEN** um provedor gera uma mensagem de resposta para um contato vinculado
- **THEN** o sistema a encaminha pelo canal da instância correspondente e mantém os metadados de correlação disponíveis
