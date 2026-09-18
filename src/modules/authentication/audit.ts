import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/modules/database/client";
import {
  auditEvents,
  hospitalMemberships,
  profiles,
} from "@/modules/database/schema";

/** Record a successful authentication event for each active hospital membership. */
export async function recordAuthenticationAudit(input: {
  authUserId: string;
  action: "auth.login" | "auth.logout";
}) {
  const profile = await db.query.profiles.findFirst({
    where: and(
      eq(profiles.authUserId, input.authUserId),
      eq(profiles.status, "active"),
    ),
  });
  if (!profile) return;

  const memberships = await db
    .select({ hospitalId: hospitalMemberships.hospitalId })
    .from(hospitalMemberships)
    .where(
      and(
        eq(hospitalMemberships.profileId, profile.id),
        eq(hospitalMemberships.status, "active"),
      ),
    );
  if (!memberships.length) return;

  await db.insert(auditEvents).values(
    memberships.map(({ hospitalId }) => ({
      hospitalId,
      actorKind: "profile" as const,
      actorProfileId: profile.id,
      action: input.action,
      targetType: "authentication",
      targetId: profile.id,
      result: "succeeded" as const,
      safeAfter: { displayName: profile.displayName },
    })),
  );
}
