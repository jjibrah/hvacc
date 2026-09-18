import { beforeEach, describe, expect, it, vi } from "vitest";

const tools = vi.hoisted(() => ({
  parseRetellToolRequest: vi.fn(),
}));
const appointmentTools = vi.hoisted(() => ({
  getVoiceAvailability: vi.fn(),
  bookVoiceAppointment: vi.fn(),
}));

vi.mock("@/modules/integrations/retell/voice-tools", () => tools);
vi.mock(
  "@/modules/integrations/retell/appointment-tools",
  () => appointmentTools,
);

import { POST as availability } from "./availability/route";
import { POST as book } from "./book/route";

const call = { call_id: "retell-call-1", agent_id: "agent-1" };

function request() {
  return new Request("http://localhost/api/voice-tools", {
    method: "POST",
    body: "signed-body",
    headers: { "content-type": "application/json" },
  });
}

describe("Retell appointment voice tools", () => {
  beforeEach(() => vi.resetAllMocks());

  it("passes the signed Retell call identity to availability", async () => {
    tools.parseRetellToolRequest.mockResolvedValue({
      call,
      args: { department: "Cardiology" },
    });
    appointmentTools.getVoiceAvailability.mockResolvedValue({
      success: true,
      message: "Available appointment slots returned.",
      slots: [],
    });

    const response = await availability(request());

    expect(response.status).toBe(200);
    expect(appointmentTools.getVoiceAvailability).toHaveBeenCalledWith(
      "retell-call-1",
      { department: "Cardiology" },
    );
  });

  it("passes booking arguments without allowing a browser session", async () => {
    tools.parseRetellToolRequest.mockResolvedValue({
      call,
      args: { sessionId: "session-1", confirmed: true },
    });
    appointmentTools.bookVoiceAppointment.mockResolvedValue({
      success: true,
      message: "Appointment booked successfully.",
    });

    const response = await book(request());

    expect(response.status).toBe(200);
    expect(appointmentTools.bookVoiceAppointment).toHaveBeenCalledWith(
      "retell-call-1",
      { sessionId: "session-1", confirmed: true },
    );
  });

  it("returns a safe failure when tool authentication fails", async () => {
    tools.parseRetellToolRequest.mockRejectedValue(new Error("Unauthorized"));

    const response = await availability(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
    });
  });
});
