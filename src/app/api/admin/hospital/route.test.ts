import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AuthorizationDeniedError,
  ConcurrentModificationError,
  DuplicateResourceError,
  ResourceNotFoundError,
} from "@/modules/authentication/errors";

const administration = vi.hoisted(() => ({
  getHospitalAdministration: vi.fn(),
  updateHospitalConfiguration: vi.fn(),
}));

vi.mock(
  "@/modules/hospital-administration/server/service",
  () => administration,
);

import { GET, PATCH } from "./route";

const hospitalId = "00000000-0000-4000-8000-000000000001";

function request(method: string, body?: unknown) {
  return new Request(
    `http://localhost/api/admin/hospital?hospitalId=${hospitalId}`,
    {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: { "content-type": "application/json" },
    },
  );
}

describe("hospital administration API contract", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns hospital data for an authorized request", async () => {
    administration.getHospitalAdministration.mockResolvedValue({
      hospital: { id: hospitalId },
      configuration: { hospitalId },
    });

    const response = await GET(request("GET"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        hospital: { id: hospitalId },
        configuration: { hospitalId },
      },
    });
  });

  it("rejects an unauthorized request", async () => {
    administration.getHospitalAdministration.mockRejectedValue(
      new AuthorizationDeniedError(),
    );

    const response = await GET(request("GET"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Not authorized." });
  });

  it("returns 400 for malformed JSON", async () => {
    const malformed = new Request(
      `http://localhost/api/admin/hospital?hospitalId=${hospitalId}`,
      {
        method: "PATCH",
        body: "{",
        headers: { "content-type": "application/json" },
      },
    );

    const response = await PATCH(malformed);

    expect(response.status).toBe(400);
  });

  it("does not reveal a cross-hospital resource", async () => {
    administration.getHospitalAdministration.mockRejectedValue(
      new ResourceNotFoundError(),
    );

    const response = await GET(request("GET"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found." });
  });

  it("returns 409 for a stale update", async () => {
    administration.updateHospitalConfiguration.mockRejectedValue(
      new ConcurrentModificationError(),
    );

    const response = await PATCH(request("PATCH", { hospitalId }));

    expect(response.status).toBe(409);
  });

  it("returns 409 for a duplicate mutation", async () => {
    administration.updateHospitalConfiguration.mockRejectedValue(
      new DuplicateResourceError(),
    );

    const response = await PATCH(request("PATCH", { hospitalId }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "The resource already exists.",
    });
  });
});
