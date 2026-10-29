import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  const reset = await request.post("/api/v1/test/reset");
  expect(reset.ok()).toBeTruthy();
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("product-card-3")).toBeVisible();
});

async function startCheckout(page, { productId = 3, email = "novo@rampz.test" } = {}) {
  await page.getByTestId(`add-to-cart-button-${productId}`).click();
  await page.getByTestId("open-cart-button").click();
  await page.getByTestId("checkout-button").click();
  await expect(page.getByTestId("checkout-address-form")).toBeVisible();

  await page.getByTestId("checkout-name-input").fill("Playwright Demo");
  await page.getByTestId("checkout-email-input").fill(email);
  await page.getByTestId("checkout-cep-input").fill("01310-000");
  await page.getByTestId("checkout-street-input").fill("Automation Street");
  await page.getByTestId("checkout-number-input").fill("42");
  await page.getByTestId("checkout-city-input").fill("Sao Paulo");
  await page.getByTestId("checkout-state-input").fill("SP");
  await page.getByTestId("checkout-address-continue").click();
  await expect(page.getByTestId("checkout-shipping-form")).toBeVisible();
}

async function continueToPayment(page) {
  await page.getByTestId("checkout-shipping-continue").click();
  await expect(page.getByTestId("checkout-payment-form")).toBeVisible();
}

async function enterReview(page, method = "card", cardNumber = "4111 1111 1111 1111") {
  await page.getByTestId(`payment-method-${method}`).check();
  if (method === "card") {
    await page.getByTestId("checkout-card-name-input").fill("Playwright Demo");
    await page.getByTestId("checkout-card-number-input").fill(cardNumber);
    await page.getByTestId("checkout-card-expiry-input").fill("12/30");
    await page.getByTestId("checkout-card-cvc-input").fill("123");
  }
  await page.getByTestId("checkout-payment-continue").click();
  await expect(page.getByTestId("checkout-review-form")).toBeVisible();
}

