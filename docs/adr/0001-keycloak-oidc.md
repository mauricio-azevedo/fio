# ADR 0001: Use Keycloak as external OpenID Connect provider

## Status

Accepted

## Decision

Fio uses Keycloak as its identity provider through OpenID Connect. The product backend validates access tokens and maps the external subject to an internal account.

## Consequences

Fio does not store passwords, does not implement password reset, and does not spread identity-provider concepts through the domain model. Keycloak authenticates users. Fio authorizes access to product resources by account ownership.
