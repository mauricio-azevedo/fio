export type RelationshipCircle = 'core' | 'close' | 'casual' | 'professional' | 'family';
export type PreferredChannel = 'message' | 'call' | 'in_person' | 'email';

export interface RelationshipView {
  id: string;
  name: string;
  circle: RelationshipCircle;
  preferredChannel: PreferredChannel;
  cadenceDays: number;
  lastContactOn: string | null;
  pausedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipWriteRequest {
  name: string;
  circle: RelationshipCircle;
  preferredChannel: PreferredChannel;
  cadenceDays: number;
  lastContactOn: string | null;
  pausedUntil: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class FioApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
  ) {}

  async listRelationships(): Promise<RelationshipView[]> {
    const value = await this.request('relationships');

    if (!Array.isArray(value)) {
      throw new Error('Invalid relationships response.');
    }

    return value.map(parseRelationshipView);
  }

  async createRelationship(request: RelationshipWriteRequest): Promise<RelationshipView> {
    const value = await this.request('relationships', {
      method: 'POST',
      body: request,
    });

    return parseRelationshipView(value);
  }

  async updateRelationship(
    relationshipId: string,
    request: RelationshipWriteRequest,
  ): Promise<RelationshipView> {
    const value = await this.request(`relationships/${relationshipId}`, {
      method: 'PATCH',
      body: request,
    });

    return parseRelationshipView(value);
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    await this.request(`relationships/${relationshipId}`, {
      method: 'DELETE',
      expectJson: false,
    });
  }

  private async request(
    path: string,
    options: { method?: string; body?: unknown; expectJson?: boolean } = {},
  ): Promise<unknown> {
    const headers = new Headers({
      Authorization: `Bearer ${this.accessToken}`,
    });
    const requestInit: RequestInit = {
      method: options.method ?? 'GET',
      headers,
    };

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      requestInit.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${this.baseUrl}/${path}`, requestInit);

    if (!response.ok) {
      throw new ApiError(`Fio API request failed with status ${response.status}.`, response.status);
    }

    if (options.expectJson === false || response.status === 204) {
      return null;
    }

    return response.json() as Promise<unknown>;
  }
}

function parseRelationshipView(value: unknown): RelationshipView {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid relationship response.');
  }

  const record = value as Record<string, unknown>;

  return {
    id: readString(record, 'id'),
    name: readString(record, 'name'),
    circle: readRelationshipCircle(record, 'circle'),
    preferredChannel: readPreferredChannel(record, 'preferredChannel'),
    cadenceDays: readNumber(record, 'cadenceDays'),
    lastContactOn: readNullableString(record, 'lastContactOn'),
    pausedUntil: readNullableString(record, 'pausedUntil'),
    createdAt: readString(record, 'createdAt'),
    updatedAt: readString(record, 'updatedAt'),
  };
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  if (typeof value !== 'string') {
    throw new Error(`Invalid relationship field: ${key}.`);
  }

  return value;
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid relationship field: ${key}.`);
  }

  return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];

  if (typeof value !== 'number') {
    throw new Error(`Invalid relationship field: ${key}.`);
  }

  return value;
}

function readRelationshipCircle(record: Record<string, unknown>, key: string): RelationshipCircle {
  const value = readString(record, key);

  if (
    value !== 'core' &&
    value !== 'close' &&
    value !== 'casual' &&
    value !== 'professional' &&
    value !== 'family'
  ) {
    throw new Error(`Invalid relationship field: ${key}.`);
  }

  return value;
}

function readPreferredChannel(record: Record<string, unknown>, key: string): PreferredChannel {
  const value = readString(record, key);

  if (value !== 'message' && value !== 'call' && value !== 'in_person' && value !== 'email') {
    throw new Error(`Invalid relationship field: ${key}.`);
  }

  return value;
}