test("catalog search, category, sorting, and empty state work", async ({ page }) => {
  const cards = page.locator('[data-testid^="product-card-"]');
  await expect(cards).toHaveCount(12);
  const productImages = page.locator(".product-card .product-image");
  await expect(productImages).toHaveCount(12);
  await expect.poll(() => productImages.evaluateAll((images) =>
    images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);

  await page.getByTestId("search-input").fill("beaker");
  await expect(page.getByTestId("product-card-3")).toBeVisible();
  await expect(cards).toHaveCount(1);

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

  await page.getByTestId("clear-filters-button").click();
  await page.getByTestId("search-input").fill("no matching demo item");
  await expect(page.getByTestId("empty-clear-filters-button")).toBeVisible();
  await expect(cards).toHaveCount(0);
});

test("product details and cart quantity controls update totals", async ({ page }) => {
  await page.getByTestId("product-name-3").click();
  await expect(page.locator("#product-dialog")).toBeVisible();
  await expect(page.locator("#product-dialog")).toContainText("Glass Beaker 250ml");
  await page.getByTestId("product-dialog-add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  await page.getByTestId("open-cart-button").click();
  await expect(page.getByTestId("cart-item-3")).toBeVisible();
  await expect(page.getByTestId("cart-subtotal")).toContainText("18,50");
  await page.getByTestId("cart-item-increase-3").click();
  await expect(page.getByTestId("cart-item-3")).toContainText("2");
  await expect(page.getByTestId("cart-subtotal")).toContainText("37,00");
  await page.reload();
  await expect(page.getByTestId("cart-count")).toHaveText("2");
  await page.getByTestId("open-cart-button").click();
  await expect(page.getByTestId("cart-item-3")).toContainText("2");
  await expect(page.getByTestId("cart-subtotal")).toContainText("37,00");
  for (let quantity = 2; quantity < 10; quantity += 1) {
    await page.getByTestId("cart-item-increase-3").click();
  }
  await expect(page.getByTestId("cart-item-3")).toContainText("10");
  await expect(page.getByTestId("cart-item-increase-3")).toBeDisabled();
  await page.getByTestId("cart-item-remove-3").click();
  await expect(page.locator("#cart-empty")).toBeVisible();
});

test("out-of-stock products cannot be added and empty carts cannot start checkout", async ({ page }) => {
  await expect(page.getByTestId("product-card-12")).toContainText("Unavailable");
  await expect(page.getByTestId("add-to-cart-button-12")).toHaveCount(0);
  await page.getByTestId("open-cart-button").click();
  await expect(page.locator("#cart-empty")).toBeVisible();
  await expect(page.getByTestId("checkout-button")).toBeHidden();
});

test("checkout validates address, shipping, coupon, and review", async ({ page }) => {
  await startCheckout(page, { productId: 11 });
  await page.getByTestId("checkout-coupon-input").fill("LAB20");
  await page.getByTestId("checkout-apply-coupon").click();
  await expect(page.locator(".coupon-success")).toContainText("LAB20 applied");
  await expect(page.getByTestId("checkout-total")).toBeVisible();

  await page.getByTestId("checkout-coupon-input").fill("INVALIDO");
  await page.getByTestId("checkout-apply-coupon").click();
  await expect(page.locator(".checkout-error[role='alert']")).toBeVisible();

  await continueToPayment(page);
  await enterReview(page);
  await expect(page.getByTestId("checkout-review-form")).toContainText("Playwright Demo");
  await expect(page.locator(".checkout-simulation-note")).toContainText("No real payment");
});

test("checkout keeps invalid addresses in place and exposes shipping loading state", async ({ page }) => {
  await page.getByTestId("add-to-cart-button-3").click();
  await page.getByTestId("open-cart-button").click();
  await page.getByTestId("checkout-button").click();
  await page.getByTestId("checkout-name-input").fill("Playwright Demo");
  await page.getByTestId("checkout-email-input").fill("novo@rampz.test");
  await page.getByTestId("checkout-cep-input").fill("1234");
  await page.getByTestId("checkout-street-input").fill("Automation Street");
  await page.getByTestId("checkout-number-input").fill("42");
  await page.getByTestId("checkout-city-input").fill("Sao Paulo");
  await page.getByTestId("checkout-state-input").fill("SP");
  await page.getByTestId("checkout-address-continue").click();
  await expect(page.getByTestId("checkout-address-form")).toBeVisible();
  await expect.poll(() => page.getByTestId("checkout-cep-input").evaluate((input) => input.validity.valid)).toBe(false);

  let releaseShipping;
  const shippingBlocked = new Promise((resolve) => { releaseShipping = resolve; });
  await page.route("**/api/v1/shipping/calculate", async (route) => {
    await shippingBlocked;
    await route.continue();
  });
  await page.getByTestId("checkout-cep-input").fill("01310-000");
  await page.getByTestId("checkout-address-continue").click();
  await expect(page.getByTestId("checkout-address-continue")).toBeDisabled();
  await expect(page.getByTestId("checkout-address-continue")).toContainText("Calculating shipping");
  releaseShipping();
  await expect(page.getByTestId("checkout-shipping-form")).toBeVisible();
});

test("card installments are rejected below the minimum and alternate demo methods remain available", async ({ page }) => {
  await startCheckout(page);
  await continueToPayment(page);
  await page.getByTestId("checkout-card-name-input").fill("Playwright Demo");
  await page.getByTestId("checkout-card-number-input").fill("4111 1111 1111 1111");
  await page.getByTestId("checkout-card-expiry-input").fill("12/30");
  await page.getByTestId("checkout-card-cvc-input").fill("123");
  await page.getByTestId("checkout-payment-continue").click();
  await expect(page.getByTestId("checkout-payment-form")).toBeVisible();
  await expect(page.locator(".checkout-error[role='alert']")).toContainText("installments must be at least R$ 50,00");

  await page.getByTestId("payment-method-pix").check();
  await page.getByTestId("checkout-payment-continue").click();
  await expect(page.getByTestId("checkout-review-form")).toBeVisible();
});

test("approved demo card creates a paid order and confirms no charge", async ({ page }) => {
  await startCheckout(page, { productId: 11 });
  await continueToPayment(page);
  await enterReview(page);
  await page.getByTestId("checkout-place-order").click();
  await expect(page.getByTestId("order-confirmation-number")).toBeVisible();
  await expect(page.locator(".order-confirmation")).toContainText("No real payment was collected");
  await expect(page.locator(".confirmation-details")).toContainText("Credit card · Paid");
});

for (const [scenario, cardNumber, expectedError] of [
  ["declined", "4000 0000 0000 0002", "The demo card was declined"],
  ["timeout", "4000 0000 0000 0119", "The simulated payment timed out"],
]) {
  test(`demo card ${scenario} leaves payment uncharged`, async ({ page }) => {
    const originalOrderCount = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("rampz-store-orders")).length);
    await startCheckout(page, { productId: 11 });
    await continueToPayment(page);
    await enterReview(page, "card", cardNumber);
    await page.getByTestId("checkout-place-order").click();
    await expect(page.getByTestId("checkout-payment-form")).toBeVisible();
    await expect(page.locator(".checkout-error[role='alert']")).toContainText(expectedError);
    await expect(page.getByTestId("order-confirmation-number")).toHaveCount(0);
    await expect(page.getByTestId("cart-count")).toHaveText("1");
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem("rampz-store-orders")).length)).toBe(originalOrderCount);
  });
}

