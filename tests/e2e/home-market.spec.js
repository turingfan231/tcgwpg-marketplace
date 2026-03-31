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
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: /hot listings right now/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /fresh cards/i })).toBeVisible();
});

test("market page exposes search, scope pills, and listings", async ({ page }) => {
  await page.goto("/market");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.locator("main").nth(1)).toBeVisible();
  await expect(page.getByRole("heading", { name: /all listings|marketplace/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("button", { name: /^listings$/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("button", { name: /^cards$/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("textbox", { name: /search listings/i })).toBeVisible({
    timeout: 10000,
  });
});

test("mobile market exposes filter and load more interactions", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-specific interaction");

  await page.goto("/market");

  await expectNoUnexpectedErrorPanel(page);
  const filterButton = page.getByRole("button", { name: /^filters$/i });
  await expect(filterButton).toBeVisible({ timeout: 10000 });
  await filterButton.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });
});

test("events page renders filterable local schedule", async ({ page }) => {
  await page.goto("/events");

  await expectNoUnexpectedErrorPanel(page);
  await expect(
    page.getByRole("heading", { name: /winnipeg tournaments, leagues, and local nights/i }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("combobox").first()).toBeVisible({ timeout: 10000 });
});

test("store profile renders public calendar and featured listings", async ({ page }) => {
  await page.goto("/stores/fusion-gaming");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /fusion gaming/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("heading", { name: /store calendar/i })).toBeVisible({
    timeout: 10000,
  });
});

test("seller profile renders storefront and reviews", async ({ page }) => {
  await page.goto("/seller/seller-1");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /^maya$/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("heading", { name: /active listings/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("heading", { name: /recent feedback/i })).toBeVisible({
    timeout: 10000,
  });
});

test("stores directory renders approved local stores", async ({ page }) => {
  await page.goto("/stores");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /approved local stores/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("link", { name: /fusion gaming/i })).toBeVisible({
    timeout: 10000,
  });
});

test("sellers directory renders local seller storefronts", async ({ page }) => {
  await page.goto("/sellers");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /search local seller storefronts/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("link", { name: /maya/i })).toBeVisible({
    timeout: 10000,
  });
});

test("wtb page renders active buy posts", async ({ page }) => {
  await page.goto("/wtb");

  await expectNoUnexpectedErrorPanel(page);
  await expect(page.getByRole("heading", { name: /local buyers looking for cards right now/i })).toBeVisible({
    timeout: 10000,
  });
});
