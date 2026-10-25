import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.getByTestId("product-card-3")).toBeVisible();
});

test("published storefront loads its catalog", async ({ page }) => {
  await expect(page).toHaveTitle("Rampz Store | Lab essentials, made simple");
  await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(12);
  await expect(page.locator("#results-count")).toContainText("Showing 1–12 of 20 products");
});

test("published catalog search, category, sorting, and stock filters work", async ({ page }) => {
  const cards = page.locator('[data-testid^="product-card-"]');

  await page.getByTestId("search-input").fill("beaker");
  await expect(cards).toHaveCount(1);
  await expect(page.getByTestId("product-card-3")).toBeVisible();

  await page.getByTestId("clear-filters-button").click();
  await page.getByTestId("category-filter-safety").click();
  await expect(cards.first()).toHaveAttribute("data-product-id", "14");
  await page.getByTestId("sort-products").selectOption("price-desc");
  await expect(cards.first()).toHaveAttribute("data-product-id", "15");

  await page.getByTestId("clear-filters-button").click();
  await page.getByTestId("min-price-filter").fill("1000");
  await page.getByTestId("max-price-filter").fill("1500");
  await page.locator(".stock-filter").click();
  await expect(page.getByTestId("in-stock-filter")).toBeChecked();
  await expect(cards).toHaveCount(1);
  await expect(page.getByTestId("product-card-11")).toBeVisible();
});

test("published product details and cart work in the browser", async ({ page }) => {
  await page.getByTestId("product-name-3").click();
  await expect(page.locator("#product-dialog")).toBeVisible();
  await expect(page.locator("#product-dialog")).toContainText("Glass Beaker 250ml");
  await page.getByTestId("product-dialog-add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  await page.getByTestId("open-cart-button").click();
  await expect(page.getByTestId("cart-item-3")).toBeVisible();
  await expect(page.getByTestId("cart-subtotal")).toContainText("18,50");

  await page.reload();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await page.getByTestId("open-cart-button").click();
  await expect(page.getByTestId("cart-item-3")).toBeVisible();
});
