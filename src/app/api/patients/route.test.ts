import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({ listPatients: vi.fn() }));
vi.mock("@/modules/patients/server/service", () => service);

import { GET } from "./route";

describe("patients API", () => {
  beforeEach(() => vi.resetAllMocks());

  it("passes hospital-scoped search and pagination to the service", async () => {
    service.listPatients.mockResolvedValue({
      items: [],
      pagination: { page: 2, pageSize: 25, total: 0, totalPages: 0 },
    });
    const response = await GET(
      new Request(
        "http://localhost/api/patients?hospitalId=00000000-0000-4000-8000-000000000001&search=ahmed&page=2",
      ),
    );
    expect(response.status).toBe(200);
    expect(service.listPatients).toHaveBeenCalledWith({
      hospitalId: "00000000-0000-4000-8000-000000000001",
      search: "ahmed",
      page: "2",
    });
  });
});
