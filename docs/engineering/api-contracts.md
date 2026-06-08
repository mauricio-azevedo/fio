# API Contracts

## Authentication

Protected endpoints require a bearer access token issued by the local Keycloak realm.

The API validates issuer, audience, and signature, then maps the token subject to an internal `Account` before accessing product data.

## Relationships

Relationships are always scoped to the authenticated internal account. The API never accepts `accountId` from the client.

### List relationships

```http
GET /v1/relationships
Authorization: Bearer <access-token>
```

Returns relationships ordered by name and creation time.

### Create relationship

```http
POST /v1/relationships
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "name": "Ana Martins",
  "circle": "close",
  "preferredChannel": "message",
  "cadenceDays": 21,
  "lastContactOn": "2026-06-01",
  "pausedUntil": null
}
```

### Get relationship

```http
GET /v1/relationships/{relationshipId}
Authorization: Bearer <access-token>
```

Returns `404` if the relationship does not exist or does not belong to the authenticated account.

### Update relationship

```http
PATCH /v1/relationships/{relationshipId}
Authorization: Bearer <access-token>
Content-Type: application/json
```

The request body may include any non-empty subset of create fields.

Returns `404` if the relationship does not exist or does not belong to the authenticated account.

### Delete relationship

```http
DELETE /v1/relationships/{relationshipId}
Authorization: Bearer <access-token>
```

Returns `204` after deleting an owned relationship.

Returns `404` if the relationship does not exist or does not belong to the authenticated account.
