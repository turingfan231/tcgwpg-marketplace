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
  } = options;

  await page.goto("/auth");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page
    .getByRole("form", { name: /sign in form/i })
    .getByRole("button", { name: /^sign in$/i })
    .click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  await dismissOnboardingIfPresent(page);
  await expect(page.getByText(/active listings/i).first()).toBeVisible({
    timeout: 10000,
  });
}

test("seed auth login unlocks seller dashboard", async ({ page }) => {
  await loginAsSeedSeller(page);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/incoming offers/i)).toBeVisible();
  await expect(page.getByText(/active listings/i).first()).toBeVisible();
});

test("auth page exposes sign in, account creation, and password reset flows", async ({ page }) => {
  await page.goto("/auth");

  await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible();
  await expect(page.getByRole("form", { name: /sign in form/i })).toBeVisible();

  await page.getByRole("button", { name: /reset/i }).click();
  await expect(page.getByRole("form", { name: /reset password form/i })).toBeVisible();

  await page.getByLabel(/recovery email address/i).fill("maya@tcgwpg.local");
  await page.getByRole("button", { name: /send reset link/i }).click();
  await expect(page.getByRole("status")).toContainText(/password reset email sent/i);

  await page.getByRole("button", { name: /back to sign in/i }).click();
  await expect(page.getByRole("form", { name: /sign in form/i })).toBeVisible();

  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByRole("form", { name: /create account form/i })).toBeVisible();
});

test("seed signup creates an account or requests email confirmation cleanly", async ({ page }) => {
  const uniqueId = Date.now();

  await page.goto("/auth");
  await page.getByRole("button", { name: /create account/i }).click();

  await page.getByLabel(/^username$/i).fill(`playwright${uniqueId}`);
  await page.getByLabel(/public name/i).fill("Playwright User");
  await page.getByLabel(/email address/i).last().fill(`playwright${uniqueId}@tcgwpg.local`);
  await page.getByLabel(/create password/i).fill("demo123");
  await page.getByLabel(/postal code prefix/i).fill("R2P");
  await page
    .getByRole("form", { name: /create account form/i })
    .getByRole("button", { name: /^create account$/i })
    .click();

  await Promise.race([
    expect(page.getByRole("status")).toContainText(/account created/i, { timeout: 10000 }),
    expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 }),
  ]);
});

test("auth recovery mode exposes the recovery form", async ({ page }) => {
  await page.goto("/auth?mode=recovery");

  await expect(page.getByRole("form", { name: /choose a new password form/i })).toBeVisible();
  await expect(page.getByLabel(/^new password$/i)).toBeVisible();
  await expect(page.getByLabel(/confirm new password/i)).toBeVisible();
});

test("posting wizard publishes a new manual listing", async ({ page }) => {
  await loginAsSeedSeller(page);

  await page.getByRole("button", { name: /new listing/i }).click({ force: true });
  await expect(page).toHaveURL(/\/sell$/, { timeout: 10000 });
  await expect(page.getByText(/^Create Listing$/i).first()).toBeVisible();

  await page.getByRole("button", { name: /manual listing/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "playwright-listing.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3D1cAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByPlaceholder(/card title/i).fill("Playwright Seed Listing");
  await page.getByPlaceholder(/^0$/i).fill("123");
  await page.getByPlaceholder(/condition notes/i).fill(
    "Seed-mode listing created by Playwright to verify the posting wizard path.",
  );
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^publish$/i }).click();

  await expect(page).toHaveURL(/\/listing\//, { timeout: 10000 });
  await expect(
    page.locator("main").locator("h1, h2, h3, p").filter({ hasText: /playwright seed listing/i }).first(),
  ).toBeVisible({ timeout: 10000 });
});

test("posting wizard draft can be saved, restored, and cleared", async ({ page }) => {
  await loginAsSeedSeller(page);

  await page.goto("/sell");
  await expect(page.getByText(/^Create Listing$/i).first()).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: /manual listing/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "playwright-draft.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3D1cAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByPlaceholder(/card title/i).fill("Playwright Draft Listing");
  await page.getByPlaceholder(/^0$/i).fill("222");
  await page.getByRole("button", { name: /save draft/i }).click();

  await expect(page).toHaveURL(/\/dashboard#drafts$/, { timeout: 10000 });
  await expect(page.getByText(/playwright draft listing/i).first()).toBeVisible({
    timeout: 10000,
  });

  await page.getByRole("button", { name: /^open$/i }).first().click({ force: true });
  await expect(page).toHaveURL(/\/sell$/, { timeout: 10000 });
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByPlaceholder(/card title/i)).toHaveValue("Playwright Draft Listing");
  await expect(page.getByPlaceholder(/^0$/i)).toHaveValue("222");

  await page.getByRole("button", { name: /clear draft/i }).click();
  await expect(page.getByText(/active listings/i).first()).toBeVisible({
    timeout: 10000,
  });

  await page.goto("/dashboard");
  await expect(page.getByText(/playwright draft listing/i)).toHaveCount(0);
});

test("mobile finder stays open while the search field is focused", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsSeedSeller(page);

  await page.goto("/sell");
  await expect(page.getByText(/^Create Listing$/i).first()).toBeVisible({
    timeout: 10000,
  });

  const finderSearch = page.getByPlaceholder(/search card, set, or printing/i);
  await expect(finderSearch).toBeVisible({ timeout: 10000 });
  await finderSearch.click();

  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
  });

  await expect(finderSearch).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/popular now/i)).toBeVisible({ timeout: 10000 });
});

test("seed inbox thread allows sending a message", async ({ page }) => {
  await loginAsSeedSeller(page);

  await page.goto("/listing/listing-002");
  await page.getByRole("button", { name: /^message$/i }).click();

  await expect(page).toHaveURL(/\/inbox/, { timeout: 10000 });
  const composer = page.locator('textarea[aria-label="Message composer"]:visible').first();
  await expect(composer).toBeVisible({ timeout: 10000 });

  const draft = "Playwright smoke message";
  await composer.fill(draft);
  await page.getByRole("button", { name: /send message/i }).click();

  await expect(page.locator("p:visible").filter({ hasText: draft }).last()).toBeVisible({
    timeout: 10000,
  });
});

test("seed inbox thread supports image preview", async ({ page }) => {
  await loginAsSeedSeller(page);

  await page.goto("/listing/listing-002");
  await page.getByRole("button", { name: /^message$/i }).click();

  await expect(page).toHaveURL(/\/inbox/, { timeout: 10000 });

  const fileInput = page.locator('input[type="file"]').last();
  await fileInput.setInputFiles({
    name: "playwright-chat.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3D1cAAAAASUVORK5CYII=",
      "base64",
    ),
  });

  const composer = page.locator('textarea[aria-label="Message composer"]:visible').first();
  await composer.fill("Photo test");
  await page.getByRole("button", { name: /send message/i }).click();

  const attachment = page.getByRole("button", { name: /open attachment preview/i }).first();
  await expect(attachment).toBeVisible({ timeout: 10000 });
  await attachment.click();

  await expect(page.getByRole("button", { name: /close image preview/i })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: /close image preview/i }).click();
  await expect(page.getByRole("button", { name: /close image preview/i })).toBeHidden({
    timeout: 10000,
  });
});
