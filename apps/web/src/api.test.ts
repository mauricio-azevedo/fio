import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, FioApiClient } from './api.js';

const relationshipResponse = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Ana Martins',
  circle: 'close',
  preferredChannel: 'message',
  cadenceDays: 21,
  lastContactOn: '2026-06-01',
  pausedUntil: null,
  createdAt: '2026-06-08T12:00:00.000Z',
  updatedAt: '2026-06-08T12:00:00.000Z',
};

describe('FioApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses relationship list responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([relationshipResponse])));

    const client = new FioApiClient('http://localhost:3000/v1', 'session-value');

    await expect(client.listRelationships()).resolves.toEqual([relationshipResponse]);
  });

  it('serializes create requests as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(relationshipResponse));
    vi.stubGlobal('fetch', fetchMock);

    const client = new FioApiClient('http://localhost:3000/v1', 'session-value');

    await client.createRelationship({
      name: 'Ana Martins',
      circle: 'close',
      preferredChannel: 'message',
      cadenceDays: 21,
      lastContactOn: '2026-06-01',
      pausedUntil: null,
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.method).toBe('POST');
    expect((request.headers as Headers).get('Content-Type')).toBe('application/json');
    expect(request.body).toBe(
      JSON.stringify({
        name: 'Ana Martins',
        circle: 'close',
        preferredChannel: 'message',
        cadenceDays: 21,
        lastContactOn: '2026-06-01',
        pausedUntil: null,
      }),
    );
  });

  it('raises typed API errors for non-success responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    const client = new FioApiClient('http://localhost:3000/v1', 'expired-session');

    await expect(client.listRelationships()).rejects.toEqual(
      new ApiError('Fio API request failed with status 401.', 401),
    );
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response;
}
