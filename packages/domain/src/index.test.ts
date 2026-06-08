import { describe, expect, it } from 'vitest';
import { scoreRelationshipAttention, selectTodayAttention, type Relationship } from './index';

const baseRelationship: Relationship = {
  id: 'rel_1',
  accountId: 'acc_1',
  name: 'Ana',
  circle: 'close',
  preferredChannel: 'message',
  cadenceDays: 30,
  lastContactOn: '2026-05-01',
  pausedUntil: null,
};

describe('scoreRelationshipAttention', () => {
  it('scores cadence debt deterministically', () => {
    const candidate = scoreRelationshipAttention({
      relationship: baseRelationship,
      promises: [],
      today: '2026-06-01',
    });

    expect(candidate.score).toBe(1.033);
    expect(candidate.reasons).toContain('cadence_due');
  });

  it('prioritizes pending promises', () => {
    const candidate = scoreRelationshipAttention({
      relationship: baseRelationship,
      promises: [
        {
          id: 'promise_1',
          accountId: 'acc_1',
          relationshipId: 'rel_1',
          description: 'Send book recommendation',
          dueOn: '2026-06-10',
          completedOn: null,
        },
      ],
      today: '2026-05-20',
    });

    expect(candidate.score).toBe(1.383);
    expect(candidate.reasons).toContain('promise_pending');
  });

  it('suppresses paused relationships', () => {
    const candidate = scoreRelationshipAttention({
      relationship: { ...baseRelationship, pausedUntil: '2026-06-10' },
      promises: [],
      today: '2026-06-01',
    });

    expect(candidate.score).toBe(-1);
    expect(candidate.reasons).toEqual(['paused']);
  });
});

describe('selectTodayAttention', () => {
  it('returns the highest scoring relationships first', () => {
    const candidates = selectTodayAttention({
      today: '2026-06-01',
      relationships: [
        baseRelationship,
        { ...baseRelationship, id: 'rel_2', name: 'Bruno', lastContactOn: null },
      ],
      promises: [],
    });

    expect(candidates.map((candidate) => candidate.relationship.name)).toEqual(['Bruno', 'Ana']);
  });
});
