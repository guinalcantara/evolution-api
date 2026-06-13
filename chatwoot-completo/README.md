# Stack Chatwoot Completo

Este diretorio junta em um unico compose:

- Chatwoot
- Evolution API
- Evolution Manager
- n8n

Todos os servicos usam imagens Docker Hub e nao dependem de projeto local.

## Requisitos

- Docker Desktop ou Docker Engine em execucao
- Rede compartilhada `chatwoot-net`

Crie a rede apenas se ela ainda nao existir:

```bash
docker network inspect chatwoot-net >/dev/null 2>&1 || docker network create chatwoot-net
```

## Subir tudo

```bash
docker compose -f chatwoot-completo/docker-compose.yml up -d --wait --wait-timeout 300
```

## Imagens

- `guilhermena/chatwoot:latest`
- `guilhermena/evolution-api:latest`
- `guilhermena/evolution-manager-v2:latest`
- `n8nio/n8n:latest`

## Acessos

- Chatwoot: `http://localhost:3002`
- Evolution API: `http://localhost:8080`
- Evolution Manager: `http://localhost:3101`
- n8n: `http://n8n.local:5678`

## Hosts do Windows

Para usar `n8n.local`, adicione no arquivo `hosts`:

```text
127.0.0.1 n8n.local
```

## Verificacao rapida

```bash
docker compose -f chatwoot-completo/docker-compose.yml ps
```

## Logs

```bash
docker compose -f chatwoot-completo/docker-compose.yml logs -f chatwoot
docker compose -f chatwoot-completo/docker-compose.yml logs -f chatwoot-sidekiq
docker compose -f chatwoot-completo/docker-compose.yml logs -f api
docker compose -f chatwoot-completo/docker-compose.yml logs -f manager
docker compose -f chatwoot-completo/docker-compose.yml logs -f n8n
```

## Parar tudo

```bash
docker compose -f chatwoot-completo/docker-compose.yml down
```
