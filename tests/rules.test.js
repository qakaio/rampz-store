import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateShipping, validateCoupon } from "../server/rules.js";

const noOrders = [];

test("shipping rules preserve regional prices and delivery estimates", () => {
  assert.deepEqual(calculateShipping({ cep: "80000-000", subtotal: 100 }), {
    statusCode: 200,
    data: { cep: "80000000", region: "South", price: 15, days: 3, freeShipping: false },
  });
  assert.deepEqual(calculateShipping({ cep: "01310000", subtotal: 100 }), {
    statusCode: 200,
    data: { cep: "01310000", region: "Southeast", price: 20, days: 5, freeShipping: false },
  });
  assert.deepEqual(calculateShipping({ cep: "40000-000", subtotal: 100 }), {
    statusCode: 200,
    data: { cep: "40000000", region: "Other regions", price: 35, days: 8, freeShipping: false },
  });
});

test("shipping becomes free only above the threshold or with an eligible coupon", () => {
  assert.equal(calculateShipping({ cep: "01310-000", subtotal: 500 }).data.price, 20);
  assert.equal(calculateShipping({ cep: "01310-000", subtotal: 500.01 }).data.price, 0);
  assert.equal(
    calculateShipping({ cep: "01310-000", subtotal: 150.01, coupon: " fretegratis " }).data.freeShipping,
    true,
  );
  assert.equal(calculateShipping({ cep: "01310-000", subtotal: 150, coupon: "FRETEGRATIS" }).statusCode, 422);
  assert.equal(calculateShipping({ cep: "01310-000", subtotal: 200, coupon: "LAB20" }).statusCode, 422);
});

test("shipping validates postal code, subtotal, and coupon input types", () => {
  for (const payload of [
    { cep: "1234", subtotal: 10 },
    { cep: "12345-6789", subtotal: 10 },
    { cep: "01310-000", subtotal: -1 },
    { cep: "01310-000", subtotal: Number.POSITIVE_INFINITY },
    { cep: "01310-000", subtotal: 1_000_000.01 },
    { cep: "01310-000", subtotal: 10, coupon: 123 },
  ]) {
    assert.equal(calculateShipping(payload).statusCode, 400);
  }
});

test("coupon rules are case-insensitive and enforce exact thresholds", () => {
  assert.deepEqual(validateCoupon({ code: " bemvindo10 ", subtotal: 0, email: "New@Rampz.test" }, noOrders), {
    statusCode: 200,
    data: { code: "BEMVINDO10", discount: 0.1, freeShipping: false },
  });
  assert.equal(validateCoupon({ code: "LAB20", subtotal: 300, email: "new@rampz.test" }, noOrders).statusCode, 422);
  assert.equal(validateCoupon({ code: "LAB20", subtotal: 300.01, email: "new@rampz.test" }, noOrders).statusCode, 200);
  assert.equal(validateCoupon({ code: "FRETEGRATIS", subtotal: 150, email: "new@rampz.test" }, noOrders).statusCode, 422);
  assert.equal(validateCoupon({ code: "FRETEGRATIS", subtotal: 150.01, email: "new@rampz.test" }, noOrders).statusCode, 200);
  assert.equal(validateCoupon({ code: "EXPIRADO", subtotal: 200, email: "new@rampz.test" }, noOrders).statusCode, 422);
  assert.equal(validateCoupon({ code: "UNKNOWN", subtotal: 200, email: "new@rampz.test" }, noOrders).statusCode, 422);
});

test("first-purchase coupon considers only paid orders for the same email", () => {
  const otherOrUnpaidOrders = [
    { email: "new@rampz.test", status: "AGUARDANDO_PAGAMENTO" },
    { email: "someone@rampz.test", status: "PAGO" },
  ];
  assert.equal(
    validateCoupon({ code: "BEMVINDO10", subtotal: 100, email: "new@rampz.test" }, otherOrUnpaidOrders).statusCode,
    200,
  );
  const previousPaidOrder = [...otherOrUnpaidOrders, { email: "NEW@RAMPZ.TEST", status: "PAGO" }];
  const result = validateCoupon(
    { code: "BEMVINDO10", subtotal: 100, email: "new@rampz.test" },
    previousPaidOrder,
  );
  assert.equal(result.statusCode, 422);
  assert.match(result.error, /first completed purchase/);
});

test("coupon validation rejects malformed input", () => {
  for (const payload of [
    { code: "", subtotal: 100, email: "new@rampz.test" },
    { code: "X".repeat(41), subtotal: 100, email: "new@rampz.test" },
    { code: "LAB20", subtotal: -1, email: "new@rampz.test" },
    { code: "LAB20", subtotal: 1_000_000.01, email: "new@rampz.test" },
    { code: "LAB20", subtotal: 100, email: "not-an-email" },
  ]) {
    assert.equal(validateCoupon(payload, noOrders).statusCode, 400);
  }
});
