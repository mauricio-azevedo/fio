export type LocalDateString = `${number}-${number}-${number}`;

export type RelationshipCircle = 'core' | 'close' | 'casual' | 'professional' | 'family';

export type PreferredChannel = 'message' | 'call' | 'in_person' | 'email';

export interface Relationship {
  id: string;
  accountId: string;
  name: string;
  circle: RelationshipCircle;
  preferredChannel: PreferredChannel;
  cadenceDays: number;
  lastContactOn: LocalDateString | null;
  pausedUntil: LocalDateString | null;
}

export interface RelationshipPromise {
  id: string;
  accountId: string;
  relationshipId: string;
  description: string;
  dueOn: LocalDateString | null;
  completedOn: LocalDateString | null;
}

export interface AttentionCandidate {
  relationship: Relationship;
  score: number;
  reasons: AttentionReason[];
}

export type AttentionReason =
  | 'never_contacted'
  | 'cadence_due'
  | 'promise_pending'
  | 'paused';

export function compareLocalDates(left: LocalDateString, right: LocalDateString): number {
  return left.localeCompare(right);
}

export function daysBetween(start: LocalDateString, end: LocalDateString): number {
  const startDate = Date.parse(`${start}T00:00:00.000Z`);
  const endDate = Date.parse(`${end}T00:00:00.000Z`);

  if (Number.isNaN(startDate) || Number.isNaN(endDate)) {
    throw new Error('Invalid local date');
  }

  return Math.floor((endDate - startDate) / 86_400_000);
}

export function scoreRelationshipAttention(input: {
  relationship: Relationship;
  promises: RelationshipPromise[];
  today: LocalDateString;
}): AttentionCandidate {
  const { relationship, promises, today } = input;
  const reasons: AttentionReason[] = [];

  if (relationship.pausedUntil !== null && compareLocalDates(relationship.pausedUntil, today) >= 0) {
    reasons.push('paused');
    return { relationship, score: -1, reasons };
  }

  let score = 0;

  if (relationship.lastContactOn === null) {
    score += 1.25;
    reasons.push('never_contacted');
  } else {
    const elapsedDays = Math.max(0, daysBetween(relationship.lastContactOn, today));
    const cadenceRatio = elapsedDays / relationship.cadenceDays;

    score += cadenceRatio;

    if (cadenceRatio >= 1) {
      reasons.push('cadence_due');
    }
  }

  const pendingPromiseCount = promises.filter(
    (promise) => promise.relationshipId === relationship.id && promise.completedOn === null,
  ).length;

  if (pendingPromiseCount > 0) {
    score += pendingPromiseCount * 0.75;
    reasons.push('promise_pending');
  }

  return { relationship, score: Number(score.toFixed(3)), reasons };
}

export function selectTodayAttention(input: {
  relationships: Relationship[];
  promises: RelationshipPromise[];
  today: LocalDateString;
  limit?: number;
}): AttentionCandidate[] {
  const limit = input.limit ?? 3;

  return input.relationships
    .map((relationship) =>
      scoreRelationshipAttention({ relationship, promises: input.promises, today: input.today }),
    )
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.relationship.name.localeCompare(right.relationship.name))
    .slice(0, limit);
}
