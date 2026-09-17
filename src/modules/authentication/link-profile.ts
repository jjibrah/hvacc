import "dotenv/config";

import { and, eq, or } from "drizzle-orm";

import { createDatabaseConnection } from "@/modules/database/connection";
import { hospitalMemberships, profiles } from "@/modules/database/schema";

import { createSupabaseAdminClientForCredentials } from "./supabase/admin-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}
const { db, client: databaseClient } = createDatabaseConnection(databaseUrl);

const [profileEmail, authEmail] = process.argv.slice(2);

const seededProfileAliases: Record<string, string> = {
  "aina.reception@example.test": "Aina Reception",
  "daniel.operations@example.test": "Daniel Operations",
  "mei.quality@example.test": "Mei Quality",
  "amir.rahman@example.test": "Dr Amir Rahman",
  "siti.admin@example.test": "Siti Hospital Admin",
  "alex.platform@example.test": "Alex Platform Admin",
};

if (!profileEmail || !authEmail) {
  console.error(
    "Usage: npm run auth:link-profile -- <synthetic-profile-email> <supabase-auth-email>",
  );
  process.exit(1);
}

async function linkProfile() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Profile linking is disabled in production.");
  }

  const [profile] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      authUserId: profiles.authUserId,
      status: profiles.status,
    })
    .from(profiles)
    .where(
      seededProfileAliases[profileEmail]
        ? or(
            eq(profiles.email, profileEmail),
            eq(profiles.displayName, seededProfileAliases[profileEmail]),
          )
        : eq(profiles.email, profileEmail),
    );
  if (!profile) throw new Error("Profile email was not found.");
  if (profile.status !== "active") {
    throw new Error("Only active profiles can be linked.");
  }

  const membership = await db.query.hospitalMemberships.findFirst({
    where: and(
      eq(hospitalMemberships.profileId, profile.id),
      eq(hospitalMemberships.status, "active"),
    ),
  });
  if (!membership) throw new Error("Profile is not an active hospital member.");

  const admin = createSupabaseAdminClientForCredentials(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error("Supabase Auth users could not be listed.");
  const user = data.users.find(
    ({ email }) => email?.toLowerCase() === authEmail.toLowerCase(),
  );
  if (!user)
    throw new Error(
      "Supabase Auth email was not found. Create the user first.",
    );

  const [existingLink] = await db
    .select({ id: profiles.id, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.authUserId, user.id));
  if (existingLink && existingLink.id !== profile.id) {
    throw new Error(
      `Supabase Auth user is already linked to profile ${existingLink.email}.`,
    );
  }

  if (profile.authUserId === user.id) {
    console.log(`Profile ${profile.email} is already linked to ${authEmail}.`);
    return;
  }

  await db
    .update(profiles)
    .set({
      authUserId: user.id,
      email: user.email ?? authEmail,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profile.id));

  console.log(`Linked ${authEmail} to profile ${profile.id}.`);
}

linkProfile()
  .then(async () => {
    await databaseClient.end();
    process.exitCode = 0;
  })
  .catch(async (error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Profile linking failed.",
    );
    await databaseClient.end();
    process.exitCode = 1;
  });
