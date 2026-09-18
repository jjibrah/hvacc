import "server-only";

import { verify as verifyRetellSignature } from "retell-sdk";

import { serverEnv } from "@/shared/config/env/server";

export type RetellToolRequest = {
  name?: string;
  call: Record<string, unknown>;
  args: Record<string, unknown>;
};

export async function parseRetellToolRequest(
  rawBody: string,
  request: Request,
): Promise<RetellToolRequest> {
  const signature = request.headers.get("x-retell-signature");
  const staticSecret = request.headers.get("x-hva-voice-tool-secret");
  const signed = signature
    ? await verifyRetellSignature(rawBody, serverEnv.RETELL_API_KEY, signature)
    : false;
  const localFallback =
    process.env.NODE_ENV !== "production" &&
    Boolean(serverEnv.RETELL_VOICE_TOOL_SECRET) &&
    staticSecret === serverEnv.RETELL_VOICE_TOOL_SECRET;
  if (!signed && !localFallback)
    throw new Error("Unauthorized voice tool request.");

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const call =
    body.call && typeof body.call === "object"
      ? (body.call as Record<string, unknown>)
      : {};
  const args =
    body.args && typeof body.args === "object"
      ? (body.args as Record<string, unknown>)
      : body;
  if (typeof call.call_id !== "string" || !call.call_id.trim()) {
    throw new Error("Retell call identity is required.");
  }
  return {
    name: typeof body.name === "string" ? body.name : undefined,
    call,
    args,
  };
}
