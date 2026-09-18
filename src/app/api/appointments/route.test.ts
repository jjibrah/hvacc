import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AuthorizationDeniedError,
  BookingConflictError,
  ConfirmationRequiredError,
} from "@/modules/authentication/errors";

const scheduling = vi.hoisted(() => ({
  bookAppointment: vi.fn(),
}));

vi.mock("@/modules/scheduling/server/service", () => scheduling);

import { POST } from "./route";

const hospitalId = "00000000-0000-4000-8000-000000000001";

function request(body: unknown) {
  return new Request("http://localhost/api/appointments", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("appointment booking API contract", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns the confirmed appointment", async () => {
    scheduling.bookAppointment.mockResolvedValue({
      appointment: { id: "appointment-1", status: "confirmed" },
    });

    const response = await POST(
      request({
        hospitalId,
        sessionId: "00000000-0000-4000-8000-000000000002",
        patientId: "00000000-0000-4000-8000-000000000003",
        idempotencyKey: "booking-retry-1",
        confirmed: true,
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      data: { appointment: { id: "appointment-1", status: "confirmed" } },
    });
  });

  it("maps authorization, confirmation, and slot conflicts safely", async () => {
    for (const [error, status] of [
      [new AuthorizationDeniedError(), 403],
      [new ConfirmationRequiredError(), 400],
      [new BookingConflictError(), 409],
    ] as const) {
      scheduling.bookAppointment.mockRejectedValueOnce(error);
      const response = await POST(request({ hospitalId }));
      expect(response.status).toBe(status);
    }
  });

  it("returns 400 for malformed JSON", async () => {
    const malformed = new Request("http://localhost/api/appointments", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    });

    const response = await POST(malformed);

    expect(response.status).toBe(400);
  });
});
