export function calculateShipping({ cep, subtotal, coupon }) {
  if (typeof cep !== "string" || !/^\d{5}-?\d{3}$/.test(cep)) {
    return { statusCode: 400, error: "cep must contain 8 digits, with an optional hyphen after the fifth digit." };
  }
  if (typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0 || subtotal > 1_000_000) {
    return { statusCode: 400, error: "subtotal must be a number between 0 and 1000000." };
  }
  if (coupon !== undefined && typeof coupon !== "string") {
    return { statusCode: 400, error: "coupon must be a string when provided." };
  }
  const normalizedCoupon = (coupon || "").trim().toLocaleUpperCase();
  if (normalizedCoupon && normalizedCoupon !== "FRETEGRATIS") {
    return { statusCode: 422, error: "coupon is not valid for the shipping calculation." };
  }
  if (normalizedCoupon === "FRETEGRATIS" && subtotal <= 150) {
    return { statusCode: 422, error: "FRETEGRATIS requires a subtotal above R$ 150,00." };
  }

  const digits = cep.replace("-", "");
  const firstDigit = digits[0];
  const region = ["8", "9"].includes(firstDigit)
    ? { name: "South", price: 15, days: 3 }
    : ["0", "1", "2", "3"].includes(firstDigit)
      ? { name: "Southeast", price: 20, days: 5 }
      : { name: "Other regions", price: 35, days: 8 };
  const freeShipping = subtotal > 500 || normalizedCoupon === "FRETEGRATIS";
  return {
    statusCode: 200,
    data: {
      cep: digits,
      region: region.name,
      price: freeShipping ? 0 : region.price,
      days: region.days,
      freeShipping,
    },
  };
}

export function validateCoupon({ code, subtotal, email }, orders) {
  if (typeof code !== "string" || !code.trim() || code.trim().length > 40) {
    return { statusCode: 400, error: "code must contain between 1 and 40 characters." };
  }
  if (typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0 || subtotal > 1_000_000) {
    return { statusCode: 400, error: "subtotal must be a number between 0 and 1000000." };
  }
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { statusCode: 400, error: "email must be a valid email address." };
  }

  const normalizedCode = code.trim().toLocaleUpperCase();
  const normalizedEmail = email.trim().toLocaleLowerCase();
  if (normalizedCode === "BEMVINDO10") {
    const previousPurchase = orders.some((order) =>
      order.status === "PAGO"
      && typeof order.email === "string"
      && order.email.toLocaleLowerCase() === normalizedEmail);
    if (previousPurchase) {
      return { statusCode: 422, error: "BEMVINDO10 is for your first completed purchase only." };
    }
    return { statusCode: 200, data: { code: normalizedCode, discount: 0.1, freeShipping: false } };
  }
  if (normalizedCode === "LAB20") {
    if (subtotal <= 300) return { statusCode: 422, error: "LAB20 requires a subtotal above R$ 300,00." };
    return { statusCode: 200, data: { code: normalizedCode, discount: 0.2, freeShipping: false } };
  }
  if (normalizedCode === "FRETEGRATIS") {
    if (subtotal <= 150) return { statusCode: 422, error: "FRETEGRATIS requires a subtotal above R$ 150,00." };
    return { statusCode: 200, data: { code: normalizedCode, discount: 0, freeShipping: true } };
  }
  if (normalizedCode === "EXPIRADO") {
    return { statusCode: 422, error: "This coupon has expired." };
  }
  return { statusCode: 422, error: "That coupon is not valid." };
}
