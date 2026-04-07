import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/events/local", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ events: [] }),
    });
  });
});

async function expectNoSeriousA11yViolations(page, includeSelector) {
  const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
  if (includeSelector) {
    builder.include(includeSelector);
  }

  const results = await builder.analyze();
  const seriousViolations = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact || ""),
  );

  expect(
    seriousViolations,
    seriousViolations
      .map(
        (violation) =>
          `${violation.id}: ${violation.help} -> ${violation.nodes
            .map((node) => node.target.join(" "))
            .join(", ")}`,
      )
      .join("\n"),
  ).toEqual([]);
}

test("home page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /hot listings/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("market page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/market");
  await expect(page.getByRole("heading", { name: /^market$/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("listing detail page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/listing/listing-002");
  await expect(page.getByRole("heading", { name: /sheoldred, the apocalypse/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("auth page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("events page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: /^events$/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("stores page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/stores");
  await expect(page.getByRole("heading", { name: /^stores$/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("seller profile page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/seller/seller-1");
  await expect(page.getByRole("heading", { name: /^maya$/i }).first()).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("wtb page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/wtb");
  await expect(page.getByRole("heading", { name: /^want to buy$/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("create listing page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/auth");
  await page.getByLabel(/email address/i).fill("maya@tcgwpg.local");
  await page.getByLabel(/^password$/i).fill("demo123");
  await page
    .getByRole("form", { name: /sign in form/i })
    .getByRole("button", { name: /^sign in$/i })
    .click();

  await page.goto("/sell");
  await expect(page.getByText(/^Create Listing$/i).first()).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});
