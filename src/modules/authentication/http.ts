import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  ResourceNotFoundError,
} from "./errors";

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }
  if (error instanceof AuthorizationDeniedError) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (error instanceof ResourceNotFoundError) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  return NextResponse.json(
    { error: "Request could not be completed." },
    { status: 500 },
  );
}
