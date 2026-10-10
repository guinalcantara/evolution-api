# event-delivery Specification

## Purpose

Definir a entrega confiável e configurável de eventos de instância para webhooks e demais integrações de eventos da Evolution API.

## Requirements

### Requirement: Eventos respeitam configuração de destino
O sistema SHALL entregar um evento somente aos destinos habilitados para a instância ou para a configuração global aplicável. Eventos não habilitados MUST não gerar requisições ao destino correspondente.

#### Scenario: Evento habilitado por instância
- **WHEN** uma instância habilita um tipo de evento e configura URL de webhook válida
- **THEN** o sistema envia ao webhook o envelope que contém evento, instância, dados e metadados de entrega

#### Scenario: Evento não habilitado
- **WHEN** um tipo de evento não está listado na configuração local nem está habilitado globalmente
- **THEN** o sistema não realiza entrega externa para esse evento

### Requirement: Entrega de webhook trata falhas transitórias
O sistema SHALL aplicar a política configurada de tentativas para falhas recuperáveis e MUST interromper tentativas para códigos HTTP explicitamente não recuperáveis.

#### Scenario: Falha recuperável
- **WHEN** o destino de webhook falha com erro recuperável antes do limite configurado
- **THEN** o sistema tenta novamente conforme o atraso, limite e estratégia configurados

#### Scenario: Resposta não recuperável
- **WHEN** o destino responde com um código HTTP configurado como não recuperável
- **THEN** o sistema registra a falha e interrompe novas tentativas para aquela entrega

### Requirement: Segredos internos não são reenviados como cabeçalho de configuração
O sistema MUST remover a chave usada para gerar credenciais de webhook antes de encaminhar cabeçalhos ao destino.

#### Scenario: Configuração com chave JWT
- **WHEN** uma configuração de webhook inclui a chave interna para geração de JWT
- **THEN** o sistema envia o token de autorização gerado e não encaminha a chave interna ao destino
