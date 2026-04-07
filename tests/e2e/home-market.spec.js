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

async function expectNoUnexpectedErrorPanel(page) {
  await expect(
    page.getByRole("heading", { name: /the page hit an unexpected error/i }),
  ).toHaveCount(0);
}

test("home storefront renders core shelves", async ({ page }) => {
  await page.goto("/");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /hot listings/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /recent listings/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /top sellers/i })).toBeVisible();
});

test("market page exposes search, filters, and listings", async ({ page }) => {
  await page.goto("/market");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /^market$/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("textbox", { name: /search listings/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("button", { name: /show listings as a list/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("button", { name: /show listings as a grid/i })).toBeVisible({
    timeout: 10000,
  });
});

test("mobile market exposes the filter sheet", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-specific interaction");

  await page.goto("/market");

  await expectNoUnexpectedErrorPanel(page);
  const filterButton = page.getByRole("button", { name: /open listing filters/i });
  await expect(filterButton).toBeVisible({ timeout: 10000 });
  await filterButton.click();
  await expect(page.getByRole("heading", { name: /^filters$/i })).toBeVisible({
    timeout: 10000,
  });
});

test("events page renders the local schedule", async ({ page }) => {
  await page.goto("/events");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /^events$/i })).toBeVisible({
    timeout: 10000,
  });
});

test("store profile renders public details and follow actions", async ({ page }) => {
  await page.goto("/stores/fusion-gaming");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.locator("h1:visible").filter({ hasText: /fusion gaming/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("button", { name: /follow|following/i }).first()).toBeVisible({
    timeout: 10000,
  });
});

test("seller profile renders listings and reviews tabs", async ({ page }) => {
  await page.goto("/seller/seller-1");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /^maya$/i }).first()).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("button", { name: /listings/i }).first()).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("button", { name: /reviews/i }).first()).toBeVisible({
    timeout: 10000,
  });
});

test("stores directory renders approved local stores", async ({ page }) => {
  await page.goto("/stores");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /^stores$/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("link", { name: /fusion gaming/i })).toBeVisible({
    timeout: 10000,
  });
});

test("sellers directory renders local seller profiles", async ({ page }) => {
  await page.goto("/sellers");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /^sellers$/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("link", { name: /maya/i })).toBeVisible({
    timeout: 10000,
  });
});

test("wtb page renders active buy posts", async ({ page }) => {
  await page.goto("/wtb");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /^want to buy$/i })).toBeVisible({
    timeout: 10000,
  });
});
