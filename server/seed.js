import { catalog } from "../catalog.js";

export const seed = Object.freeze({
  categories: catalog.categories,
  products: catalog.products,
  users: [
    { id: "demo-customer", email: "cliente@rampz.test", role: "CUSTOMER", status: "active" },
    { id: "demo-new-customer", email: "novo@rampz.test", role: "CUSTOMER", status: "active" },
    { id: "demo-admin", email: "admin@rampz.test", role: "ADMIN", status: "active" },
    { id: "demo-blocked", email: "bloqueado@rampz.test", role: "CUSTOMER", status: "blocked" },
    { id: "demo-inactive", email: "inativo@rampz.test", role: "CUSTOMER", status: "inactive" },
  ],
  orders: [
    { number: "RMP-2026-000001", status: "PAGO", productId: 3, quantity: 2, email: "cliente@rampz.test" },
    { number: "RMP-2026-000002", status: "AGUARDANDO_PAGAMENTO", productId: 8, quantity: 1, email: "cliente@rampz.test" },
  ],
});

export function createSeedState() {
  return structuredClone(seed);
}
