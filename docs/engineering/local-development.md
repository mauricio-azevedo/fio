# Local Development

## Required services

Start the local databases and identity provider:

```bash
pnpm install
docker compose up -d fio-postgres keycloak-postgres keycloak
```

## API database

The API owns the Prisma schema, migrations, and Prisma config under `apps/api/prisma` and `apps/api/prisma.config.ts`.

The local app database URL is:

```bash
DATABASE_URL="postgresql://fio:fio_dev_password@localhost:5432/fio?schema=public"
```

Generate Prisma Client before API validation commands when running commands directly inside `apps/api`:

```bash
pnpm --filter fio-api db:generate
```

The root validation commands already run Prisma generation where required:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Identity boundary

Keycloak is the external identity provider. The API validates bearer tokens and maps the token subject to an internal `Account`. Product authorization is based on the internal account id, not on Keycloak roles.
