import "server-only";

import Retell from "retell-sdk";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { requireAuthorizationActor } from "@/modules/authentication/actor";
import { evaluateAuthorization } from "@/modules/authentication/authorization";
import {
  AuthorizationDeniedError,
  ResourceNotFoundError,
} from "@/modules/authentication/errors";
import { db } from "@/modules/database/client";
import {
  auditEvents,
  calls,
  knowledgeSources,
  retellAgents,
  retellAgentVersions,
  retellPhoneNumbers,
  integrations,
} from "@/modules/database/schema";
import { serverEnv } from "@/shared/config/env/server";

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

async function audit(
  hospitalId: string,
  actorProfileId: string,
  action: string,
  targetType: string,
  targetId: string,
  safeAfter?: Record<string, unknown>,
) {
  await db.insert(auditEvents).values({
    hospitalId,
    actorKind: "profile",
    actorProfileId,
    action,
    targetType,
    targetId,
    result: "succeeded",
    safeAfter,
  });
}

export async function listVoiceAgents(hospitalId: string) {
  await requireAdmin(hospitalId);
  const agents = await db
    .select()
    .from(retellAgents)
    .where(eq(retellAgents.hospitalId, hospitalId))
    .orderBy(retellAgents.displayName);
  const versions = await db
    .select()
    .from(retellAgentVersions)
    .where(eq(retellAgentVersions.hospitalId, hospitalId))
    .orderBy(desc(retellAgentVersions.capturedAt));
  const phones = await db
    .select()
    .from(retellPhoneNumbers)
    .where(eq(retellPhoneNumbers.hospitalId, hospitalId));
  const sourceCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.hospitalId, hospitalId),
        eq(knowledgeSources.status, "active"),
      ),
    );
  return {
    agents,
    versions,
    phones,
    approvedKnowledgeCount: Number(sourceCount[0]?.count ?? 0),
  };
}

export async function getIntegrationHealth(hospitalId: string) {
  await requireAdmin(hospitalId);
  const [integrationRows, agents, versions, phones, sources] =
    await Promise.all([
      db
        .select()
        .from(integrations)
        .where(eq(integrations.hospitalId, hospitalId)),
      db
        .select()
        .from(retellAgents)
        .where(eq(retellAgents.hospitalId, hospitalId)),
      db
        .select()
        .from(retellAgentVersions)
        .where(eq(retellAgentVersions.hospitalId, hospitalId)),
      db
        .select()
        .from(retellPhoneNumbers)
        .where(eq(retellPhoneNumbers.hospitalId, hospitalId)),
      db
        .select()
        .from(knowledgeSources)
        .where(
          and(
            eq(knowledgeSources.hospitalId, hospitalId),
            eq(knowledgeSources.status, "active"),
          ),
        ),
    ]);
  const retell = integrationRows.find(
    (item) => item.provider === "retell" && item.kind === "retell",
  );
  return {
    retell: {
      status:
        retell?.status ?? (serverEnv.RETELL_API_KEY ? "draft" : "disabled"),
      lastVerifiedAt: retell?.lastVerifiedAt ?? null,
      safeConfiguration: retell?.safeConfiguration ?? {
        credentials: serverEnv.RETELL_API_KEY ? "configured" : "missing",
        signatureVerification: serverEnv.RETELL_API_KEY
          ? "available"
          : "missing",
      },
      agents: agents.length,
      publishedVersions: versions.filter((version) => version.isPublished)
        .length,
      phoneNumbers: phones.length,
      approvedKnowledge: sources.length,
      webhook: serverEnv.RETELL_API_KEY ? "configured" : "missing",
      availabilityTool: "configured",
      bookingTool: "configured",
    },
    integrations: integrationRows.map((item) => ({
      ...item,
      safeConfiguration: item.safeConfiguration,
    })),
  };
}

export async function checkRetellIntegration(hospitalId: string) {
  const actor = await requireAdmin(hospitalId);
  if (!serverEnv.RETELL_API_KEY)
    throw new Error("RETELL_API_KEY is not configured.");
  const provider = new Retell({ apiKey: serverEnv.RETELL_API_KEY });
  await provider.agent.list();
  const now = new Date();
  const safeConfiguration = {
    credentials: "configured",
    signatureVerification: "configured",
    webhook: "configured",
    lastCheck: "successful",
  };
  const current = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.hospitalId, hospitalId),
      eq(integrations.provider, "retell"),
      eq(integrations.kind, "retell"),
    ),
  });
  const integration = current
    ? (
        await db
          .update(integrations)
          .set({
            status: "active",
            safeConfiguration,
            lastVerifiedAt: now,
            updatedAt: now,
          })
          .where(eq(integrations.id, current.id))
          .returning()
      )[0]
    : (
        await db
          .insert(integrations)
          .values({
            hospitalId,
            provider: "retell",
            kind: "retell",
            status: "active",
            safeConfiguration,
            lastVerifiedAt: now,
          })
          .returning()
      )[0];
  if (!integration)
    throw new Error("Retell integration could not be recorded.");
  await audit(
    hospitalId,
    actor.profileId,
    "integration.connection_tested",
    "integration",
    integration.id,
    { provider: "retell", status: "active" },
  );
  return integration;
}

