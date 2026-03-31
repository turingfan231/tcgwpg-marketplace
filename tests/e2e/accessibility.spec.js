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
  const builder = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
  ;

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
  await expect(page.getByRole("heading", { name: /hot listings right now/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("market page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/market");
  await expect(page.getByRole("heading", { name: /all listings/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("listing detail page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/listing/listing-002");
  await expect(page.getByRole("heading", { name: /sheoldred, the apocalypse/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("auth page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /sign in or create your account/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("events page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/events");
  await expect(
    page.getByRole("heading", { name: /winnipeg tournaments, leagues, and local nights/i }),
  ).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("stores page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/stores");
  await expect(page.getByRole("heading", { name: /approved local stores/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("seller profile page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/seller/seller-1");
  await expect(page.getByRole("heading", { name: /^maya$/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("wtb page has no serious accessibility violations", async ({ page }) => {
  await page.goto("/wtb");
  await expect(page.getByRole("heading", { name: /local buyers looking for cards right now/i })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("create listing dialog has no serious accessibility violations", async ({ page }) => {
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill("maya@tcgwpg.local");
  await page.getByLabel(/^password$/i).fill("demo123");
  await page
    .getByRole("form", { name: /login form/i })
    .getByRole("button", { name: /^login$/i })
    .click();
  await page.goto("/dashboard");

  const onboardingDialog = page.getByRole("dialog", { name: /finish account setup/i });
  await onboardingDialog
    .getByRole("button", { name: /later/i })
    .click({ timeout: 2000 })
    .catch(() => {});

  await page.getByRole("button", { name: /new listing/i }).click({ force: true });
  const dialog = page.getByRole("dialog", { name: /create listing/i });
  await expect(dialog).toBeVisible();
  await expectNoSeriousA11yViolations(page, '[role="dialog"][aria-modal="true"]');
});
