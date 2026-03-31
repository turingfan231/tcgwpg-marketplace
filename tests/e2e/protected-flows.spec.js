import { expect, test } from "@playwright/test";

async function dismissOnboardingIfPresent(page) {
  const onboardingDialog = page.getByRole("dialog", { name: /finish account setup/i });
  await onboardingDialog
    .getByRole("button", { name: /later/i })
    .click({ timeout: 2000 })
    .catch(() => {});
  await expect(onboardingDialog).toBeHidden({ timeout: 5000 }).catch(() => {});
}

async function loginAsSeedSeller(page, options = {}) {
  const {
    email = "maya@tcgwpg.local",
    password = "demo123",
    expectedHeading = /manage maya chen's listings/i,
  } = options;

  await page.goto("/auth");

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  const loginForm = page.locator("form").filter({
    has: page.getByLabel(/^password$/i),
  });
  await loginForm.getByRole("button", { name: /^login$/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  await dismissOnboardingIfPresent(page);

  await expect(page.getByRole("heading", { name: expectedHeading })).toBeVisible({
    timeout: 10000,
  });
}

test("seed auth login unlocks seller dashboard", async ({ page }) => {
  await loginAsSeedSeller(page);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /active listings first/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /incoming offers/i })).toBeVisible();
});

test("auth page exposes login, signup, and password reset flows", async ({ page }) => {
  await page.goto("/auth");

  await expect(page.getByRole("heading", { name: /sign in or create your account/i })).toBeVisible();
  await expect(page.getByRole("form", { name: /login form/i })).toBeVisible();

  await page.getByRole("button", { name: /reset password/i }).click();
  await expect(page.getByRole("form", { name: /password reset form/i })).toBeVisible();

  await page.getByLabel(/email/i).fill("maya@tcgwpg.local");
  await page.getByRole("button", { name: /send reset email/i }).click();
  await expect(page.getByRole("status")).toContainText(/password reset email sent/i);

  await page.getByRole("button", { name: /back to login/i }).click();
  await expect(page.getByRole("form", { name: /login form/i })).toBeVisible();

  await page.getByRole("button", { name: /^sign up$/i }).click();
  await expect(page.getByRole("form", { name: /sign up form/i })).toBeVisible();
});