export async function getVoiceAgent(hospitalId: string, agentId: string) {
  await requireAdmin(hospitalId);
  const agent = await db.query.retellAgents.findFirst({
    where: and(
      eq(retellAgents.hospitalId, hospitalId),
      eq(retellAgents.id, agentId),
    ),
  });
  if (!agent) throw new ResourceNotFoundError();
  const [versions, phones, sources, recentCalls] = await Promise.all([
    db
      .select()
      .from(retellAgentVersions)
      .where(
        and(
          eq(retellAgentVersions.hospitalId, hospitalId),
          eq(retellAgentVersions.agentId, agentId),
        ),
      )
      .orderBy(desc(retellAgentVersions.capturedAt)),
    db
      .select()
      .from(retellPhoneNumbers)
      .where(eq(retellPhoneNumbers.hospitalId, hospitalId)),
    db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.hospitalId, hospitalId)),
    db
      .select({
        id: calls.id,
        providerCallId: calls.providerCallId,
        status: calls.status,
        startedAt: calls.startedAt,
      })
      .from(calls)
      .where(eq(calls.hospitalId, hospitalId))
      .orderBy(desc(calls.startedAt))
      .limit(10),
  ]);
  const current = versions.find((version) => version.isPublished);
  const attachedKnowledgeIds = Array.isArray(
    current?.configurationSnapshot?.knowledgeSourceIds,
  )
    ? current.configurationSnapshot.knowledgeSourceIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const readiness = {
    providerAgent: Boolean(agent.providerAgentId),
    publishedVersion: Boolean(current),
    phoneNumber: phones.some((phone) => phone.agentVersionId === current?.id),
    webhook: Boolean(serverEnv.RETELL_API_KEY),
    availabilityTool: true,
    bookingTool: true,
    knowledge: attachedKnowledgeIds.every((id) =>
      sources.some((source) => source.id === id && source.status === "active"),
    ),
    hospitalMapping: true,
    testCall: false,
  };
  return {
    agent,
    versions,
    phones: phones.filter((phone) => phone.agentVersionId === current?.id),
    sources,
    recentCalls,
    readiness: {
      ready: Object.values(readiness).every(Boolean),
      checks: readiness,
    },
  };
}

export async function syncVoiceAgent(hospitalId: string, agentId: string) {
  const actor = await requireAdmin(hospitalId);
  const agent = await db.query.retellAgents.findFirst({
    where: and(
      eq(retellAgents.hospitalId, hospitalId),
      eq(retellAgents.id, agentId),
    ),
  });
  if (!agent) throw new ResourceNotFoundError();
  if (!serverEnv.RETELL_API_KEY)
    throw new Error("RETELL_API_KEY is not configured.");
  const provider = new Retell({ apiKey: serverEnv.RETELL_API_KEY });
  const remote = await provider.agent.retrieve(agent.providerAgentId);
  await db
    .update(retellAgents)
    .set({
      displayName: remote.agent_name ?? agent.displayName,
      voiceName: remote.voice_id,
      status: "active",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(retellAgents.hospitalId, hospitalId),
        eq(retellAgents.id, agent.id),
      ),
    );
  await db
    .insert(retellAgentVersions)
    .values({
      hospitalId,
      agentId: agent.id,
      providerVersion: String(remote.version),
      responseEngineId: remote.response_engine.type,
      isPublished: true,
      configurationSnapshot: remote as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: [
        retellAgentVersions.agentId,
        retellAgentVersions.providerVersion,
      ],
      set: {
        configurationSnapshot: remote as unknown as Record<string, unknown>,
        isPublished: true,
        capturedAt: new Date(),
      },
    });
  await audit(
    hospitalId,
    actor.profileId,
    "voice_agent.synced",
    "retell_agent",
    agent.id,
    { providerVersion: remote.version },
  );
  return remote;
}

export async function createAgentVersion(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      agentId: uuid,
      configurationSnapshot: z.record(z.string(), z.unknown()).default({}),
    })
    .parse(input);
  const actor = await requireAdmin(parsed.hospitalId);
  const agent = await db.query.retellAgents.findFirst({
    where: and(
      eq(retellAgents.hospitalId, parsed.hospitalId),
      eq(retellAgents.id, parsed.agentId),
    ),
  });
  if (!agent) throw new ResourceNotFoundError();
  const [version] = await db
    .insert(retellAgentVersions)
    .values({
      hospitalId: parsed.hospitalId,
      agentId: parsed.agentId,
      providerVersion: `draft-${Date.now()}`,
      isPublished: false,
      configurationSnapshot: parsed.configurationSnapshot,
    })
    .returning();
  if (!version) throw new Error("Agent version could not be created.");
  await audit(
    parsed.hospitalId,
    actor.profileId,
    "voice_agent.version_created",
    "retell_agent_version",
    version.id,
  );
  return version;
}
