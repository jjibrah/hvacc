import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { requireAuthorizationActor } from "@/modules/authentication/actor";
import { evaluateAuthorization } from "@/modules/authentication/authorization";
import {
  AuthorizationDeniedError,
  ResourceNotFoundError,
} from "@/modules/authentication/errors";
import { db } from "@/modules/database/client";
import { auditEvents, knowledgeSources } from "@/modules/database/schema";

const uuid = z.string().uuid();
async function requireAdmin(hospitalId: string) {
  const actor = await requireAuthorizationActor();
  const decision = evaluateAuthorization(actor, {
    hospitalId,
    permission: "hospital.manage",
    scope: { kind: "hospital" },
  });
  if (!decision.allowed) throw new AuthorizationDeniedError();
  return actor;
}

export async function listKnowledge(hospitalId: string) {
  await requireAdmin(hospitalId);
  const sources = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.hospitalId, hospitalId))
    .orderBy(desc(knowledgeSources.updatedAt));
  const summary = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${knowledgeSources.status} = 'active')::int`,
      processing: sql<number>`count(*) filter (where ${knowledgeSources.status} = 'draft')::int`,
      failed: sql<number>`count(*) filter (where ${knowledgeSources.status} = 'error')::int`,
    })
    .from(knowledgeSources)
    .where(eq(knowledgeSources.hospitalId, hospitalId));
  return {
    sources,
    summary: summary[0] ?? { total: 0, active: 0, processing: 0, failed: 0 },
  };
}

export async function createKnowledgeSource(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      name: z.string().trim().min(2).max(160),
      sourceType: z.enum(["text", "url", "document"]).default("text"),
      content: z.string().trim().min(1).max(100000),
    })
    .parse(input);
  const actor = await requireAdmin(parsed.hospitalId);
  const sourceId = randomUUID();
  const [source] = await db
    .insert(knowledgeSources)
    .values({
      hospitalId: parsed.hospitalId,
      providerKnowledgeBaseId: `hva-local-kb-${parsed.hospitalId}`,
      providerSourceId: `hva-local-source-${sourceId}`,
      name: parsed.name,
      sourceType: parsed.sourceType,
      content: parsed.content,
      status: "draft",
    })
    .returning();
  if (!source) throw new Error("Knowledge source could not be created.");
  await db
    .insert(auditEvents)
    .values({
      hospitalId: parsed.hospitalId,
      actorKind: "profile",
      actorProfileId: actor.profileId,
      action: "knowledge.source_created",
      targetType: "knowledge_source",
      targetId: source.id,
      result: "succeeded",
      safeAfter: { name: source.name, sourceType: source.sourceType },
    });
  return source;
}

export async function approveKnowledgeSource(
  hospitalId: string,
  sourceId: string,
) {
  const actor = await requireAdmin(hospitalId);
  const source = await db.query.knowledgeSources.findFirst({
    where: and(
      eq(knowledgeSources.hospitalId, hospitalId),
      eq(knowledgeSources.id, sourceId),
    ),
  });
  if (!source) throw new ResourceNotFoundError();
  const [updated] = await db
    .update(knowledgeSources)
    .set({ status: "active", processedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(knowledgeSources.hospitalId, hospitalId),
        eq(knowledgeSources.id, sourceId),
        eq(knowledgeSources.status, "draft"),
      ),
    )
    .returning();
  if (!updated) throw new Error("Knowledge source could not be approved.");
  await db
    .insert(auditEvents)
    .values({
      hospitalId,
      actorKind: "profile",
      actorProfileId: actor.profileId,
      action: "knowledge.source_approved",
      targetType: "knowledge_source",
      targetId: sourceId,
      result: "succeeded",
    });
  return updated;
}