test("seed signup creates an account and lands on dashboard", async ({ page }) => {
  const uniqueId = Date.now();

  await page.goto("/auth");
  await page.getByRole("button", { name: /^sign up$/i }).click();

  await page.getByLabel(/username/i).fill(`playwright${uniqueId}`);
  await page.getByLabel(/actual name/i).fill("Playwright User");
  await page.getByLabel(/^email$/i).fill(`playwright${uniqueId}@tcgwpg.local`);
  await page.getByLabel(/postal code area/i).fill("R2P");
  await page.getByLabel(/^password$/i).last().fill("demo123");
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  await dismissOnboardingIfPresent(page);
  await expect(page.getByRole("heading", { name: /manage playwright user's listings/i })).toBeVisible({
    timeout: 10000,
  });
});

test("auth recovery mode exposes the password recovery form", async ({ page }) => {
  await page.goto("/auth?mode=recovery");

  await expect(page.getByRole("form", { name: /password recovery form/i })).toBeVisible();
  await expect(page.getByLabel(/new password/i)).toBeVisible();
  await expect(page.getByLabel(/confirm password/i)).toBeVisible();
});

test("posting wizard publishes a new listing in seed mode", async ({ page }) => {
  await loginAsSeedSeller(page);

  await page.getByRole("button", { name: /new listing/i }).click({ force: true });
  await expect(page.getByRole("dialog", { name: /create listing/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByLabel(/listing title/i)).toBeVisible({
    timeout: 10000,
  });

  await page.getByLabel(/listing title/i).fill("Playwright Seed Listing");
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByLabel(/asking price \(cad\)/i).fill("123");
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByLabel(/description/i).fill(
    "Seed-mode listing created by Playwright to verify the posting wizard path.",
  );
  await page.getByRole("button", { name: /post listing/i }).click();

  await expect(page).toHaveURL(/\/listing\//, { timeout: 10000 });
  await expect(
    page.locator("main").locator("h1, h2, h3").filter({ hasText: /playwright seed listing/i }).first(),
  ).toBeVisible({
    timeout: 10000,
  });
});

test("posting wizard draft can be saved, restored, and cleared", async ({ page }) => {
  await loginAsSeedSeller(page);

  await page.getByRole("button", { name: /new listing/i }).click({ force: true });
  await expect(page.getByRole("dialog", { name: /create listing/i })).toBeVisible({
    timeout: 10000,
  });

  await page.getByLabel(/listing title/i).fill("Playwright Draft Listing");
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByLabel(/asking price \(cad\)/i).fill("222");
  await page.getByRole("button", { name: /save draft/i }).click();

  await expect(page.getByText(/draft saved|draft autosaved/i)).toBeVisible({
    timeout: 10000,
  });

  await page.getByRole("button", { name: /^cancel$/i }).click();
  await expect(page.getByRole("dialog", { name: /create listing/i })).toBeHidden({
    timeout: 10000,
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /saved listing drafts/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText(/playwright draft listing/i).first()).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: /open draft/i }).first().click();
  await expect(page.getByRole("dialog", { name: /create listing/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByLabel(/listing title/i)).toHaveValue("Playwright Draft Listing");
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByLabel(/asking price \(cad\)/i)).toHaveValue("222");

  await page.getByRole("button", { name: /clear draft/i }).click();
  await expect(page.getByText(/draft cleared/i)).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: /^cancel$/i }).click();
  await expect(page.getByRole("dialog", { name: /create listing/i })).toBeHidden({
    timeout: 10000,
  });

  await page.goto("/dashboard");
  await expect(page.getByText(/playwright draft listing/i)).toHaveCount(0);
});

test("mobile finder stays open while the search field is focused", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsSeedSeller(page);

  await page.getByRole("button", { name: /new listing/i }).click({ force: true });
  await expect(page.getByRole("dialog", { name: /create listing/i })).toBeVisible({
    timeout: 10000,
  });

  const openFinderButton = page.getByRole("button", { name: /open finder/i });
  await openFinderButton.click();

  const finderSearch = page.getByRole("combobox", {
    name: /search (pokemon|magic|one piece|dragon ball super fusion world|union arena) card database/i,
  });
  await expect(finderSearch).toBeVisible({ timeout: 10000 });
  await finderSearch.click();

  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
  });

  await expect(finderSearch).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: /hide finder/i })).toBeVisible({
    timeout: 10000,
  });
});

test("seed inbox thread allows sending a message", async ({ page }) => {
  await loginAsSeedSeller(page);

  await page.goto("/listing/listing-002");
  await page.getByRole("button", { name: /message seller/i }).click();

  await expect(page).toHaveURL(/\/messages/, { timeout: 10000 });
  await page
    .getByRole("button", { name: /sheoldred, the apocalypse/i })
    .first()
    .click();
  await expect(
    page.getByPlaceholder(/write about condition, trades, meetup timing/i),
  ).toBeVisible({
    timeout: 10000,
  });

  const draft = "Playwright smoke message";
  await page
    .getByPlaceholder(/write about condition, trades, meetup timing/i)
    .fill(draft);
  await page.locator('form').last().locator('button[type="submit"]').click();

  await expect(page.getByText(draft).last()).toBeVisible({ timeout: 10000 });
});

test("seed inbox thread supports image preview", async ({ page }) => {
  await loginAsSeedSeller(page);

  await page.goto("/listing/listing-002");
  await page.getByRole("button", { name: /message seller/i }).click();

  await expect(page).toHaveURL(/\/messages/, { timeout: 10000 });
  await page.getByRole("button", { name: /sheoldred, the apocalypse/i }).click();

  const fileInput = page.locator('input[type="file"]').last();
  await fileInput.setInputFiles({
    name: "playwright-chat.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3D1cAAAAASUVORK5CYII=",
      "base64",
    ),
  });

  await page.locator('form').last().locator('button[type="submit"]').click();

  const attachmentButton = page.locator("button").filter({
    has: page.getByRole("img", { name: /playwright-chat\.png|chat photo/i }),
  }).last();
  await expect(attachmentButton).toBeVisible({ timeout: 10000 });
  await attachmentButton.click();

  await expect(page.getByRole("button", { name: /exit preview/i })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: /exit preview/i }).click();
  await expect(page.getByRole("button", { name: /exit preview/i })).toBeHidden({
    timeout: 10000,
  });
});
