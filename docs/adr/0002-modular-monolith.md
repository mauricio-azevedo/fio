# ADR 0002: Use a modular monolith

## Status

Accepted

## Decision

Fio is built as a modular monolith: one deployable API with explicit product modules and a pure shared domain package.

## Consequences

The codebase keeps clear boundaries without introducing distributed-system complexity. Modules own their application services and persistence boundaries. The domain package cannot depend on NestJS, Prisma, HTTP, or Keycloak.
