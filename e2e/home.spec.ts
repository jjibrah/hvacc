import { expect, test } from "@playwright/test";

test("shows the fictional control-center foundation", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Hospital Voice Agent Control Center" }),
  ).toBeVisible();
  await expect(page.getByText("Fictional learning environment")).toBeVisible();
  await expect(page.getByText("Module 1 in progress")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
});
