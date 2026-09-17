import type { ZodType } from "zod";

export function parseEnv<T>(
  schema: ZodType<T>,
  values: unknown,
  label: string,
): T {
  const result = schema.safeParse(values);

  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Invalid ${label} environment configuration${fields ? `: ${fields}` : ""}.`,
    );
  }

  return result.data;
}
