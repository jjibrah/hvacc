import "server-only";

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { requireAuthorizationActor } from "@/modules/authentication/actor";
import { evaluateAuthorization } from "@/modules/authentication/authorization";
import { AuthorizationDeniedError } from "@/modules/authentication/errors";
import { db } from "@/modules/database/client";
import {
  appointments,
  callAppointments,
  calls,
  callAnalyses,
  followUps,
  hospitalConfigurations,
} from "@/modules/database/schema";

const inputSchema = z.object({
  hospitalId: z.string().uuid(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  timezone: z.string().min(1).max(80).optional(),
});

async function requireReportsPermission(hospitalId: string) {
  const actor = await requireAuthorizationActor();
  const decision = evaluateAuthorization(actor, {
    hospitalId,
    permission: "reports.read",
    scope: { kind: "hospital" },
  });
  if (!decision.allowed) throw new AuthorizationDeniedError();
  return actor;
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function number(value: unknown) {
  return Number(value ?? 0);
}

export async function getOverviewMetrics(input: unknown) {
  const parsed = inputSchema.parse(input);
  await requireReportsPermission(parsed.hospitalId);
  const defaults = defaultRange();
  const from = parsed.from ?? defaults.from;
  const to = parsed.to ?? defaults.to;
  const [configuration] = await db
    .select({ timezone: hospitalConfigurations.timezone })
    .from(hospitalConfigurations)
    .where(eq(hospitalConfigurations.hospitalId, parsed.hospitalId))
    .limit(1);
  const timezone = parsed.timezone ?? configuration?.timezone ?? "UTC";
  const callWhere = and(
    eq(calls.hospitalId, parsed.hospitalId),
    gte(calls.startedAt, from),
    lt(calls.startedAt, to),
  );
  const appointmentWhere = and(
    eq(appointments.hospitalId, parsed.hospitalId),
    gte(appointments.createdAt, from),
    lt(appointments.createdAt, to),
  );
  const followUpWhere = and(
    eq(followUps.hospitalId, parsed.hospitalId),
    gte(followUps.createdAt, from),
    lt(followUps.createdAt, to),
  );

  const [
    callTotals,
    callDurations,
    appointmentTotals,
    linkedCalls,
    followUpTotals,
    dailyCalls,
    dailyAppointments,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${calls.status} = 'ended')::int`,
        failed: sql<number>`count(*) filter (where ${calls.status} = 'failed')::int`,
        inbound: sql<number>`count(*) filter (where ${calls.direction} = 'inbound')::int`,
      })
      .from(calls)
      .where(callWhere),
    db
      .select({
        average: sql<number>`coalesce(avg(extract(epoch from (${calls.endedAt} - ${calls.startedAt}))) filter (where ${calls.endedAt} is not null and ${calls.startedAt} is not null), 0)`,
      })
      .from(calls)
      .where(callWhere),
    db
      .select({
        booked: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${appointments.status} = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${appointments.status} = 'cancelled')::int`,
        noShow: sql<number>`count(*) filter (where ${appointments.status} = 'no_show')::int`,
        upcoming: sql<number>`count(*) filter (where ${appointments.status} in ('pending', 'confirmed'))::int`,
      })
      .from(appointments)
      .where(appointmentWhere),
    db
      .select({
        count: sql<number>`count(distinct ${callAppointments.callId})::int`,
      })
      .from(callAppointments)
      .innerJoin(
        calls,
        and(
          eq(calls.hospitalId, callAppointments.hospitalId),
          eq(calls.id, callAppointments.callId),
        ),
      )
      .where(callWhere),
    db
      .select({
        created: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${followUps.status} not in ('resolved', 'cancelled'))::int`,
        resolved: sql<number>`count(*) filter (where ${followUps.status} = 'resolved')::int`,
        overdue: sql<number>`count(*) filter (where ${followUps.status} not in ('resolved', 'cancelled') and ${followUps.dueAt} < now())::int`,
      })
      .from(followUps)
      .where(followUpWhere),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${calls.startedAt} at time zone ${timezone}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(calls)
      .where(callWhere)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${appointments.createdAt} at time zone ${timezone}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(appointmentWhere)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
  ]);

  const callsTotal = number(callTotals[0]?.total);
  return {
    range: { from, to, timezone },
    calls: {
      total: callsTotal,
      completed: number(callTotals[0]?.completed),
      failed: number(callTotals[0]?.failed),
      inbound: number(callTotals[0]?.inbound),
      averageDurationSeconds: Math.round(number(callDurations[0]?.average)),
    },
    appointments: {
      booked: number(appointmentTotals[0]?.booked),
      completed: number(appointmentTotals[0]?.completed),
      cancelled: number(appointmentTotals[0]?.cancelled),
      noShow: number(appointmentTotals[0]?.noShow),
      upcoming: number(appointmentTotals[0]?.upcoming),
    },
    bookings: {
      callsWithAppointment: number(linkedCalls[0]?.count),
      conversionRate: callsTotal
        ? Math.round((number(linkedCalls[0]?.count) / callsTotal) * 100)
        : 0,
    },
    followUps: {
      created: number(followUpTotals[0]?.created),
      pending: number(followUpTotals[0]?.pending),
      resolved: number(followUpTotals[0]?.resolved),
      overdue: number(followUpTotals[0]?.overdue),
    },
    daily: {
      calls: dailyCalls.map((item) => ({
        day: item.day,
        count: number(item.count),
      })),
      appointments: dailyAppointments.map((item) => ({
        day: item.day,
        count: number(item.count),
      })),
    },
    outcomes: await getOutcomeMetrics(parsed.hospitalId, from, to),
  };
}

async function getOutcomeMetrics(hospitalId: string, from: Date, to: Date) {
  const rows = await db
    .select({
      outcome: callAnalyses.outcome,
      count: sql<number>`count(*)::int`,
    })
    .from(callAnalyses)
    .innerJoin(
      calls,
      and(eq(calls.hospitalId, hospitalId), eq(calls.id, callAnalyses.callId)),
    )
    .where(
      and(
        eq(calls.hospitalId, hospitalId),
        gte(calls.startedAt, from),
        lt(calls.startedAt, to),
      ),
    )
    .groupBy(callAnalyses.outcome);
  return rows.map((row) => ({
    label: row.outcome ?? "Unclassified",
    count: number(row.count),
    source: "AI assessed" as const,
  }));
}