test("Pix creates a simulated paid order with fictional QR", async ({ page }) => {
  await startCheckout(page);
  await continueToPayment(page);
  await enterReview(page, "pix");
  await expect(page.getByTestId("checkout-review-form")).toContainText("5% demo discount");
  await page.getByTestId("checkout-place-order").click();
  await expect(page.getByTestId("order-confirmation-number")).toBeVisible();
  await expect(page.locator(".fictional-code")).toContainText("not a payment QR code");
  await expect(page.locator(".confirmation-details")).toContainText("Pix · Paid");
});

test("boleto creates a pending order with fictional barcode", async ({ page }) => {
  await startCheckout(page);
  await continueToPayment(page);
  await enterReview(page, "boleto");
  await page.getByTestId("checkout-place-order").click();
  await expect(page.getByTestId("order-confirmation-number")).toBeVisible();
  await expect(page.locator(".fictional-code")).toContainText("not a real payment slip");
  await expect(page.locator(".confirmation-details")).toContainText("Boleto · Awaiting payment");
});

test("demo account can sign in, cancel a pending order, and sign out", async ({ page }) => {
  await page.getByTestId("open-account-button").click();
  await page.getByTestId("login-email-input").fill("cliente@rampz.test");
  await page.getByTestId("login-password-input").fill("Teste@1234");
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("account-dashboard")).toBeVisible();
  await expect(page.locator(".account-order")).toHaveCount(2);

  await page.getByTestId("cancel-order-rmp-2026-000002").click();
  await expect(page.locator(".account-message")).toContainText("was cancelled");
  await page.getByTestId("logout-button").click();
  await expect(page.getByTestId("login-form")).toBeVisible();
});

test("admin can advance a pending demo order to paid", async ({ page }) => {
  await page.getByTestId("open-account-button").click();
  await page.getByTestId("login-email-input").fill("admin@rampz.test");
  await page.getByTestId("login-password-input").fill("Admin@1234");
  await page.getByTestId("login-submit-button").click();
  await page.getByTestId("admin-tab-orders").click();

  const pendingOrder = page.getByTestId("admin-order-rmp-2026-000002");
  await expect(pendingOrder).toContainText("Awaiting payment");
  await pendingOrder.getByTestId("admin-order-status-select").selectOption("PAGO");
  await pendingOrder.getByTestId("admin-order-status-save").click();
  await expect(page.getByTestId("admin-order-rmp-2026-000002")).toContainText("Paid");

  await page.getByTestId("admin-tab-products").click();
  await expect(page.getByTestId("admin-product-8")).toContainText("89 available");
});

test("invalid and unknown demo logins use the same error message", async ({ page }) => {
  await page.getByTestId("open-account-button").click();
  await page.getByTestId("login-email-input").fill("cliente@rampz.test");
  await page.getByTestId("login-password-input").fill("WrongPassword@1");
  await page.getByTestId("login-submit-button").click();
  const knownAccountError = await page.locator(".account-message[role='alert']").textContent();
  expect(knownAccountError).toContain("Check your details");

  await page.getByTestId("login-email-input").fill("missing@rampz.test");
  await page.getByTestId("login-password-input").fill("WrongPassword@1");
  await page.getByTestId("login-submit-button").click();
  await expect(page.locator(".account-message[role='alert']")).toHaveText(knownAccountError);
});

