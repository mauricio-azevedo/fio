import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClientService } from '../../common/database/prisma-client.service.js';
import { RelationshipsService } from './relationships.service.js';

const accountId = '11111111-1111-4111-8111-111111111111';
const otherAccountId = '22222222-2222-4222-8222-222222222222';
const relationshipId = '33333333-3333-4333-8333-333333333333';

function createRelationshipRecord(overrides: Partial<RelationshipRecord> = {}): RelationshipRecord {
  return {
    id: relationshipId,
    name: 'Ana Martins',
    circle: 'close',
    preferredChannel: 'message',
    cadenceDays: 21,
    lastContactOn: new Date('2026-06-01T00:00:00.000Z'),
    pausedUntil: null,
    createdAt: new Date('2026-06-08T12:00:00.000Z'),
    updatedAt: new Date('2026-06-08T12:00:00.000Z'),
    ...overrides,
  };
}

describe('RelationshipsService', () => {
  it('lists relationships only for the authenticated account', async () => {
    const prisma = createPrismaStub({
      relationship: {
        findMany: vi.fn().mockResolvedValue([createRelationshipRecord()]),
      },
    });
    const service = new RelationshipsService(prisma);

    const relationships = await service.list(accountId);

    expect(prisma.relationship.findMany).toHaveBeenCalledWith({
      where: { accountId },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      select: expect.any(Object),
    });
    expect(relationships).toEqual([
      {
        id: relationshipId,
        name: 'Ana Martins',
        circle: 'close',
        preferredChannel: 'message',
        cadenceDays: 21,
        lastContactOn: '2026-06-01',
        pausedUntil: null,
        createdAt: '2026-06-08T12:00:00.000Z',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    ]);
  });

  it('creates relationships under the authenticated account', async () => {
    const prisma = createPrismaStub({
      relationship: {
        create: vi.fn().mockResolvedValue(createRelationshipRecord()),
      },
    });
    const service = new RelationshipsService(prisma);

    await service.create(accountId, {
      name: 'Ana Martins',
      circle: 'close',
      preferredChannel: 'message',
      cadenceDays: 21,
      lastContactOn: '2026-06-01',
    });

    expect(prisma.relationship.create).toHaveBeenCalledWith({
      data: {
        accountId,
        name: 'Ana Martins',
        circle: 'close',
        preferredChannel: 'message',
        cadenceDays: 21,
        lastContactOn: '2026-06-01',
        pausedUntil: null,
      },
      select: expect.any(Object),
    });
  });

  it('returns not found when a relationship belongs to another account', async () => {
    const prisma = createPrismaStub({
      relationship: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    const service = new RelationshipsService(prisma);

    await expect(service.get(accountId, relationshipId)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.relationship.findFirst).toHaveBeenCalledWith({
      where: {
        id: relationshipId,
        accountId,
      },
      select: expect.any(Object),
    });
  });

  it('verifies ownership before updating', async () => {
    const prisma = createPrismaStub({
      relationship: {
        findFirst: vi.fn().mockResolvedValue(createRelationshipRecord()),
        update: vi.fn().mockResolvedValue(createRelationshipRecord({ name: 'Ana Silva' })),
      },
    });
    const service = new RelationshipsService(prisma);

    await service.update(accountId, relationshipId, { name: 'Ana Silva' });

    expect(prisma.relationship.findFirst).toHaveBeenCalledWith({
      where: {
        id: relationshipId,
        accountId,
      },
      select: expect.any(Object),
    });
    expect(prisma.relationship.update).toHaveBeenCalledWith({
      where: { id: relationshipId },
      data: { name: 'Ana Silva' },
      select: expect.any(Object),
    });
  });

  it('does not update relationships from another account', async () => {
    const prisma = createPrismaStub({
      relationship: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    const service = new RelationshipsService(prisma);

    await expect(
      service.update(otherAccountId, relationshipId, { name: 'Ana Silva' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.relationship.update).not.toHaveBeenCalled();
  });

  it('verifies ownership before deleting', async () => {
    const prisma = createPrismaStub({
      relationship: {
        findFirst: vi.fn().mockResolvedValue(createRelationshipRecord()),
        delete: vi.fn().mockResolvedValue(createRelationshipRecord()),
      },
    });
    const service = new RelationshipsService(prisma);

    await service.delete(accountId, relationshipId);

    expect(prisma.relationship.findFirst).toHaveBeenCalledWith({
      where: {
        id: relationshipId,
        accountId,
      },
      select: expect.any(Object),
    });
    expect(prisma.relationship.delete).toHaveBeenCalledWith({
      where: { id: relationshipId },
    });
  });
});

interface RelationshipRecord {
  id: string;
  name: 'Ana Martins' | 'Ana Silva';
  circle: 'close';
  preferredChannel: 'message';
  cadenceDays: number;
  lastContactOn: Date | null;
  pausedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type PrismaRelationshipStub = {
  relationship: {
    findMany?: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
    findFirst?: ReturnType<typeof vi.fn>;
    update?: ReturnType<typeof vi.fn>;
    delete?: ReturnType<typeof vi.fn>;
  };
};

function createPrismaStub(stub: PrismaRelationshipStub): PrismaClientService {
  return stub as unknown as PrismaClientService;
}
