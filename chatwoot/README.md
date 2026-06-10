# Stack Chatwoot + Evolution API

Este diretório reúne os `docker-compose` usados para subir:

- `chatwoot/docker-compose.chatwoot.yml`
- `chatwoot/docker-compose.api.evolution.yml`
- `chatwoot/docker-compose.manager.evolution.yml`

## Requisitos

- Docker Desktop ou Docker Engine em execucao
- Rede compartilhada `chatwoot-net`

Crie a rede apenas se ela ainda nao existir:

```bash
docker network inspect chatwoot-net >/dev/null 2>&1 || docker network create chatwoot-net
```

## Subir os servicos

### 1. Chatwoot

Sobe o Chatwoot oficial com Postgres, Redis, MailHog, worker e preparacao inicial do banco:

```bash
docker compose -f chatwoot/docker-compose.chatwoot.yml up -d --wait --wait-timeout 240
```

### 2. Evolution API

Sobe a API da Evolution a partir do Dockerfile do projeto:

```bash
docker compose -f chatwoot/docker-compose.api.evolution.yml up -d
```

### 3. Evolution Manager

Sobe o manager da Evolution com build local do projeto `evolution-manager-v2`:

```bash
docker compose -f chatwoot/docker-compose.manager.evolution.yml up -d --build
```

## Verificacao rapida

Confira o estado dos containers:

```bash
docker compose -f chatwoot/docker-compose.chatwoot.yml ps
docker compose -f chatwoot/docker-compose.api.evolution.yml ps
docker compose -f chatwoot/docker-compose.manager.evolution.yml ps
```

Teste as portas publicadas:

```bash
curl -I http://localhost:3002/api
curl -I http://localhost:8080/
curl -I http://localhost:3101/
```

## Logs

Chatwoot:

```bash
docker compose -f chatwoot/docker-compose.chatwoot.yml logs -f chatwoot
docker compose -f chatwoot/docker-compose.chatwoot.yml logs -f chatwoot-sidekiq
```

Evolution API:

```bash
docker compose -f chatwoot/docker-compose.api.evolution.yml logs -f api
```

Manager:

```bash
docker compose -f chatwoot/docker-compose.manager.evolution.yml logs -f manager
```

## Parar os servicos

```bash
docker compose -f chatwoot/docker-compose.manager.evolution.yml down
docker compose -f chatwoot/docker-compose.api.evolution.yml down
docker compose -f chatwoot/docker-compose.chatwoot.yml down
```

## Reset completo do Chatwoot

Se precisar recriar o banco e os volumes do Chatwoot do zero:

```bash
docker compose -f chatwoot/docker-compose.chatwoot.yml down -v --remove-orphans
```

Depois suba novamente com o comando de inicializacao do Chatwoot.
