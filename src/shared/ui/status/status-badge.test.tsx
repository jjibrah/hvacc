import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the supplied status", () => {
    render(<StatusBadge status="complete" />);

    expect(screen.getByText("complete")).toBeInTheDocument();
  });
});
