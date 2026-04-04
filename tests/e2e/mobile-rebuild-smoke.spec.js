import { expect, test } from "@playwright/test";

async function firstDiscoveredHref(page, prefix) {
  return page
    .locator(`a[href^="${prefix}"]`)
    .first()
    .getAttribute("href")
    .catch(() => null);
}

test.describe("mobile rebuild smoke", () => {
  test("public mobile routes render without crashing", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText("TCG WPG");
    await expect(page.locator("body")).toContainText("Recent Listings");
    await expect(page.getByText("Application error")).toHaveCount(0);

    await page.goto("/market");
    await expect(page.locator("body")).toContainText("Market");
    await expect(page.getByText("Application error")).toHaveCount(0);

    await page.goto("/events");
    await expect(page.locator("body")).toContainText("Events");
    await expect(page.getByText("Application error")).toHaveCount(0);

    await page.goto("/stores");
    await expect(page.locator("body")).toContainText("Stores");
    await expect(page.getByText("Application error")).toHaveCount(0);

    await page.goto("/sellers");
    await expect(page.locator("body")).toContainText("Sellers");
    await expect(page.getByText("Application error")).toHaveCount(0);

    await page.goto("/wtb");
    await expect(page.locator("body")).toContainText("Want To Buy");
    await expect(page.getByText("Application error")).toHaveCount(0);
  });

  test("discovered store route renders", async ({ page }) => {
    await page.goto("/");
    const storeHref = await firstDiscoveredHref(page, "/stores/");
    if (storeHref) {
      await page.goto(storeHref);
      await expect(page.locator("body")).toContainText(/Store|Listings|Events/);
      await expect(page.getByText("Application error")).toHaveCount(0);
    }
  });

  test("listing detail opens and back navigation returns home", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText("Recent Listings");

    const firstListing = page.locator("[data-listing-link]").first();
    if ((await firstListing.count()) === 0) {
      await expect(page.getByText("Application error")).toHaveCount(0);
      return;
    }

    await expect(firstListing).toBeVisible();
    await firstListing.click();

    await expect(page).toHaveURL(/\/listing\//);
    await expect(page.locator("body")).toContainText(/Make Offer|Price Context|Description/);
    await expect(page.getByText("Application error")).toHaveCount(0);

    await page.getByRole("button", { name: /back/i }).first().click().catch(async () => {
      await page.getByRole("button").first().click();
    });
    await expect(page).toHaveURL("/");
    await expect(page.locator("body")).toContainText("Recent Listings");
  });

  test("protected routes redirect cleanly to auth when signed out", async ({ page }) => {
    const protectedRoutes = [
      ["/account", "Sign In"],
      ["/dashboard", "Sign In"],
      ["/collection", "Sign In"],
      ["/wishlist", "Sign In"],
      ["/notifications", "Sign In"],
      ["/inbox", "Sign In"],
      ["/beta/bugs", "Sign In"],
      ["/admin", "Sign In"],
    ];

    for (const [path, authText] of protectedRoutes) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth/);
      await expect(page.locator("body")).toContainText(authText, { timeout: 10000 });
      await expect(page.getByText("Application error")).toHaveCount(0);
    }
  });
});
