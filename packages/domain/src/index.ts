export type RelationshipCircle = 'core' | 'close' | 'casual' | 'professional' | 'family';

export interface Relationship {
  id: string;
  accountId: string;
  name: string;
  circle: RelationshipCircle;
  cadenceDays: number;
  lastContactOn: string | null;
}
