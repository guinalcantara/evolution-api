# instance-management Specification

## Purpose

Definir o ciclo de vida das instâncias WhatsApp isoladas que clientes e integrações usam para conectar, administrar e remover canais da Evolution API.

## Requirements

### Requirement: Instâncias são identificadas e isoladas
O sistema SHALL criar cada instância com identificadores próprios e MUST manter operações, dados e integrações restritos à instância solicitada.

#### Scenario: Criação com nome disponível
- **WHEN** um cliente autenticado solicita uma instância com nome ainda não utilizado
- **THEN** o sistema cria a instância, atribui seu identificador e a disponibiliza para conexão

#### Scenario: Criação com nome já utilizado
- **WHEN** um cliente solicita uma instância cujo nome já existe
- **THEN** o sistema rejeita a solicitação sem alterar a instância existente

#### Scenario: Operação em outra instância
- **WHEN** uma operação referencia uma instância diferente da informada na requisição autenticada
- **THEN** o sistema não utiliza dados ou conexões de outra instância para atender a operação

### Requirement: Ciclo de conexão é controlado
O sistema SHALL permitir consultar o estado de conexão e executar conexão, reinício, logout e remoção somente para instâncias existentes. Operações que dependem de conexão MUST falhar de forma explícita quando a instância não estiver conectada.

#### Scenario: Consulta de estado
- **WHEN** um cliente consulta uma instância existente
- **THEN** o sistema retorna o estado atual conhecido da sua conexão

#### Scenario: Logout de instância conectada
- **WHEN** um cliente solicita logout de uma instância conectada
- **THEN** o sistema encerra a sessão da instância e publica os eventos de ciclo de vida configurados

#### Scenario: Operação em instância inexistente
- **WHEN** uma operação de ciclo de vida referencia uma instância inexistente
- **THEN** o sistema retorna erro de instância não encontrada sem criar estado implícito

### Requirement: Acesso exige credenciais apropriadas
O sistema MUST validar a chave de API e a existência da instância antes de executar rotas protegidas de instância.

#### Scenario: Chave de API ausente ou inválida
- **WHEN** uma rota protegida recebe uma chave de API ausente ou inválida
- **THEN** o sistema recusa a solicitação antes de executar a operação da instância
