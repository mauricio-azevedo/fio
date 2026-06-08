CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "RelationshipCircle" AS ENUM ('core', 'close', 'casual', 'professional', 'family');

CREATE TYPE "PreferredChannel" AS ENUM ('message', 'call', 'in_person', 'email');

CREATE TABLE "accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "keycloak_subject" TEXT NOT NULL,
  "email" TEXT,
  "display_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "relationships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "circle" "RelationshipCircle" NOT NULL,
  "preferred_channel" "PreferredChannel" NOT NULL,
  "cadence_days" INTEGER NOT NULL,
  "last_contact_on" DATE,
  "paused_until" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "relationship_id" UUID NOT NULL,
  "happened_on" DATE NOT NULL,
  "channel" "PreferredChannel" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "relationship_promises" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "relationship_id" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "due_on" DATE,
  "completed_on" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "relationship_promises_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_keycloak_subject_key" ON "accounts"("keycloak_subject");
CREATE INDEX "relationships_account_id_idx" ON "relationships"("account_id");
CREATE INDEX "relationships_account_id_name_idx" ON "relationships"("account_id", "name");
CREATE INDEX "interactions_account_id_happened_on_idx" ON "interactions"("account_id", "happened_on");
CREATE INDEX "interactions_relationship_id_happened_on_idx" ON "interactions"("relationship_id", "happened_on");
CREATE INDEX "relationship_promises_account_id_completed_on_idx" ON "relationship_promises"("account_id", "completed_on");
CREATE INDEX "relationship_promises_relationship_id_completed_on_idx" ON "relationship_promises"("relationship_id", "completed_on");

ALTER TABLE "relationships" ADD CONSTRAINT "relationships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "relationship_promises" ADD CONSTRAINT "relationship_promises_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "relationship_promises" ADD CONSTRAINT "relationship_promises_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
