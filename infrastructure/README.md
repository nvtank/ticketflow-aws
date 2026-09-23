# Local infrastructure

From the repository root:

```sh
cp .env.example .env
# Set a local password consistently in POSTGRES_PASSWORD and DATABASE_URL.
docker compose --env-file .env -f infrastructure/docker-compose.yml config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d --wait
docker compose --env-file .env -f infrastructure/docker-compose.yml ps
```

Compose interpolation uses the root `.env` when invoked from the root. `--env-file .env`
is explicit in the pnpm scripts to avoid ambiguity. Data persists in named volumes;
`pnpm infra:down` does not delete it. Services bind to loopback only. Redis is a
local-only instance, not a production authentication configuration. No AWS resource is used.

PostgreSQL and Redis test instances must use separate ports/databases in later phases.
Schema migrations and seed commands are added in Phase 2, not simulated here.