test("a new local demo account can register and sign out", async ({ page }) => {
  await page.getByTestId("open-account-button").click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByTestId("register-name-input").fill("Playwright Customer");
  await page.getByTestId("register-email-input").fill("playwright-new@rampz.test");
  await page.getByTestId("register-cpf-input").fill("123.456.789-09");
  await page.getByTestId("register-phone-input").fill("(11) 99999-1002");
  await page.getByTestId("register-password-input").fill("DemoPass@123");
  await page.getByTestId("register-confirm-password-input").fill("DemoPass@123");
  await page.getByTestId("register-submit-button").click();
  await expect(page.getByTestId("account-dashboard")).toBeVisible();
  await expect(page.locator(".account-profile")).toContainText("Playwright Customer");
  await page.getByTestId("logout-button").click();
  await expect(page.getByTestId("login-form")).toBeVisible();
});

test("demo password recovery updates the local password without sending email", async ({ page }) => {
  await page.getByTestId("open-account-button").click();
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await page.getByTestId("recovery-email-input").fill("cliente@rampz.test");
  await page.getByRole("button", { name: "Generate demo reset code" }).click();
  const token = await page.getByTestId("recovery-demo-token").textContent();
  expect(token).toMatch(/^\d{6}$/);

  await page.getByTestId("recovery-token-input").fill(token);
  await page.getByTestId("recovery-password-input").fill("UpdatedDemo@123");
  await page.getByTestId("recovery-submit-button").click();
  await expect(page.getByTestId("login-form")).toBeVisible();
  await expect(page.locator(".account-message")).toContainText("Password updated");

  await page.getByTestId("login-email-input").fill("cliente@rampz.test");
  await page.getByTestId("login-password-input").fill("UpdatedDemo@123");
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("account-dashboard")).toBeVisible();
});

test("admin can create, edit, and delete a local demo product", async ({ page }) => {
  await page.getByTestId("open-account-button").click();
  await page.getByTestId("login-email-input").fill("admin@rampz.test");
  await page.getByTestId("login-password-input").fill("Admin@1234");
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("admin-product-form")).toBeVisible();

  await page.getByTestId("admin-product-name").fill("Playwright Sample");
  await page.getByTestId("admin-product-description").fill("Temporary item created by an isolated browser test.");
  await page.getByTestId("admin-product-category").selectOption("Tools & Accessories");
  await page.getByTestId("admin-product-price").fill("12.50");
  await page.getByTestId("admin-product-stock").fill("4");
  await page.getByTestId("admin-product-symbol").fill("PW");
  await page.getByTestId("admin-product-save").click();
  await expect(page.getByTestId("admin-product-21")).toContainText("Playwright Sample");
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("rampz-store-products")).find((product) => product.id === 21)?.price)).toBe(12.5);

  await page.getByTestId("admin-product-edit-21").click();
  await page.getByTestId("admin-product-name").fill("Playwright Updated Sample");
  await page.getByTestId("admin-product-save").click();
  await expect(page.getByTestId("admin-product-21")).toContainText("Playwright Updated Sample");

  await page.getByTestId("admin-product-delete-21").click();
  await expect(page.getByTestId("admin-product-21")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("rampz-store-products")).some((product) => product.id === 21))).toBe(false);
});

test("contact form validates locally without sending a request", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.getByTestId("contact-submit-button").click();
  await expect.poll(() => page.getByTestId("contact-name-input").evaluate((input) => input.validity.valid)).toBe(false);

  await page.getByTestId("contact-name-input").fill("Playwright Demo");
  await page.getByTestId("contact-email-input").fill("contact@rampz.test");
  await page.getByTestId("contact-subject-input").fill("QA message");
  await page.getByTestId("contact-message-input").fill("This is a valid local demo contact message.");
  await page.getByTestId("contact-submit-button").click();
  await expect(page.locator("#contact-feedback")).toContainText("no email was sent or stored");
  expect(requests).toEqual([]);
  await expect(page.getByTestId("contact-message-input")).toHaveValue("");
});

test("unknown paths return the demo not-found page", async ({ page }) => {
  const response = await page.goto("/not-a-store-route");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /wrong turn/i })).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`catalog and checkout fit at ${width}px and keyboard search works`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.keyboard.press("/");
    await expect(page.getByTestId("search-input")).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await startCheckout(page);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });
}
