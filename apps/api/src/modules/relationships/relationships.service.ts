import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PreferredChannel, Prisma, RelationshipCircle } from '@prisma/client';
import { PrismaClientService } from '../../common/database/prisma-client.service.js';
import type { CreateRelationshipInput, UpdateRelationshipInput } from './relationship.schemas.js';

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

interface RelationshipRecord {
  id: string;
  name: string;
  circle: RelationshipCircle;
  preferredChannel: PreferredChannel;
  cadenceDays: number;
  lastContactOn: Date | null;
  pausedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RelationshipsService {
  constructor(@Inject(PrismaClientService) private readonly prisma: PrismaClientService) {}

  async list(accountId: string): Promise<RelationshipView[]> {
    const relationships = await this.prisma.relationship.findMany({
      where: { accountId },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      select: relationshipSelect,
    });

    return relationships.map(toRelationshipView);
  }

  async create(accountId: string, input: CreateRelationshipInput): Promise<RelationshipView> {
    const relationship = await this.prisma.relationship.create({
      data: {
        accountId,
        name: input.name,
        circle: input.circle,
        preferredChannel: input.preferredChannel,
        cadenceDays: input.cadenceDays,
        lastContactOn: input.lastContactOn ?? null,
        pausedUntil: input.pausedUntil ?? null,
      },
      select: relationshipSelect,
    });

    return toRelationshipView(relationship);
  }

  async get(accountId: string, relationshipId: string): Promise<RelationshipView> {
    const relationship = await this.findOwnedRelationship(accountId, relationshipId);

    return toRelationshipView(relationship);
  }

  async update(
    accountId: string,
    relationshipId: string,
    input: UpdateRelationshipInput,
  ): Promise<RelationshipView> {
    await this.assertRelationshipOwnership(accountId, relationshipId);

    const relationship = await this.prisma.relationship.update({
      where: { id: relationshipId },
      data: toRelationshipUpdateData(input),
      select: relationshipSelect,
    });

    return toRelationshipView(relationship);
  }

  async delete(accountId: string, relationshipId: string): Promise<void> {
    await this.assertRelationshipOwnership(accountId, relationshipId);

    await this.prisma.relationship.delete({
      where: { id: relationshipId },
    });
  }

  private async assertRelationshipOwnership(accountId: string, relationshipId: string): Promise<void> {
    await this.findOwnedRelationship(accountId, relationshipId);
  }

  private async findOwnedRelationship(
    accountId: string,
    relationshipId: string,
  ): Promise<RelationshipRecord> {
    const relationship = await this.prisma.relationship.findFirst({
      where: {
        id: relationshipId,
        accountId,
      },
      select: relationshipSelect,
    });

    if (relationship === null) {
      throw new NotFoundException('Relationship not found');
    }

    return relationship;
  }
}

const relationshipSelect = {
  id: true,
  name: true,
  circle: true,
  preferredChannel: true,
  cadenceDays: true,
  lastContactOn: true,
  pausedUntil: true,
  createdAt: true,
  updatedAt: true,
} satisfies Record<keyof RelationshipRecord, true>;

function toRelationshipUpdateData(input: UpdateRelationshipInput): Prisma.RelationshipUpdateInput {
  const data: Prisma.RelationshipUpdateInput = {};

  const { name } = input;
  if (name !== undefined) {
    data.name = name;
  }

  const { circle } = input;
  if (circle !== undefined) {
    data.circle = circle;
  }

  const { preferredChannel } = input;
  if (preferredChannel !== undefined) {
    data.preferredChannel = preferredChannel;
  }

  const { cadenceDays } = input;
  if (cadenceDays !== undefined) {
    data.cadenceDays = cadenceDays;
  }

  const { lastContactOn } = input;
  if (lastContactOn !== undefined) {
    data.lastContactOn = lastContactOn;
  }

  const { pausedUntil } = input;
  if (pausedUntil !== undefined) {
    data.pausedUntil = pausedUntil;
  }

  return data;
}

function toRelationshipView(relationship: RelationshipRecord): RelationshipView {
  return {
    id: relationship.id,
    name: relationship.name,
    circle: relationship.circle,
    preferredChannel: relationship.preferredChannel,
    cadenceDays: relationship.cadenceDays,
    lastContactOn: toDateOnly(relationship.lastContactOn),
    pausedUntil: toDateOnly(relationship.pausedUntil),
    createdAt: relationship.createdAt.toISOString(),
    updatedAt: relationship.updatedAt.toISOString(),
  };
}

function toDateOnly(value: Date | null): string | null {
  if (value === null) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}
