import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({ getOverviewMetrics: vi.fn() }));
vi.mock("@/modules/reports/server/service", () => service);

import { GET } from "./route";

describe("reports overview API", () => {
  beforeEach(() => vi.resetAllMocks());

  it("passes the hospital and date range to the reporting service", async () => {
    service.getOverviewMetrics.mockResolvedValue({ calls: { total: 0 } });
    const response = await GET(
      new Request(
        "http://localhost/api/reports/overview?hospitalId=00000000-0000-4000-8000-000000000001&from=2026-09-01&to=2026-09-30&timezone=Asia%2FKuala_Lumpur",
      ),
    );
    expect(response.status).toBe(200);
    expect(service.getOverviewMetrics).toHaveBeenCalledWith({
      hospitalId: "00000000-0000-4000-8000-000000000001",
      from: "2026-09-01",
      to: "2026-09-30",
      timezone: "Asia/Kuala_Lumpur",
    });
  });
});
