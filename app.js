import { catalog } from "./catalog.js";

const products = [];
const productSeedStock = new Map();
const categoryOrder = [];
const pageSize = 12;
const cartStorageKey = "rampz-store-cart";
const ordersStorageKey = "rampz-store-orders";
const reviewsStorageKey = "rampz-store-reviews";
const productsStorageKey = "rampz-store-products";
const productSequenceStorageKey = "rampz-store-product-sequence";
const catalogImageUrls = new Set(catalog.products.map((product) => product.imageUrl).filter(Boolean));
const usersStorageKey = "rampz-store-users";
const sessionStorageKey = "rampz-store-session";
const loginAttemptsStorageKey = "rampz-store-login-attempts";
const userCartStoragePrefix = "rampz-store-cart:";
const sessionLifetimeMs = 30 * 60 * 1000;
const lockoutDurationMs = 15 * 60 * 1000;
const passwordIterations = 120000;
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const elements = {
  search: document.querySelector("#header-search"),
  categoryFilters: document.querySelector("#category-filters"),
  minPrice: document.querySelector("#min-price"),
  maxPrice: document.querySelector("#max-price"),
  inStock: document.querySelector("#in-stock"),
  sort: document.querySelector("#sort-products"),
  resultsCount: document.querySelector("#results-count"),
  activeFilters: document.querySelector("#active-filters"),
  grid: document.querySelector("#product-grid"),
  pagination: document.querySelector("#pagination"),
  emptyState: document.querySelector("#empty-state"),
  cartCount: document.querySelector("#cart-count"),
  drawerCount: document.querySelector("#drawer-count"),
  drawer: document.querySelector("#cart-drawer"),
  backdrop: document.querySelector("#drawer-backdrop"),
  cartItems: document.querySelector("#cart-items"),
  cartEmpty: document.querySelector("#cart-empty"),
  cartSummary: document.querySelector("#cart-summary"),
  subtotal: document.querySelector("#cart-subtotal"),
  toast: document.querySelector("#toast"),
  productDialog: document.querySelector("#product-dialog"),
  dialogContent: document.querySelector("#product-dialog-content"),
  checkoutDialog: document.querySelector("#checkout-dialog"),
  checkoutContent: document.querySelector("#checkout-content"),
  accountDialog: document.querySelector("#account-dialog"),
  accountContent: document.querySelector("#account-content"),
  accountLabel: document.querySelector("#account-label"),
};

const state = {
  category: "All",
  page: 1,
  cart: loadCart(),
  toastTimeout: null,
  returnFocus: null,
  checkout: null,
  currentUser: null,
  accountBusy: false,
  accountView: "login",
  accountMessage: null,
  recovery: null,
  reviewMessage: null,
  adminTab: "products",
  editingProductId: null,
  adminImageDataUrl: null,
  adminImageProcessing: false,
  adminImageUploadToken: 0,
  nextProductId: 1,
  lastSessionWrite: 0,
};

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.flatMap((item) => {
      const quantity = Number(item.quantity);
      if (!Number.isSafeInteger(item.id) || item.id < 1 || !Number.isInteger(quantity) || quantity < 1) return [];
      return [{ id: item.id, quantity: Math.min(quantity, 10) }];
    });
  } catch (error) {
    console.error("Could not load the saved cart.", error);
    return [];
  }
}

const demoUsers = [
  { id: "demo-customer", name: "Rampz Customer", email: "cliente@rampz.test", cpf: "529.982.247-25", phone: "(11) 99999-1001", role: "CUSTOMER", status: "active", salt: "bb17da36b787dce88db1710ab4e8b313", passwordHash: "b2f51760414cf07f5b412ee74a048d88bf1f42608a9d481ab5fc68f8799eba58", iterations: passwordIterations },
  { id: "demo-new-customer", name: "New Customer", email: "novo@rampz.test", cpf: "987.654.320-29", phone: "(11) 99999-1002", role: "CUSTOMER", status: "active", salt: "7497be7389e4772a4ce1f3858add93b3", passwordHash: "f7cc1ea0ae3f461bd4a7f3f5a40e695eae51a33f6350b3c3000065e24f20ee3f", iterations: passwordIterations },
  { id: "demo-admin", name: "Rampz Admin", email: "admin@rampz.test", cpf: "390.533.447-05", phone: "(11) 99999-1003", role: "ADMIN", status: "active", salt: "15e64a7912ea4772edad16e8c2850b5e", passwordHash: "082ad77e2d91fa931908e07a66334d49e20fd891ec2a85fe348d6593985876cb", iterations: passwordIterations },
  { id: "demo-blocked", name: "Blocked Customer", email: "bloqueado@rampz.test", cpf: "111.444.777-35", phone: "(11) 99999-1004", role: "CUSTOMER", status: "blocked", salt: "70d303b2ff9a697225e1008b9e495e13", passwordHash: "6e2b26191cb1bff9dcbdb76af5095e67a87bff9f758f22d7b7e61ceea36a6063", iterations: passwordIterations },
  { id: "demo-inactive", name: "Inactive Customer", email: "inativo@rampz.test", cpf: "168.995.350-09", phone: "(11) 99999-1005", role: "CUSTOMER", status: "inactive", salt: "9ef7e7810a9941cdeb7774c2081bfd50", passwordHash: "139ed9e4b44e09f22182bb68a9c0fa0095f0b3eb6a18534cfa3eaff02c07c102", iterations: passwordIterations },
];

function readStoredJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch (error) {
    console.error(`Could not read demo data "${key}".`, error);
    throw new Error("Saved demo data could not be read. Clear this store's local browser data and reload.");
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Could not save demo data "${key}".`, error);
    throw new Error("Demo data could not be saved on this device. Check browser storage and try again.");
  }
}

function bootstrapDemoData() {
  try {
    if (localStorage.getItem(usersStorageKey) === null) {
      writeStoredJson(usersStorageKey, demoUsers);
    }
    if (localStorage.getItem(ordersStorageKey) === null) {
      writeStoredJson(ordersStorageKey, [
        {
          number: "RMP-2026-000001",
          status: "PAGO",
          createdAt: "2026-02-14T14:30:00.000Z",
          items: [{ id: 3, name: "Glass Beaker 250ml", quantity: 2, price: 18.5 }],
          address: { name: "Rampz Customer", email: "cliente@rampz.test", cep: "01310-000", street: "Demo Avenue", number: "42", city: "Sao Paulo", state: "SP" },
          shipping: { price: 20, days: 5, name: "Southeast" },
          coupon: null,
          paymentMethod: "card",
          subtotal: 37,
          discount: 0,
          shippingPrice: 20,
          total: 57,
        },
        {
          number: "RMP-2026-000002",
          status: "AGUARDANDO_PAGAMENTO",
          createdAt: "2026-03-01T10:15:00.000Z",
          items: [{ id: 8, name: "Test Tube Rack (12 Slots)", quantity: 1, price: 24.9 }],
          address: { name: "Rampz Customer", email: "cliente@rampz.test", cep: "01310-000", street: "Demo Avenue", number: "42", city: "Sao Paulo", state: "SP" },
          shipping: { price: 20, days: 5, name: "Southeast" },
          coupon: null,
          paymentMethod: "boleto",
          subtotal: 24.9,
          discount: 0,
          shippingPrice: 20,
          total: 44.9,
        },
      ]);
    }
  } catch (error) {
    state.accountMessage = { text: error.message, error: true };
    console.error("Could not initialize demo account data.", error);
  }
}

function readUsers() {
  const users = readStoredJson(usersStorageKey, []);
  if (!Array.isArray(users)) throw new Error("Saved demo accounts have an invalid format.");
  return users;
}

function readSession() {
  const session = readStoredJson(sessionStorageKey, null);
  if (!session) return null;
  if (typeof session.email !== "string" || !Number.isFinite(session.lastActivity)) {
    writeStoredJson(sessionStorageKey, null);
    throw new Error("The saved demo session is invalid. Sign in again.");
  }
  if (Date.now() - session.lastActivity >= sessionLifetimeMs) {
    writeStoredJson(sessionStorageKey, null);
    return null;
  }
  return session;
}

function loadCurrentUser() {
  try {
    const session = readSession();
    if (!session) return null;
    const user = readUsers().find((entry) => entry.email === session.email);
    if (!user || user.status !== "active") {
      writeStoredJson(sessionStorageKey, null);
      return null;
    }
    return user;
  } catch (error) {
    state.accountMessage = { text: error.message, error: true };
    console.error("Could not restore demo session.", error);
    return null;
  }
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt, iterations = passwordIterations) {
  if (!window.crypto?.subtle) {
    throw new Error("Secure browser cryptography is unavailable. Open the store on localhost in a modern browser.");
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const digest = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: new TextEncoder().encode(salt),
    iterations,
    hash: "SHA-256",
  }, key, 256);
  return toHex(digest);
}

function passwordIsValid(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function cpfIsValid(value) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length) => {
    const sum = cpf.slice(0, length).split("").reduce((total, number, index) =>
      total + Number(number) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function normalizeEmail(email) {
  return email.trim().toLocaleLowerCase();
}

function accountCartKey(email) {
  return `${userCartStoragePrefix}${encodeURIComponent(normalizeEmail(email))}`;
}

function updateAccountButton() {
  const label = state.currentUser?.name?.split(/\s+/)[0] || "Account";
  elements.accountLabel.textContent = label;
  document.querySelector("#open-account").setAttribute(
    "aria-label",
    state.currentUser ? `Open ${state.currentUser.name}'s account` : "Open account",
  );
}

function saveSession(user) {
  writeStoredJson(sessionStorageKey, { email: user.email, lastActivity: Date.now() });
  state.currentUser = user;
  state.lastSessionWrite = Date.now();
  updateAccountButton();
}

function endDemoSession(message) {
  try {
    if (state.currentUser) saveCart();
    writeStoredJson(sessionStorageKey, null);
    state.currentUser = null;
    state.editingProductId = null;
    state.adminImageDataUrl = null;
    state.adminImageProcessing = false;
    state.adminImageUploadToken += 1;
    state.cart = [];
    saveCart();
    renderCart();
    updateAccountButton();
    state.accountMessage = message ? { text: message, error: false } : null;
  } catch (error) {
    console.error("Could not end the demo session.", error);
    state.accountMessage = { text: error.message, error: true };
  }
}

function refreshSessionActivity() {
  if (!state.currentUser || Date.now() - state.lastSessionWrite < 60_000) return;
  try {
    const session = readSession();
    if (!session) {
      endDemoSession("Your demo session expired. Sign in again.");
      if (elements.accountDialog.open) renderAccountDialog("login");
      return;
    }
    writeStoredJson(sessionStorageKey, { ...session, lastActivity: Date.now() });
    state.lastSessionWrite = Date.now();
  } catch (error) {
    console.error("Could not refresh the demo session.", error);
    endDemoSession(error.message);
  }
}

function syncUserCart(user) {
  if (!user) return;
  try {
    const savedCart = readStoredJson(accountCartKey(user.email), []);
    if (!Array.isArray(savedCart)) throw new Error("The saved account bag has an invalid format.");
    const isAlreadySynced = state.cart.length === savedCart.length
      && state.cart.every((item, index) => item.id === savedCart[index]?.id && item.quantity === savedCart[index]?.quantity);
    const merged = new Map(state.cart.map((item) => [item.id, item.quantity]));
    if (!isAlreadySynced) {
      savedCart.forEach((item) => {
        if (Number.isInteger(item.id) && Number.isInteger(item.quantity) && item.quantity > 0) {
          merged.set(item.id, (merged.get(item.id) || 0) + item.quantity);
        }
      });
    }
    const selectedCart = isAlreadySynced
      ? savedCart
      : Array.from(merged, ([id, quantity]) => ({ id, quantity }));
    state.cart = selectedCart.map(({ id, quantity }) => {
      const product = products.find((entry) => entry.id === id);
      return product && product.stock > 0 ? { id, quantity: Math.min(quantity, product.stock, 10) } : null;
    }).filter(Boolean);
    saveCart();
    renderCart();
  } catch (error) {
    state.accountMessage = { text: error.message, error: true };
    console.error("Could not load the signed-in customer's bag.", error);
  }
}

function saveCart() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(state.cart));
    if (state.currentUser) {
      localStorage.setItem(accountCartKey(state.currentUser.email), JSON.stringify(state.cart));
    }
  } catch (error) {
    console.error("Could not save the shopping bag.", error);
    showToast("Your bag could not be saved on this device.");
  }
}

function getVisibleProducts() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  const min = elements.minPrice.value === "" ? null : Number(elements.minPrice.value);
  const max = elements.maxPrice.value === "" ? null : Number(elements.maxPrice.value);
  const filtered = products.filter((product) => {
    const matchesQuery = !query || product.name.toLocaleLowerCase().includes(query) || product.category.toLocaleLowerCase().includes(query);
    const matchesCategory = state.category === "All" || product.category === state.category;
    const matchesMin = min === null || product.price >= min;
    const matchesMax = max === null || product.price <= max;
    const matchesStock = !elements.inStock.checked || product.stock > 0;
    return matchesQuery && matchesCategory && matchesMin && matchesMax && matchesStock;
  });

  if (elements.sort.value === "price-asc") filtered.sort((a, b) => a.price - b.price);
  if (elements.sort.value === "price-desc") filtered.sort((a, b) => b.price - a.price);
  if (elements.sort.value === "name-asc") filtered.sort((a, b) => a.name.localeCompare(b.name, "en"));
  if (elements.sort.value === "newest") filtered.sort((a, b) => b.id - a.id);
  return filtered;
}

function renderCategories() {
  const categories = ["All", ...categoryOrder];
  elements.categoryFilters.innerHTML = categories.map((category) => {
    const count = category === "All" ? products.length : products.filter((product) => product.category === category).length;
    const selected = state.category === category;
    return `<button class="category-filter${selected ? " selected" : ""}" type="button" data-testid="category-filter-${testIdSlug(category)}" data-category="${category}" aria-pressed="${selected}"><span>${category}</span><span class="category-total">${count}</span></button>`;
  }).join("");
}

function renderActiveFilters() {
  const chips = [];
  const search = elements.search.value.trim();
  if (search) chips.push(["search", `Search: ${search}`]);
  if (state.category !== "All") chips.push(["category", state.category]);
  if (elements.minPrice.value !== "") chips.push(["min", `From ${currency.format(Number(elements.minPrice.value))}`]);
  if (elements.maxPrice.value !== "") chips.push(["max", `Up to ${currency.format(Number(elements.maxPrice.value))}`]);
  if (elements.inStock.checked) chips.push(["stock", "In stock"]);
  elements.activeFilters.innerHTML = chips.map(([key, label]) => `<span class="filter-chip">${escapeHtml(label)}<button type="button" data-testid="remove-filter-${key}" data-remove-filter="${key}" aria-label="Remove ${escapeHtml(label)} filter">×</button></span>`).join("");
}

function renderProducts() {
  const visible = getVisibleProducts();
  const pageCount = Math.ceil(visible.length / pageSize);
  state.page = Math.min(Math.max(state.page, 1), pageCount || 1);
  const start = (state.page - 1) * pageSize;
  const pageProducts = visible.slice(start, start + pageSize);

  elements.resultsCount.innerHTML = visible.length
    ? `Showing <strong>${start + 1}–${Math.min(start + pageSize, visible.length)}</strong> of <strong>${visible.length}</strong> products`
    : "No products found";
  elements.grid.hidden = !pageProducts.length;
  elements.emptyState.hidden = pageProducts.length > 0;
  elements.grid.innerHTML = pageProducts.map(productCard).join("");
  renderPagination(pageCount);
  renderActiveFilters();
}

function productCard(product) {
  const tone = categoryTone(product.category);
  const tag = product.stock === 0 ? "Out of stock" : product.stock <= 5 ? "Low stock" : "";
  const imageSource = product.imageDataUrl || product.imageUrl;
  return `<article class="product-card" data-testid="product-card-${product.id}" data-product-id="${product.id}">
    <div class="product-visual ${tone}" role="button" tabindex="0" data-testid="product-detail-${product.id}" data-open-product="${product.id}" aria-label="View details for ${escapeHtml(product.name)}">
      ${tag ? `<span class="visual-tag">${tag}</span>` : ""}
      ${imageSource
    ? `<img class="product-image" src="${escapeHtml(imageSource)}" alt="" />`
    : `<span class="visual-symbol" aria-hidden="true">${escapeHtml(product.symbol)}</span>`}
      <span class="visual-id">NO. ${String(product.id).padStart(2, "0")}</span>
    </div>
    <div class="product-info">
      <p class="product-category">${escapeHtml(product.category)}</p>
      <h3 class="product-title" role="button" tabindex="0" data-testid="product-name-${product.id}" data-open-product="${product.id}">${escapeHtml(product.name)}</h3>
      <div class="product-bottom"><span class="product-price">${currency.format(product.price)}</span>
        ${product.stock > 0
          ? `<button class="add-button" type="button" data-testid="add-to-cart-button-${product.id}" data-add-product="${product.id}" aria-label="Add ${escapeHtml(product.name)} to bag">+</button>`
          : `<span class="stock-label">Unavailable</span>`}
      </div>
    </div>
  </article>`;
}

function renderPagination(pageCount) {
  if (pageCount < 2) {
    elements.pagination.innerHTML = "";
    return;
  }
  const buttons = [];
  buttons.push(`<button class="page-button" type="button" data-testid="pagination-previous" data-page="${state.page - 1}" aria-label="Previous page" ${state.page === 1 ? "disabled" : ""}>←</button>`);
  for (let page = 1; page <= pageCount; page += 1) {
    buttons.push(`<button class="page-button${page === state.page ? " current" : ""}" type="button" data-testid="pagination-page-${page}" data-page="${page}" aria-current="${page === state.page ? "page" : "false"}">${page}</button>`);
  }
  buttons.push(`<button class="page-button" type="button" data-testid="pagination-next" data-page="${state.page + 1}" aria-label="Next page" ${state.page === pageCount ? "disabled" : ""}>→</button>`);
  elements.pagination.innerHTML = buttons.join("");
}

function categoryTone(category) {
  return ({
    "Equipment": "tone-equipment",
    "Reagents & Solutions": "tone-reagents",
    "Safety": "tone-ppe",
    "Tools & Accessories": "tone-utensils",
    "Learning Kits": "tone-kits",
  })[category] || "";
}

function renderCart() {
  const itemCount = state.cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = state.cart.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
  elements.cartCount.textContent = String(itemCount);
  elements.drawerCount.textContent = `(${itemCount})`;
  elements.subtotal.textContent = currency.format(subtotal);
  elements.cartEmpty.hidden = itemCount > 0;
  elements.cartSummary.hidden = itemCount === 0;
  elements.cartItems.hidden = itemCount === 0;
  elements.cartItems.innerHTML = state.cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    if (!product) return "";
    const maxQuantity = Math.min(product.stock, 10);
    return `<div class="cart-line" data-testid="cart-item-${product.id}">
      <div class="cart-thumb ${categoryTone(product.category)}" aria-hidden="true">${escapeHtml(product.symbol)}</div>
      <div><p class="cart-product-name">${escapeHtml(product.name)}</p><p class="cart-product-price">${currency.format(product.price)} each</p>
        <div class="quantity-control" aria-label="Quantity for ${escapeHtml(product.name)}">
          <button type="button" data-testid="cart-item-decrease-${product.id}" data-quantity="${product.id}" data-delta="-1" aria-label="Decrease quantity" ${item.quantity <= 1 ? "disabled" : ""}>−</button>
          <span>${item.quantity}</span>
          <button type="button" data-testid="cart-item-increase-${product.id}" data-quantity="${product.id}" data-delta="1" aria-label="Increase quantity" ${item.quantity >= maxQuantity ? "disabled" : ""}>+</button>
        </div>
      </div>
      <div><span class="line-total">${currency.format(product.price * item.quantity)}</span><button class="remove-item" type="button" data-testid="cart-item-remove-${product.id}" data-remove-item="${product.id}">Remove</button></div>
    </div>`;
  }).join("");
}

function checkoutSubtotal() {
  return state.cart.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

function getCheckoutTotals() {
  const subtotal = checkoutSubtotal();
  const couponDiscount = state.checkout.coupon?.discount
    ? subtotal * state.checkout.coupon.discount
    : 0;
  const shipping = state.checkout.shipping?.price ?? 0;
  const pixDiscount = state.checkout.paymentMethod === "pix"
    ? (subtotal - couponDiscount) * 0.05
    : 0;
  return {
    subtotal,
    couponDiscount,
    shipping,
    pixDiscount,
    total: Math.max(0, subtotal - couponDiscount - pixDiscount + shipping),
  };
}

function checkoutSummary() {
  const totals = getCheckoutTotals();
  const items = state.cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    return product
      ? `<div class="checkout-item"><span>${item.quantity} × ${escapeHtml(product.name)}</span><strong>${currency.format(product.price * item.quantity)}</strong></div>`
      : "";
  }).join("");
  return `<aside class="checkout-summary" data-testid="checkout-order-summary">
    <h3>Order summary</h3>
    <div class="checkout-items">${items}</div>
    <div class="checkout-total-row"><span>Subtotal</span><span data-testid="checkout-subtotal">${currency.format(totals.subtotal)}</span></div>
    ${totals.couponDiscount ? `<div class="checkout-total-row discount-row"><span>Discount${state.checkout.coupon ? ` (${escapeHtml(state.checkout.coupon.code)})` : ""}</span><span>−${currency.format(totals.couponDiscount)}</span></div>` : ""}
    ${totals.pixDiscount ? `<div class="checkout-total-row discount-row"><span>Pix discount (5%)</span><span>−${currency.format(totals.pixDiscount)}</span></div>` : ""}
    ${state.checkout.shipping
      ? `<div class="checkout-total-row"><span>Shipping</span><span data-testid="checkout-shipping-cost">${totals.shipping ? currency.format(totals.shipping) : "Free"}</span></div>`
      : state.checkout.shippingLoading ? `<div class="checkout-total-row"><span>Shipping</span><span>Calculating…</span></div>` : ""}
    <div class="checkout-grand-total"><span>Total</span><strong data-testid="checkout-total">${currency.format(totals.total)}</strong></div>
    <p class="checkout-simulation-note">Demo checkout only. No real payment or order fulfillment.</p>
  </aside>`;
}

function checkoutProgress() {
  const steps = ["Address", "Shipping", "Payment", "Review"];
  return `<ol class="checkout-progress" aria-label="Checkout progress">${steps.map((label, index) => {
    const number = index + 1;
    const current = state.checkout.step === number;
    const complete = state.checkout.step > number;
    return `<li class="${current ? "current" : ""} ${complete ? "complete" : ""}" ${current ? 'aria-current="step"' : ""}>
      <span>${complete ? "✓" : number}</span><span>${label}</span>
    </li>`;
  }).join("")}</ol>`;
}

function checkoutAddressStep() {
  const address = state.checkout.address;
  return `<form class="checkout-form" data-testid="checkout-address-form" data-checkout-step="1">
    <h3>Where should we send it?</h3>
    <p class="checkout-intro">Use any demo details — this store does not ship real orders.</p>
    <div class="checkout-fields">
      <label class="checkout-field field-wide">Full name<input name="name" data-testid="checkout-name-input" autocomplete="name" required maxlength="100" value="${escapeHtml(address.name)}" placeholder="Alex Example" /></label>
      <label class="checkout-field field-wide">Email<input name="email" data-testid="checkout-email-input" type="email" autocomplete="email" required maxlength="150" value="${escapeHtml(address.email)}" placeholder="alex@example.test" /></label>
      <label class="checkout-field">ZIP code<input name="cep" data-testid="checkout-cep-input" inputmode="numeric" autocomplete="postal-code" required pattern="\\d{5}-?\\d{3}" maxlength="9" value="${escapeHtml(address.cep)}" placeholder="00000-000" aria-describedby="cep-help" /></label>
      <span class="checkout-field-hint" id="cep-help">8 digits; used only for simulated shipping.</span>
      <label class="checkout-field field-wide">Street address<input name="street" data-testid="checkout-street-input" autocomplete="street-address" required maxlength="150" value="${escapeHtml(address.street)}" placeholder="123 Sample Street" /></label>
      <label class="checkout-field">Number<input name="number" data-testid="checkout-number-input" required maxlength="20" value="${escapeHtml(address.number)}" placeholder="123" /></label>
      <label class="checkout-field">City<input name="city" data-testid="checkout-city-input" autocomplete="address-level2" required maxlength="80" value="${escapeHtml(address.city)}" placeholder="Your city" /></label>
      <label class="checkout-field">State<input name="state" data-testid="checkout-state-input" autocomplete="address-level1" required maxlength="40" value="${escapeHtml(address.state)}" placeholder="State" /></label>
    </div>
    ${checkoutError()}
    <div class="checkout-actions"><button class="checkout-back-button" type="button" data-testid="checkout-keep-shopping" data-checkout-close>Keep shopping</button><button class="primary-button" type="submit" data-testid="checkout-address-continue" ${state.checkout.shippingLoading ? "disabled" : ""}>${state.checkout.shippingLoading ? "Calculating shipping…" : "Continue to shipping <span aria-hidden=\"true\">↗</span>"}</button></div>
  </form>`;
}

function checkoutShippingStep() {
  const shipping = state.checkout.shipping;
  return `<form class="checkout-form" data-testid="checkout-shipping-form" data-checkout-step="2">
    <h3>Shipping, sorted.</h3>
    <p class="checkout-intro">A demo estimate for ${escapeHtml(state.checkout.address.cep)}${shipping ? ` (${shipping.region})` : ""}.</p>
    ${shipping ? `<div class="shipping-option">
      <span class="shipping-option-icon" aria-hidden="true">✳</span>
      <span><strong>Standard delivery</strong><small>${shipping.days} business days · ${shipping.region}</small></span>
      <strong>${shipping.price ? currency.format(shipping.price) : "Free"}</strong>
    </div>` : `<p role="status">${state.checkout.shippingLoading ? "Calculating shipping…" : "Shipping quote unavailable. Return to the address step to try again."}</p>`}
    <div class="coupon-box"><label for="checkout-coupon">Have a little code?</label>
      <div class="coupon-input-row"><input id="checkout-coupon" data-testid="checkout-coupon-input" name="coupon" autocomplete="off" value="${escapeHtml(state.checkout.coupon?.code || state.checkout.couponInput)}" placeholder="Enter a coupon" ${state.checkout.couponValidating ? "disabled" : ""} /><button type="button" data-testid="checkout-apply-coupon" data-apply-coupon ${state.checkout.couponValidating ? "disabled" : ""}>${state.checkout.couponValidating ? "Checking…" : "Apply"}</button></div>
      ${state.checkout.coupon ? `<p class="coupon-success" role="status">${escapeHtml(state.checkout.coupon.code)} applied.</p>` : ""}
      ${state.checkout.couponError ? `<p class="checkout-error" role="alert">${escapeHtml(state.checkout.couponError)}</p>` : ""}
    </div>
    ${checkoutError()}
    <div class="checkout-actions"><button class="checkout-back-button" type="button" data-testid="checkout-back-to-address" data-checkout-back ${state.checkout.shippingLoading ? "disabled" : ""}>← Address</button><button class="primary-button" type="submit" data-testid="checkout-shipping-continue" ${!shipping || state.checkout.shippingLoading ? "disabled" : ""}>${state.checkout.shippingLoading ? "Calculating shipping…" : "Continue to payment <span aria-hidden=\"true\">↗</span>"}</button></div>
  </form>`;
}

function checkoutPaymentStep() {
  const method = state.checkout.paymentMethod;
  const cardFields = method === "card" ? `<div class="checkout-fields card-fields">
    <label class="checkout-field field-wide">Name on card<input name="cardName" data-testid="checkout-card-name-input" autocomplete="cc-name" required maxlength="100" value="${escapeHtml(state.checkout.cardName)}" placeholder="Demo cardholder" /></label>
    <label class="checkout-field field-wide">Test card number<input name="cardNumber" data-testid="checkout-card-number-input" inputmode="numeric" autocomplete="off" required pattern="[0-9 ]{19}" maxlength="19" value="${escapeHtml(state.checkout.cardNumber)}" placeholder="4111 1111 1111 1111" aria-describedby="test-card-help" /></label>
    <span class="checkout-field-hint field-wide" id="test-card-help">Use only demo cards: 4111 1111 1111 1111 (approved), 4000 0000 0000 0002 (declined), or 4000 0000 0000 0119 (simulated timeout).</span>
    <label class="checkout-field">Expiry<input name="cardExpiry" data-testid="checkout-card-expiry-input" inputmode="numeric" autocomplete="off" required pattern="(0[1-9]|1[0-2])\\/\\d{2}" maxlength="5" value="${escapeHtml(state.checkout.cardExpiry)}" placeholder="MM/YY" /></label>
    <label class="checkout-field">Security code<input name="cardCvc" data-testid="checkout-card-cvc-input" inputmode="numeric" autocomplete="off" required pattern="\\d{3,4}" maxlength="4" value="${escapeHtml(state.checkout.cardCvc)}" placeholder="123" /></label>
    <label class="checkout-field field-wide">Installments<select name="installments" data-testid="checkout-installments-select">${Array.from({ length: Math.min(6, Math.floor(getCheckoutTotals().total / 50)) }, (_, index) => {
      const count = index + 1;
      return `<option value="${count}" ${Number(state.checkout.installments) === count ? "selected" : ""}>${count}× ${currency.format(getCheckoutTotals().total / count)} interest-free</option>`;
    }).join("")}</select></label>
  </div>` : `<div class="payment-explainer">${method === "pix"
      ? "<strong>Pix · 5% off</strong><span>A fictional QR code will be generated. Choose to simulate an approved payment on the next step.</span>"
      : "<strong>Boleto · simulated</strong><span>A fictional barcode will be generated. The order remains awaiting payment; stock is not reserved or deducted.</span>"}</div>`;
  return `<form class="checkout-form" data-testid="checkout-payment-form" data-checkout-step="3">
    <h3>How would you like to pay?</h3>
    <p class="checkout-intro">All payment methods are simulations using demonstration data only.</p>
    <div class="payment-methods">
      <label class="payment-method ${method === "card" ? "selected" : ""}"><input type="radio" data-testid="payment-method-card" name="paymentMethod" value="card" ${method === "card" ? "checked" : ""} /><span class="payment-radio"></span><span><strong>Credit card</strong><small>Up to 6×, minimum R$ 50 per installment</small></span><span aria-hidden="true">▤</span></label>
      <label class="payment-method ${method === "pix" ? "selected" : ""}"><input type="radio" data-testid="payment-method-pix" name="paymentMethod" value="pix" ${method === "pix" ? "checked" : ""} /><span class="payment-radio"></span><span><strong>Pix</strong><small>5% off · fictional QR code</small></span><span aria-hidden="true">⌗</span></label>
      <label class="payment-method ${method === "boleto" ? "selected" : ""}"><input type="radio" data-testid="payment-method-boleto" name="paymentMethod" value="boleto" ${method === "boleto" ? "checked" : ""} /><span class="payment-radio"></span><span><strong>Boleto</strong><small>Fictional barcode · payment pending</small></span><span aria-hidden="true">▥</span></label>
    </div>
    ${cardFields}
    ${checkoutError()}
    <div class="checkout-actions"><button class="checkout-back-button" type="button" data-testid="checkout-back-to-shipping" data-checkout-back>← Shipping</button><button class="primary-button" type="submit" data-testid="checkout-payment-continue">Review your order <span aria-hidden="true">↗</span></button></div>
  </form>`;
}

function checkoutReviewStep() {
  const address = state.checkout.address;
  const methodNames = { card: "Credit card", pix: "Pix", boleto: "Boleto" };
  const methodDetail = state.checkout.paymentMethod === "card"
    ? `•••• ${state.checkout.cardNumber.replace(/\D/g, "").slice(-4)} · ${state.checkout.installments}×`
    : state.checkout.paymentMethod === "pix" ? "5% demo discount" : "Payment pending";
  const actionText = state.checkout.paymentMethod === "pix"
    ? "Simulate approved Pix payment"
    : state.checkout.paymentMethod === "boleto" ? "Create demo boleto order" : "Place simulated order";
  return `<form class="checkout-form" data-testid="checkout-review-form" data-checkout-step="4">
    <h3>One last look.</h3>
    <p class="checkout-intro">Review the details before placing your simulated order.</p>
    <div class="review-card"><div><span>Delivering to</span><button type="button" data-testid="edit-checkout-address" data-edit-checkout="1">Edit</button></div>
      <p><strong>${escapeHtml(address.name)}</strong><br />${escapeHtml(address.street)}, ${escapeHtml(address.number)}<br />${escapeHtml(address.city)}, ${escapeHtml(address.state)} · ${escapeHtml(address.cep)}</p>
      <p>${escapeHtml(address.email)}</p>
    </div>
    <div class="review-card"><div><span>Shipping</span><button type="button" data-testid="edit-checkout-shipping" data-edit-checkout="2">Edit</button></div>
      <p>Standard delivery · ${state.checkout.shipping.days} business days · ${state.checkout.shipping.price ? currency.format(state.checkout.shipping.price) : "Free"}</p>
    </div>
    <div class="review-card"><div><span>${methodNames[state.checkout.paymentMethod]}</span><button type="button" data-testid="edit-checkout-payment" data-edit-checkout="3">Edit</button></div>
      <p>${methodDetail}</p>
    </div>
    ${checkoutError()}
    <div class="checkout-actions"><button class="checkout-back-button" type="button" data-testid="checkout-back-to-payment" data-checkout-back ${state.checkout.orderSubmitting ? "disabled" : ""}>← Payment</button><button class="primary-button" type="submit" data-testid="checkout-place-order" ${state.checkout.orderSubmitting ? "disabled" : ""}>${state.checkout.orderSubmitting ? "Placing your demo order…" : `${actionText} <span aria-hidden="true">↗</span>`}</button></div>
  </form>`;
}

function checkoutError() {
  return state.checkout.error ? `<p class="checkout-error" role="alert">${escapeHtml(state.checkout.error)}</p>` : "";
}

function renderCheckout() {
  const stepContent = {
    1: checkoutAddressStep,
    2: checkoutShippingStep,
    3: checkoutPaymentStep,
    4: checkoutReviewStep,
  }[state.checkout.step]();
  elements.checkoutContent.innerHTML = `<div class="checkout-header">
    <div><p class="eyebrow">A FEW LITTLE DETAILS</p><h2 id="checkout-title">Checkout</h2></div>
    <button class="icon-button" type="button" data-testid="close-checkout-button" data-checkout-close aria-label="Close checkout">×</button>
  </div>
  ${checkoutProgress()}
  <div class="checkout-layout">${stepContent}${checkoutSummary()}</div>`;
}

function openCheckout() {
  if (!state.cart.length) return;
  state.returnFocus = document.querySelector("#open-cart");
  state.currentUser = loadCurrentUser();
  updateAccountButton();
  state.checkout = {
    step: 1,
    address: {
      name: state.currentUser?.name || "",
      email: state.currentUser?.email || "",
      cep: "",
      street: "",
      number: "",
      city: "",
      state: "",
    },
    shipping: null,
    shippingLoading: false,
    coupon: null,
    couponInput: "",
    couponError: "",
    couponValidating: false,
    paymentMethod: "card",
    cardName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    installments: 1,
    orderRequestId: crypto.randomUUID(),
    orderSubmitting: false,
    error: "",
  };
  closeCart();
  renderCheckout();
  elements.checkoutDialog.showModal();
}

async function refreshCheckoutShipping(checkout) {
  checkout.shipping = null;
  checkout.shippingLoading = true;
  checkout.error = "";
  renderCheckout();

  try {
    const response = await fetch("/api/v1/shipping/calculate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cep: checkout.address.cep,
        subtotal: checkoutSubtotal(),
        ...(checkout.coupon?.freeShipping ? { coupon: checkout.coupon.code } : {}),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not calculate shipping.");
    if (state.checkout !== checkout) return false;
    checkout.shipping = result;
    return true;
  } catch (error) {
    if (state.checkout !== checkout) return false;
    checkout.error = `Shipping could not be calculated: ${error.message}`;
    return false;
  } finally {
    if (state.checkout === checkout) {
      checkout.shippingLoading = false;
      renderCheckout();
    }
  }
}

function closeCheckout() {
  if (elements.checkoutDialog.open) elements.checkoutDialog.close();
}

async function applyCheckoutCoupon() {
  const input = elements.checkoutContent.querySelector("#checkout-coupon");
  const code = input.value.trim().toUpperCase();
  state.checkout.couponInput = input.value.trim();
  state.checkout.couponError = "";
  state.checkout.coupon = null;
  if (!code) {
    state.checkout.couponError = "Enter a coupon code first.";
    renderCheckout();
    return;
  }
  const checkout = state.checkout;
  checkout.couponValidating = true;
  renderCheckout();

  try {
    const response = await fetch("/api/v1/coupons/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        subtotal: checkoutSubtotal(),
        email: checkout.address.email,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not validate the coupon.");
    if (state.checkout !== checkout) return;
    checkout.coupon = result.data;
  } catch (error) {
    if (state.checkout !== checkout) return;
    checkout.couponError = error.message;
  } finally {
    if (state.checkout === checkout) {
      checkout.couponValidating = false;
      await refreshCheckoutShipping(checkout);
    }
  }
}

function loadOrders() {
  try {
    const orders = JSON.parse(localStorage.getItem(ordersStorageKey) || "[]");
    if (!Array.isArray(orders)) throw new TypeError("Saved orders are not a list.");
    return orders;
  } catch (error) {
    console.error("Could not read saved demo orders.", error);
    throw new Error("Your demo order history could not be read. Please clear the local demo data and try again.");
  }
}

function hydrateDemoProducts() {
  const savedProducts = readStoredJson(productsStorageKey, null);
  const savedSequence = readStoredJson(productSequenceStorageKey, null);
  if (savedSequence !== null && (!Number.isSafeInteger(savedSequence) || savedSequence < 1)) {
    throw new Error("Saved demo product sequence has an invalid format.");
  }
  if (savedProducts !== null && !Array.isArray(savedProducts)) {
    throw new Error("Saved demo products have an invalid format.");
  }
  const maxSavedId = Array.isArray(savedProducts)
    ? Math.max(0, ...savedProducts.map((product) => Number(product?.id) || 0))
    : Math.max(0, ...products.map((product) => product.id));
  state.nextProductId = Math.max(maxSavedId + 1, savedSequence || 0);
  if (savedProducts === null) {
    productSeedStock.clear();
    products.forEach((product) => productSeedStock.set(product.id, product.stock));
    return;
  }
  const seenIds = new Set();
  savedProducts.forEach((product) => {
    if (!product
      || !Number.isSafeInteger(product.id)
      || product.id < 1
      || seenIds.has(product.id)
      || typeof product.name !== "string"
      || !product.name.trim()
      || product.name.length > 100
      || typeof product.description !== "string"
      || product.description.length > 1000
      || !categoryOrder.includes(product.category)
      || !Number.isFinite(product.price)
      || product.price < 0
      || !Number.isSafeInteger(product.stock)
      || product.stock < 0
      || typeof product.symbol !== "string"
      || !product.symbol.trim()
      || product.symbol.length > 4
      || !isValidSpecifications(product.specifications)
      || (product.imageUrl !== undefined
        && product.imageUrl !== null
        && !catalogImageUrls.has(product.imageUrl))
      || (product.imageDataUrl !== undefined
        && product.imageDataUrl !== null
        && (typeof product.imageDataUrl !== "string"
          || product.imageDataUrl.length > 420_000
          || !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(product.imageDataUrl)))) {
      throw new Error("Saved demo products contain invalid data.");
    }
    seenIds.add(product.id);
  });
  products.splice(0, products.length, ...savedProducts.map((product) => ({
    ...products.find((catalogProduct) => catalogProduct.id === product.id),
    ...product,
  })));
  productSeedStock.clear();
  products.forEach((product) => productSeedStock.set(product.id, product.stock));
}

function isValidSpecifications(specifications) {
  if (specifications === undefined) return true;
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) return false;
  const entries = Object.entries(specifications);
  return entries.length <= 12 && entries.every(([label, value]) =>
    label.trim().length > 0 && label.length <= 60 && typeof value === "string" && value.length <= 160);
}

function persistDemoProducts() {
  const orders = loadOrders();
  const appliedInventory = new Map();
  orders.filter((order) => order.status === "PAGO" && order.inventoryApplied === true)
    .forEach((order) => (order.items || []).forEach((item) => {
      appliedInventory.set(item.id, (appliedInventory.get(item.id) || 0) + item.quantity);
    }));
  const savedProducts = products.map((product) => ({
    ...product,
    stock: product.stock + (appliedInventory.get(product.id) || 0),
  }));
  writeStoredJson(productsStorageKey, savedProducts);
  savedProducts.forEach((product) => productSeedStock.set(product.id, product.stock));
}

function restoreInventoryFromOrders() {
  products.forEach((product) => {
    product.stock = productSeedStock.get(product.id);
  });
  loadOrders().forEach((order) => {
    if (order.status !== "PAGO" || order.inventoryApplied !== true) return;
    (order.items || []).forEach((item) => {
      const product = products.find((entry) => entry.id === item.id);
      if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || product.stock < item.quantity) {
        throw new Error(`The saved inventory record for ${order.number} is invalid.`);
      }
      product.stock -= item.quantity;
    });
  });
}

function accountHeader() {
  return `<div class="account-header">
    <div><p class="eyebrow">YOUR RAMPZ SPACE</p><h2 id="account-title">${state.currentUser ? "Your account" : "Welcome in."}</h2></div>
    <button class="icon-button" type="button" data-testid="close-account-button" data-account-close aria-label="Close account">×</button>
  </div>`;
}

function demoLoginDetails() {
  const accounts = [
    ["cliente@rampz.test", "Customer · sample order history"],
    ["novo@rampz.test", "New customer · no order history"],
    ["admin@rampz.test", "Administrator"],
    ["bloqueado@rampz.test", "Blocked test profile"],
    ["inativo@rampz.test", "Inactive test profile"],
  ];
  return `<details class="demo-logins"><summary>QA demo accounts</summary>
    <div class="demo-login-list">${accounts.map(([email, description]) =>
      `<button class="demo-login" type="button" data-testid="demo-login-${email.split("@")[0]}" data-demo-login="${email}">
        <span><strong>${escapeHtml(email)}</strong><br />${escapeHtml(description)}</span><span>Use demo login ↗</span>
      </button>`).join("")}
    </div>
    <p class="security-demo-note">All credentials are fictional and for local QA demos only. Browser storage is not a secure authentication system.</p>
  </details>`;
}

function accountTabs(activeView) {
  return `<div class="account-tabs" role="group" aria-label="Account options">
    <button class="account-tab${activeView === "login" ? " active" : ""}" type="button" aria-pressed="${activeView === "login"}" data-account-view="login">Sign in</button>
    <button class="account-tab${activeView === "register" ? " active" : ""}" type="button" aria-pressed="${activeView === "register"}" data-account-view="register">Create account</button>
  </div>`;
}

function accountLoginForm() {
  return `<form class="account-form" data-testid="login-form" data-account-form="login">
    <div class="account-fields">
      <label class="account-field full">Email<input name="email" data-testid="login-email-input" type="email" required maxlength="150" autocomplete="email" placeholder="you@example.test" /></label>
      <label class="account-field full">Password<input name="password" data-testid="login-password-input" type="password" required maxlength="128" autocomplete="current-password" placeholder="Your password" /></label>
    </div>
    ${accountMessageMarkup()}
    <button class="primary-button" type="submit" data-testid="login-submit-button">Sign in <span aria-hidden="true">↗</span></button>
    <div class="account-form-links"><button class="account-link-button" type="button" data-account-view="recover">Forgot your password?</button><span></span></div>
  </form>`;
}

function accountRegisterForm() {
  return `<form class="account-form" data-testid="register-form" data-account-form="register">
    <p class="account-intro">Create a local demo account. No information is sent to a server.</p>
    <div class="account-fields">
      <label class="account-field full">Full name<input name="name" data-testid="register-name-input" required maxlength="100" autocomplete="name" placeholder="Alex Example" /></label>
      <label class="account-field full">Email<input name="email" data-testid="register-email-input" type="email" required maxlength="150" autocomplete="email" placeholder="alex@example.test" /></label>
      <label class="account-field">CPF<input name="cpf" data-testid="register-cpf-input" required inputmode="numeric" maxlength="14" pattern="[0-9.\\-]{11,14}" placeholder="000.000.000-00" /></label>
      <label class="account-field">Phone<input name="phone" data-testid="register-phone-input" required inputmode="tel" maxlength="20" pattern=".{8,20}" autocomplete="tel" placeholder="(11) 99999-0000" /></label>
      <label class="account-field">Password<input name="password" data-testid="register-password-input" type="password" required minlength="8" maxlength="128" autocomplete="new-password" aria-describedby="password-requirements" placeholder="Create a password" /></label>
      <label class="account-field">Confirm password<input name="confirmPassword" data-testid="register-confirm-password-input" type="password" required minlength="8" maxlength="128" autocomplete="new-password" placeholder="Repeat your password" /></label>
    </div>
    <p class="checkout-field-hint" id="password-requirements">At least 8 characters, one uppercase letter, one number, and one special character.</p>
    ${accountMessageMarkup()}
    <button class="primary-button" type="submit" data-testid="register-submit-button">Create account <span aria-hidden="true">↗</span></button>
  </form>`;
}

function accountRecoveryForm() {
  return `<form class="account-form" data-testid="recovery-form" data-account-form="recover">
    <p class="account-intro">Enter the email address and the demo reset code shown after you request it. No email is sent.</p>
    <div class="account-fields">
      <label class="account-field full">Email<input name="email" data-testid="recovery-email-input" type="email" required maxlength="150" autocomplete="email" placeholder="you@example.test" /></label>
      <label class="account-field full">Demo reset code<input name="token" data-testid="recovery-token-input" inputmode="numeric" pattern="\\d{6}" maxlength="6" required placeholder="6-digit code" /></label>
      <label class="account-field full">New password<input name="password" data-testid="recovery-password-input" type="password" required minlength="8" maxlength="128" autocomplete="new-password" placeholder="Create a new password" /></label>
    </div>
    <p class="checkout-field-hint">Use at least 8 characters, one uppercase letter, one number, and one special character.</p>
    ${state.recovery?.token ? `<p class="account-message" role="status">Demo reset code (not emailed): <code data-testid="recovery-demo-token">${state.recovery.token}</code></p>` : ""}
    ${accountMessageMarkup()}
    <div class="account-form-links"><button class="account-link-button" type="button" data-request-recovery>Generate demo reset code</button><button class="account-link-button" type="button" data-account-view="login">Back to sign in</button></div>
    <button class="primary-button" type="submit" data-testid="recovery-submit-button">Update password <span aria-hidden="true">↗</span></button>
  </form>`;
}

function accountMessageMarkup() {
  if (!state.accountMessage) return "";
  return `<p class="account-message" role="${state.accountMessage.error ? "alert" : "status"}">${escapeHtml(state.accountMessage.text)}</p>`;
}

function renderAccountOrders(user) {
  const orders = loadOrders()
    .filter((order) => order.address?.email?.toLocaleLowerCase() === user.email.toLocaleLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (!orders.length) {
    return `<div class="account-empty-orders">No orders yet. Your first experiment is waiting in the <a href="#catalog" data-account-close>catalog</a>.</div>`;
  }
  return `<div class="account-orders">${orders.map((order) => {
    const status = {
      AGUARDANDO_PAGAMENTO: "Awaiting payment",
      PAGO: "Paid",
      EM_SEPARACAO: "Preparing",
      ENVIADO: "Shipped",
      ENTREGUE: "Delivered",
      CANCELADO: "Cancelled",
    }[order.status] || order.status;
    const statusClass = order.status === "AGUARDANDO_PAGAMENTO" ? "pending" : order.status === "CANCELADO" ? "cancelled" : "";
    const items = (order.items || []).map((item) => `${item.quantity} × ${escapeHtml(item.name)}`).join(", ");
    const date = new Date(order.createdAt);
    const formattedDate = Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
    return `<article class="account-order" data-testid="account-order-${testIdSlug(order.number)}">
      <div class="account-order-head"><span class="account-order-number">${escapeHtml(order.number)}</span><span class="account-order-status ${statusClass}">${escapeHtml(status)}</span></div>
      <p class="account-order-items">${items}</p>
      <div class="account-order-meta"><span>${formattedDate}</span><strong>${currency.format(Number(order.total) || 0)}</strong></div>
      ${order.status === "AGUARDANDO_PAGAMENTO" ? `<button class="account-order-cancel" type="button" data-testid="cancel-order-${testIdSlug(order.number)}" data-cancel-order="${escapeHtml(order.number)}">Cancel pending order</button>` : ""}
    </article>`;
  }).join("")}</div>`;
}

function adminTabs() {
  return `<div class="admin-tabs" role="tablist" aria-label="Admin sections">
    ${[["products", "Products"], ["orders", "Orders"], ["users", "Users"]].map(([tab, label]) =>
      `<button class="admin-tab${state.adminTab === tab ? " active" : ""}" type="button" role="tab" aria-selected="${state.adminTab === tab}" data-admin-tab="${tab}" data-testid="admin-tab-${tab}">${label}</button>`).join("")}
  </div>`;
}

function adminProductPanel() {
  const product = products.find((entry) => entry.id === state.editingProductId);
  const imagePreview = state.adminImageDataUrl
    ? `<img class="admin-image-preview" src="${escapeHtml(state.adminImageDataUrl)}" alt="Selected product image preview" data-testid="admin-image-preview" />`
    : `<div class="admin-image-placeholder" data-testid="admin-image-placeholder">Generated illustration will be used until an image is selected.</div>`;
  return `<section class="admin-panel" role="tabpanel" aria-label="Product management">
    <div class="account-section-heading"><h3>Product catalog</h3><span class="checkout-field-hint">${products.length} items</span></div>
    <form class="admin-product-form" data-admin-product-form data-testid="admin-product-form">
      <h4>${product ? `Editing ${escapeHtml(product.name)}` : "Add a product"}</h4>
      <label class="checkout-field">Name<input name="name" data-testid="admin-product-name" required maxlength="100" value="${escapeHtml(product?.name || "")}" /></label>
      <label class="checkout-field">Description<textarea name="description" data-testid="admin-product-description" required maxlength="1000" rows="3">${escapeHtml(product?.description || "")}</textarea></label>
      <div class="admin-product-row">
        <label class="checkout-field">Category<select name="category" data-testid="admin-product-category" required>${categoryOrder.map((category) => `<option value="${escapeHtml(category)}" ${product?.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label>
        <label class="checkout-field">Price (R$)<input name="price" data-testid="admin-product-price" type="number" min="0.01" step="0.01" required value="${product ? product.price : ""}" /></label>
        <label class="checkout-field">Available stock<input name="stock" data-testid="admin-product-stock" type="number" min="0" max="1000000" step="1" required value="${product ? product.stock : ""}" /></label>
        <label class="checkout-field">Visual mark<input name="symbol" data-testid="admin-product-symbol" required maxlength="4" value="${escapeHtml(product?.symbol || "")}" /></label>
      </div>
      <label class="checkout-field">Product image<input name="image" data-testid="admin-product-image" type="file" accept="image/jpeg,image/png,image/webp" ${state.adminImageProcessing ? "disabled" : ""} /><span class="checkout-field-hint">Optional JPEG, PNG, or WebP image, up to 8 MB before optimization.</span></label>
      <div class="admin-image-preview-frame">${imagePreview}</div>
      ${state.adminImageDataUrl ? `<button class="account-link-button admin-remove-image" type="button" data-admin-remove-image data-testid="admin-product-remove-image">Remove selected image</button>` : ""}
      ${state.adminImageProcessing ? `<p class="checkout-field-hint" role="status">Optimizing image for local storage…</p>` : ""}
      <div class="admin-form-actions"><button class="primary-button" type="submit" data-testid="admin-product-save" ${state.adminImageProcessing ? "disabled" : ""}>${product ? "Save changes" : "Add product"} <span aria-hidden="true">↗</span></button>
        ${product ? `<button class="checkout-back-button" type="button" data-admin-cancel-edit>Cancel</button>` : ""}
      </div>
      <p class="checkout-field-hint">The selected image is stored only in this browser's local demo data.</p>
    </form>
    <div class="admin-product-list" data-testid="admin-product-list">${products.map((entry) => `<article class="admin-product-item" data-testid="admin-product-${entry.id}">
      <div><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(entry.category)} · ${currency.format(entry.price)} · ${entry.stock} available</span></div>
      <div class="admin-item-actions"><button class="account-link-button" type="button" data-admin-edit="${entry.id}" data-testid="admin-product-edit-${entry.id}">Edit</button><button class="account-link-button admin-delete" type="button" data-admin-delete="${entry.id}" data-testid="admin-product-delete-${entry.id}">Delete</button></div>
    </article>`).join("")}</div>
  </section>`;
}

function allowedOrderTransitions(status) {
  return ({
    AGUARDANDO_PAGAMENTO: ["PAGO", "CANCELADO"],
    PAGO: ["EM_SEPARACAO"],
    EM_SEPARACAO: ["ENVIADO"],
    ENVIADO: ["ENTREGUE"],
  })[status] || [];
}

function adminOrdersPanel() {
  const statusLabels = {
    AGUARDANDO_PAGAMENTO: "Awaiting payment",
    PAGO: "Paid",
    EM_SEPARACAO: "Preparing",
    ENVIADO: "Shipped",
    ENTREGUE: "Delivered",
    CANCELADO: "Cancelled",
  };
  const orders = loadOrders().slice().sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  return `<section class="admin-panel" role="tabpanel" aria-label="Order management">
    <div class="account-section-heading"><h3>Order management</h3><span class="checkout-field-hint">${orders.length} orders</span></div>
    ${orders.length ? `<div class="admin-orders">${orders.map((order) => {
      const transitions = allowedOrderTransitions(order.status);
      const items = (order.items || []).map((item) => `${item.quantity} × ${escapeHtml(item.name)}`).join(", ");
      return `<article class="admin-order" data-testid="admin-order-${testIdSlug(order.number)}">
        <div class="admin-order-head"><strong>${escapeHtml(order.number)}</strong><span>${escapeHtml(statusLabels[order.status] || order.status)}</span></div>
        <p>${escapeHtml(order.address?.name || "Unknown customer")} · ${escapeHtml(order.address?.email || "No email")}</p>
        <p>${items}</p>
        <div class="account-order-meta"><span>${currency.format(Number(order.total) || 0)}</span><strong>${escapeHtml(order.createdAt ? new Date(order.createdAt).toLocaleDateString("en") : "Date unavailable")}</strong></div>
        ${transitions.length ? `<form class="admin-status-form" data-admin-status-form="${escapeHtml(order.number)}">
          <label class="checkout-field" for="admin-status-${testIdSlug(order.number)}">Next status<select id="admin-status-${testIdSlug(order.number)}" name="status" data-testid="admin-order-status-select">${transitions.map((status) => `<option value="${status}">${escapeHtml(statusLabels[status])}</option>`).join("")}</select></label>
          <button class="account-link-button" type="submit" data-testid="admin-order-status-save">Update status</button>
        </form>` : `<p class="checkout-field-hint">No further status changes available.</p>`}
      </article>`;
    }).join("")}</div>` : `<p class="account-empty-orders">No orders are available.</p>`}
  </section>`;
}

function adminUsersPanel() {
  const users = readUsers();
  return `<section class="admin-panel" role="tabpanel" aria-label="User list">
    <div class="account-section-heading"><h3>Demo accounts</h3><span class="checkout-field-hint">${users.length} users</span></div>
    <div class="admin-user-list">${users.map((user) => `<article class="admin-user-item" data-testid="admin-user-${testIdSlug(user.email)}">
      <div><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div><span class="account-role">${escapeHtml(user.role)}</span><span class="checkout-field-hint">${escapeHtml(user.status)}</span>
    </article>`).join("")}</div>
  </section>`;
}

function renderAdminPanel() {
  if (state.currentUser?.role !== "ADMIN") return `<p class="account-message" role="alert">Administrator access required.</p>`;
  try {
    if (state.adminTab === "orders") return `${adminTabs()}${adminOrdersPanel()}`;
    if (state.adminTab === "users") return `${adminTabs()}${adminUsersPanel()}`;
    return `${adminTabs()}${adminProductPanel()}`;
  } catch (error) {
    console.error("Could not load the admin panel.", error);
    return `${adminTabs()}<p class="account-message" role="alert">${escapeHtml(error.message)}</p>`;
  }
}

function requireAdminSession() {
  const user = loadCurrentUser();
  if (!user || user.role !== "ADMIN") {
    state.currentUser = null;
    state.editingProductId = null;
    state.adminImageDataUrl = null;
    state.adminImageProcessing = false;
    state.adminImageUploadToken += 1;
    updateAccountButton();
    throw new Error("Administrator access is required for this action.");
  }
  state.currentUser = user;
  updateAccountButton();
  return user;
}

async function optimizeAdminProductImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 8 MB.");
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    console.error("Could not decode the selected product image.", error);
    throw new Error("The selected file could not be decoded as an image.");
  }
  if (!bitmap.width || !bitmap.height) {
    bitmap.close();
    throw new Error("The selected image has invalid dimensions.");
  }
  const canvas = document.createElement("canvas");
  let width = Math.min(bitmap.width, 800);
  let height = Math.min(bitmap.height, 800);
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
  width = Math.max(1, Math.round(bitmap.width * scale));
  height = Math.max(1, Math.round(bitmap.height * scale));
  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image optimization is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, width, height);
      const quality = Math.max(0.45, 0.82 - (attempt % 4) * 0.12);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("The selected image could not be optimized."));
        }, "image/webp", quality);
      });
      if (blob.type !== "image/webp") {
        throw new Error("This browser cannot prepare WebP images for local storage.");
      }
      if (blob.size <= 300 * 1024) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("The optimized image could not be read."));
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });
        return dataUrl;
      }
      if (attempt % 4 === 3) {
        width = Math.max(1, Math.round(width * 0.8));
        height = Math.max(1, Math.round(height * 0.8));
      }
    }
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
  throw new Error("The selected image could not be reduced enough for local storage.");
}

function saveAdminProduct(form) {
  requireAdminSession();
  if (state.adminImageProcessing) throw new Error("Wait for image optimization to finish before saving.");
  const values = new FormData(form);
  const name = String(values.get("name") || "").trim();
  const description = String(values.get("description") || "").trim();
  const category = String(values.get("category") || "");
  const price = Number(values.get("price"));
  const stock = Number(values.get("stock"));
  const symbol = String(values.get("symbol") || "").trim();
  if (!name || name.length > 100 || !description || description.length > 1000
    || !categoryOrder.includes(category) || !Number.isFinite(price) || price <= 0
    || !Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000
    || !symbol || symbol.length > 4) {
    throw new Error("Review the product details and enter valid values.");
  }
  const previousProducts = products.map((product) => ({ ...product }));
  const previousStock = new Map(productSeedStock);
  const id = state.editingProductId || state.nextProductId;
  const nextProduct = {
    id,
    name,
    description,
    category,
    price,
    stock,
    symbol,
    imageDataUrl: state.adminImageDataUrl,
  };
  const existingIndex = products.findIndex((product) => product.id === id);
  if (existingIndex === -1) {
    state.nextProductId = id + 1;
    writeStoredJson(productSequenceStorageKey, state.nextProductId);
  }
  if (existingIndex === -1) products.push(nextProduct);
  else products[existingIndex] = nextProduct;
  try {
    persistDemoProducts();
    state.editingProductId = null;
    state.adminImageDataUrl = null;
    state.accountMessage = { text: `${name} was saved in this browser demo.`, error: false };
    renderCategories();
    renderProducts();
    renderCart();
    renderAccountDialog("dashboard");
  } catch (error) {
    products.splice(0, products.length, ...previousProducts);
    productSeedStock.clear();
    previousStock.forEach((value, key) => productSeedStock.set(key, value));
    throw error;
  }
}

function deleteAdminProduct(productId) {
  requireAdminSession();
  const product = products.find((entry) => entry.id === productId);
  if (!product) throw new Error("That product no longer exists.");
  if (loadOrders().some((order) => order.items?.some((item) => item.id === productId))) {
    throw new Error("Products referenced by order history cannot be deleted.");
  }
  const previousProducts = products.map((entry) => ({ ...entry }));
  const previousStock = new Map(productSeedStock);
  products.splice(products.indexOf(product), 1);
  productSeedStock.delete(productId);
  try {
    persistDemoProducts();
    state.cart = state.cart.filter((item) => item.id !== productId);
    state.editingProductId = null;
    state.adminImageDataUrl = null;
    state.accountMessage = { text: `${product.name} was deleted from this browser demo.`, error: false };
    saveCart();
    renderCategories();
    renderProducts();
    renderCart();
    renderAccountDialog("dashboard");
  } catch (error) {
    products.splice(0, products.length, ...previousProducts);
    productSeedStock.clear();
    previousStock.forEach((value, key) => productSeedStock.set(key, value));
    throw error;
  }
}

function updateAdminOrderStatus(orderNumber, status) {
  requireAdminSession();
  const orders = loadOrders();
  const order = orders.find((entry) => entry.number === orderNumber);
  if (!order || !allowedOrderTransitions(order.status).includes(status)) {
    throw new Error("That order status transition is not allowed.");
  }
  const inventoryItems = [];
  if (status === "PAGO" && order.inventoryApplied !== true) {
    for (const item of order.items || []) {
      const product = products.find((entry) => entry.id === item.id);
      if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stock) {
        throw new Error("The order cannot be marked paid because its items are no longer available.");
      }
      inventoryItems.push({ product, quantity: item.quantity });
    }
    order.inventoryApplied = true;
  }
  order.status = status;
  order.statusUpdatedAt = new Date().toISOString();
  writeStoredJson(ordersStorageKey, orders);
  inventoryItems.forEach(({ product, quantity }) => { product.stock -= quantity; });
  state.cart = state.cart.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.id);
    return product && product.stock > 0
      ? [{ id: product.id, quantity: Math.min(item.quantity, product.stock, 10) }]
      : [];
  });
  state.accountMessage = { text: `${orderNumber} is now ${status.replaceAll("_", " ").toLocaleLowerCase()}.`, error: false };
  saveCart();
  renderProducts();
  renderCart();
  renderAccountDialog("dashboard");
}

function accountDashboard(user) {
  let ordersContent;
  try {
    ordersContent = renderAccountOrders(user);
  } catch (error) {
    console.error("Could not render account order history.", error);
    ordersContent = `<p class="account-message" role="alert">${escapeHtml(error.message)}</p>`;
  }
  const isAdmin = user.role === "ADMIN";
  return `<section class="account-dashboard" data-testid="account-dashboard">
    <div class="account-profile"><span class="account-avatar" aria-hidden="true">${escapeHtml(user.name.trim().charAt(0).toLocaleUpperCase())}</span>
      <div><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div>
      <span class="account-role">${isAdmin ? "ADMIN" : "CUSTOMER"}</span>
    </div>
    ${accountMessageMarkup()}
    ${user.role === "ADMIN"
    ? renderAdminPanel()
    : `<div class="account-section-heading"><h3>Your orders</h3><span class="checkout-field-hint">Demo order history</span></div>${ordersContent}`}
    <div class="account-dashboard-actions"><a class="account-link-button" href="#catalog" data-account-close>Keep exploring ↗</a><button class="account-link-button" type="button" data-account-logout data-testid="logout-button">Sign out</button></div>
  </section>`;
}

function renderAccountDialog(view = state.accountView) {
  state.accountView = view;
  if (state.currentUser) {
    elements.accountContent.innerHTML = `${accountHeader()}${accountDashboard(state.currentUser)}<p class="account-demo-note">Demo account only. Authentication and orders are stored in this browser and are not protected by a server.</p>`;
    return;
  }
  const activeView = ["login", "register", "recover"].includes(view) ? view : "login";
  const content = activeView === "register" ? accountRegisterForm() : activeView === "recover" ? accountRecoveryForm() : accountLoginForm();
  elements.accountContent.innerHTML = `${accountHeader()}${activeView === "recover" ? "" : accountTabs(activeView)}${content}${activeView === "login" ? demoLoginDetails() : ""}<p class="account-demo-note">MVP note: this browser-only demo is not suitable for real users or production credentials.</p>`;
}

function openAccount() {
  state.returnFocus = document.querySelector("#open-account");
  const previousUser = state.currentUser;
  const restoredUser = loadCurrentUser();
  if (previousUser && !restoredUser) {
    endDemoSession("Your demo session expired. Sign in again.");
  } else {
    state.accountMessage = null;
    state.currentUser = restoredUser;
  }
  updateAccountButton();
  renderAccountDialog(state.currentUser ? "dashboard" : "login");
  elements.accountDialog.showModal();
}

function closeAccount() {
  if (elements.accountDialog.open) elements.accountDialog.close();
}

function recordFailedLogin(email) {
  const attempts = readStoredJson(loginAttemptsStorageKey, {});
  const previous = attempts[email] || { count: 0, lockedUntil: 0 };
  if (previous.lockedUntil > Date.now()) return previous;
  const count = previous.lockedUntil ? 1 : previous.count + 1;
  const next = count >= 5
    ? { count, lockedUntil: Date.now() + lockoutDurationMs }
    : { count, lockedUntil: 0 };
  attempts[email] = next;
  writeStoredJson(loginAttemptsStorageKey, attempts);
  return next;
}

function clearLoginAttempts(email) {
  const attempts = readStoredJson(loginAttemptsStorageKey, {});
  delete attempts[email];
  writeStoredJson(loginAttemptsStorageKey, attempts);
}

async function signIn(form) {
  const formData = new FormData(form);
  const email = normalizeEmail(String(formData.get("email")));
  const password = String(formData.get("password"));
  const invalidCredentials = "We couldn't sign you in. Check your details or try another demo account.";
  const attempts = readStoredJson(loginAttemptsStorageKey, {});
  const previous = attempts[email];
  if (previous?.lockedUntil > Date.now()) {
    throw new Error(invalidCredentials);
  }
  const user = readUsers().find((entry) => entry.email === email);
  const digest = await hashPassword(password, user?.salt || "rampz-demo-unknown-account", user?.iterations || passwordIterations);
  const matches = Boolean(user?.passwordHash && user.salt && digest === user.passwordHash);
  if (!user || !matches || user.status !== "active") {
    recordFailedLogin(email);
    throw new Error(invalidCredentials);
  }
  clearLoginAttempts(email);
  saveSession(user);
  syncUserCart(user);
  state.accountMessage = null;
  renderAccountDialog("dashboard");
}

async function registerAccount(form) {
  const formData = new FormData(form);
  const name = String(formData.get("name")).trim();
  const email = normalizeEmail(String(formData.get("email")));
  const cpf = String(formData.get("cpf")).trim();
  const phone = String(formData.get("phone")).trim();
  const password = String(formData.get("password"));
  const confirmPassword = String(formData.get("confirmPassword"));
  if (!cpfIsValid(cpf)) throw new Error("Enter a valid CPF.");
  const phoneDigits = phone.replace(/\D/g, "").length;
  if (phoneDigits < 8 || phoneDigits > 15) throw new Error("Enter a phone number with 8 to 15 digits.");
  if (!passwordIsValid(password)) throw new Error("Password must have at least 8 characters, an uppercase letter, a number, and a special character.");
  if (password !== confirmPassword) throw new Error("The passwords don't match.");

  const users = readUsers();
  if (users.some((user) => user.email === email || user.cpf?.replace(/\D/g, "") === cpf.replace(/\D/g, ""))) {
    throw new Error("An account with that email or CPF already exists.");
  }
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await hashPassword(password, salt);
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    cpf,
    phone,
    role: "CUSTOMER",
    status: "active",
    salt,
    passwordHash,
    iterations: passwordIterations,
    createdAt: new Date().toISOString(),
  };
  writeStoredJson(usersStorageKey, [...users, user]);
  saveSession(user);
  syncUserCart(user);
  state.accountMessage = null;
  renderAccountDialog("dashboard");
}

function requestPasswordReset(form) {
  const formData = new FormData(form);
  const email = normalizeEmail(String(formData.get("email")));
  const token = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  state.recovery = { email, token, expiresAt: Date.now() + 15 * 60 * 1000 };
  state.accountMessage = {
    text: "If that account exists, a reset code is ready. Since no email service is connected, use the demo code shown above.",
    error: false,
  };
  renderAccountDialog("recover");
  const emailInput = elements.accountContent.querySelector('[name="email"]');
  if (emailInput) emailInput.value = email;
}

async function resetPassword(form) {
  const formData = new FormData(form);
  const email = normalizeEmail(String(formData.get("email")));
  const token = String(formData.get("token")).trim();
  const password = String(formData.get("password"));
  if (!state.recovery || state.recovery.email !== email || state.recovery.token !== token || Date.now() > state.recovery.expiresAt) {
    throw new Error("The reset code is invalid or expired.");
  }
  if (!passwordIsValid(password)) {
    throw new Error("Password must have at least 8 characters, an uppercase letter, a number, and a special character.");
  }
  const users = readUsers();
  const userIndex = users.findIndex((user) => user.email === email);
  if (userIndex < 0 || users[userIndex].status !== "active") {
    throw new Error("The reset code is invalid or expired.");
  }
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  users[userIndex] = {
    ...users[userIndex],
    salt,
    passwordHash: await hashPassword(password, salt),
    iterations: passwordIterations,
  };
  writeStoredJson(usersStorageKey, users);
  state.recovery = null;
  state.accountMessage = { text: "Password updated. Sign in with your new password.", error: false };
  renderAccountDialog("login");
}

function cancelCustomerOrder(orderNumber) {
  if (!state.currentUser) return;
  const orders = loadOrders();
  const order = orders.find((entry) =>
    entry.number === orderNumber && entry.address?.email?.toLocaleLowerCase() === state.currentUser.email.toLocaleLowerCase());
  if (!order || order.status !== "AGUARDANDO_PAGAMENTO") {
    state.accountMessage = { text: "Only your orders awaiting payment can be cancelled.", error: true };
    renderAccountDialog("dashboard");
    return;
  }
  order.status = "CANCELADO";
  order.cancelledAt = new Date().toISOString();
  try {
    writeStoredJson(ordersStorageKey, orders);
    state.accountMessage = { text: `${orderNumber} was cancelled. No stock or payment was affected.`, error: false };
    renderAccountDialog("dashboard");
  } catch (error) {
    state.accountMessage = { text: error.message, error: true };
    renderAccountDialog("dashboard");
  }
}

function completeDemoOrder(paymentStatus) {
  if (!state.checkout || state.checkout.orderSubmitting) return;
  state.checkout.orderSubmitting = true;
  const unavailable = state.cart.find((item) => {
    const product = products.find((entry) => entry.id === item.id);
    return !product || item.quantity > product.stock;
  });
  if (unavailable) {
    state.checkout.orderSubmitting = false;
    state.checkout.error = "An item in your bag is no longer available in that quantity. Please review your bag.";
    state.checkout.step = 1;
    renderCheckout();
    return;
  }

  let orders;
  try {
    orders = loadOrders();
  } catch (error) {
    state.checkout.orderSubmitting = false;
    state.checkout.error = error.message;
    renderCheckout();
    return;
  }
  const previousAttempt = orders.find((order) => order.checkoutRequestId === state.checkout.orderRequestId);
  if (previousAttempt) {
    state.cart = [];
    saveCart();
    renderCart();
    renderProducts();
    renderConfirmation(previousAttempt);
    return;
  }

  const totals = getCheckoutTotals();
  const year = new Date().getFullYear();
  const orderSequence = orders.reduce((highest, order) => {
    const match = /^RMP-(\d{4})-(\d+)$/.exec(order.number || "");
    return match && Number(match[1]) === year ? Math.max(highest, Number(match[2])) : highest;
  }, 0) + 1;
  const orderNumber = `RMP-${year}-${String(orderSequence).padStart(6, "0")}`;
  const order = {
    number: orderNumber,
    checkoutRequestId: state.checkout.orderRequestId,
    status: paymentStatus,
    createdAt: new Date().toISOString(),
    items: state.cart.map((item) => {
      const product = products.find((entry) => entry.id === item.id);
      return { id: product.id, name: product.name, quantity: item.quantity, price: product.price };
    }),
    address: { ...state.checkout.address },
    shipping: { ...state.checkout.shipping },
    coupon: state.checkout.coupon?.code || null,
    paymentMethod: state.checkout.paymentMethod,
    inventoryApplied: paymentStatus === "PAGO",
    subtotal: totals.subtotal,
    discount: totals.couponDiscount + totals.pixDiscount,
    shippingPrice: totals.shipping,
    total: totals.total,
  };

  try {
    localStorage.setItem(ordersStorageKey, JSON.stringify([...orders, order]));
  } catch (error) {
    console.error("Could not save the demo order.", error);
    state.checkout.orderSubmitting = false;
    state.checkout.error = "Your demo order could not be saved on this device. No payment was processed; please try again.";
    renderCheckout();
    return;
  }

  if (paymentStatus === "PAGO") {
    order.items.forEach((item) => {
      const product = products.find((entry) => entry.id === item.id);
      product.stock -= item.quantity;
    });
  }
  state.cart = [];
  saveCart();
  renderCart();
  renderProducts();
  renderConfirmation(order);
}

function renderConfirmation(order) {
  const isPaid = order.status === "PAGO";
  const paymentLabel = order.paymentMethod === "pix" ? "Pix" : order.paymentMethod === "boleto" ? "Boleto" : "Credit card";
  const reference = order.paymentMethod === "pix"
    ? `<div class="fictional-code"><span>FICTIONAL PIX QR CODE</span><strong aria-hidden="true">▦</strong><small>Demo only — this is not a payment QR code.</small></div>`
    : order.paymentMethod === "boleto"
      ? `<div class="fictional-code"><span>FICTIONAL BOLETO BARCODE</span><strong aria-hidden="true">▥ ▥ ▥ ▥ ▥</strong><small>Demo only — not a real payment slip.</small></div>`
      : "";
  elements.checkoutContent.innerHTML = `<section class="order-confirmation" aria-labelledby="confirmation-title">
    <span class="confirmation-mark" aria-hidden="true">${isPaid ? "✓" : "…"}</span>
    <p class="eyebrow">${isPaid ? "DEMO PAYMENT APPROVED" : "DEMO ORDER CREATED"}</p>
    <h2 id="confirmation-title">${isPaid ? "A little idea is on its way." : "Your demo order is waiting."}</h2>
    <p class="confirmation-copy">${isPaid
      ? "The simulated payment was approved. No real payment was collected and no shipment will be sent."
      : "Payment is pending. This fictional order does not reserve stock or trigger a real charge."}</p>
    <div class="order-number"><span>Order number</span><strong data-testid="order-confirmation-number">${escapeHtml(order.number)}</strong></div>
    <div class="confirmation-details"><span>Payment</span><strong>${paymentLabel} · ${isPaid ? "Paid" : "Awaiting payment"}</strong><span>Order total</span><strong>${currency.format(order.total)}</strong></div>
    ${reference}
    <button class="primary-button confirmation-button" type="button" data-testid="order-confirmation-continue" data-finish-checkout>Back to the store <span aria-hidden="true">↗</span></button>
  </section>`;
}

function addToCart(id) {
  const product = products.find((entry) => entry.id === id);
  if (!product || product.stock === 0) return;
  const existing = state.cart.find((item) => item.id === id);
  const maxQuantity = Math.min(product.stock, 10);
  if (existing) {
    if (existing.quantity >= maxQuantity) {
      showToast(`You can add up to ${maxQuantity} of this item.`);
      return;
    }
    existing.quantity += 1;
  } else {
    state.cart.push({ id, quantity: 1 });
  }
  saveCart();
  renderCart();
  showToast(`${product.name} added to your bag.`);
}

function updateQuantity(id, delta) {
  const item = state.cart.find((entry) => entry.id === id);
  const product = products.find((entry) => entry.id === id);
  if (!item || !product) return;
  item.quantity = Math.min(Math.min(product.stock, 10), item.quantity + delta);
  if (item.quantity < 1) state.cart = state.cart.filter((entry) => entry.id !== id);
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter((item) => item.id !== id);
  saveCart();
  renderCart();
}

function openCart() {
  state.returnFocus = document.activeElement;
  elements.drawer.inert = false;
  elements.drawer.classList.add("open");
  elements.drawer.setAttribute("aria-hidden", "false");
  elements.backdrop.hidden = false;
  document.body.classList.add("drawer-open");
  document.querySelector("#close-cart").focus();
}

function closeCart() {
  elements.drawer.classList.remove("open");
  elements.drawer.setAttribute("aria-hidden", "true");
  elements.drawer.inert = true;
  elements.backdrop.hidden = true;
  document.body.classList.remove("drawer-open");
  if (state.returnFocus && typeof state.returnFocus.focus === "function") state.returnFocus.focus();
}

function loadReviews() {
  const reviews = readStoredJson(reviewsStorageKey, []);
  if (!Array.isArray(reviews)) throw new Error("Saved product reviews have an invalid format.");
  if (reviews.some((review) =>
    !review
    || !products.some((product) => product.id === review.productId)
    || typeof review.email !== "string"
    || typeof review.name !== "string"
    || !Number.isInteger(review.rating)
    || review.rating < 1
    || review.rating > 5
    || typeof review.comment !== "string"
    || review.comment.length > 500
    || !Number.isFinite(Date.parse(review.createdAt)))) {
    throw new Error("Saved product reviews contain invalid data.");
  }
  return reviews;
}

function customerPurchasedProduct(email, productId) {
  return loadOrders().some((order) =>
    order.status === "PAGO"
    && order.address?.email?.toLocaleLowerCase() === email.toLocaleLowerCase()
    && order.items?.some((item) => item.id === productId));
}

function renderProductReviews(product) {
  let reviews;
  try {
    reviews = loadReviews().filter((review) => review.productId === product.id);
  } catch (error) {
    console.error("Could not load product reviews.", error);
    return `<section class="review-section"><h3>Customer notes</h3><p class="review-feedback" role="alert">${escapeHtml(error.message)}</p></section>`;
  }
  const average = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1)
    : null;
  const reviewCards = reviews.length
    ? reviews.map((review) => {
      const date = new Date(review.createdAt);
      const formattedDate = Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
      return `<article class="product-review" data-testid="product-review-${testIdSlug(review.email)}">
        <div class="product-review-head"><span class="product-review-name">${escapeHtml(review.name)}</span><span class="product-review-rating" aria-label="${Number(review.rating)} out of 5 stars">${"★".repeat(Number(review.rating))}${"☆".repeat(5 - Number(review.rating))}</span></div>
        ${formattedDate ? `<p class="product-review-date">${formattedDate}</p>` : ""}
        ${review.comment ? `<p class="product-review-comment">${escapeHtml(review.comment)}</p>` : ""}
      </article>`;
    }).join("")
    : `<p class="review-empty">No reviews yet. Be the first to share a note.</p>`;
  const message = state.reviewMessage?.productId === product.id
    ? `<p class="review-feedback" role="${state.reviewMessage.error ? "alert" : "status"}">${escapeHtml(state.reviewMessage.text)}</p>`
    : "";
  let reviewAction = "";
  if (!state.currentUser) {
    reviewAction = `<p class="review-note">Purchased this item? Sign in with the account used at checkout to leave a review.</p><button class="account-link-button review-signin" type="button" data-testid="review-signin-button" data-review-signin>Sign in to review ↗</button>`;
  } else {
    try {
      const purchased = customerPurchasedProduct(state.currentUser.email, product.id);
      const existingReview = reviews.some((review) =>
        review.email.toLocaleLowerCase() === state.currentUser.email.toLocaleLowerCase());
      if (!purchased) {
        reviewAction = `<p class="review-note">Reviews are available to signed-in customers after a completed purchase of this item.</p>`;
      } else if (existingReview) {
        reviewAction = `<p class="review-note">Thanks for sharing your experience with this item.</p>`;
      } else {
        reviewAction = `<form class="review-form" data-testid="product-review-form" data-product-review="${product.id}">
          <label class="checkout-field">Your rating<select name="rating" data-testid="review-rating-select" required>
            <option value="">Choose a rating</option><option value="5">5 — Excellent</option><option value="4">4 — Very good</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Needs improvement</option>
          </select></label>
          <label class="checkout-field">Comment (optional)<textarea name="comment" data-testid="review-comment-input" maxlength="500" rows="3" placeholder="Up to 500 characters"></textarea></label>
          <button class="primary-button" type="submit" data-testid="review-submit-button">Share your review <span aria-hidden="true">↗</span></button>
        </form>`;
      }
    } catch (error) {
      console.error("Could not verify purchase eligibility for a review.", error);
      reviewAction = `<p class="review-feedback" role="alert">${escapeHtml(error.message)}</p>`;
    }
  }
  return `<section class="review-section" aria-labelledby="review-heading">
    <div class="review-section-heading"><h3 id="review-heading">Customer notes</h3><span class="review-rating-summary">${average ? `★ ${average} · ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}` : "No ratings yet"}</span></div>
    <div class="review-list">${reviewCards}</div>${message}${reviewAction}
  </section>`;
}

function renderProductDialog(product) {
  let detailsError = "";
  try {
    const orders = loadOrders();
    if (!Array.isArray(orders)) throw new Error("Saved order history has an invalid format.");
  } catch (error) {
    console.error("Could not load product order details.", error);
    detailsError = `<p class="review-feedback" role="alert">${escapeHtml(error.message)}</p>`;
  }
  const specifications = isValidSpecifications(product.specifications) && product.specifications
    ? Object.entries(product.specifications).map(([label, value]) =>
      `<div class="product-specification"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")
    : "";
  const imageSource = product.imageDataUrl || product.imageUrl;
  elements.dialogContent.innerHTML = `<div class="dialog-visual ${categoryTone(product.category)}">${imageSource
  ? `<img class="dialog-product-image" src="${escapeHtml(imageSource)}" alt="" />`
  : `<span>${escapeHtml(product.symbol)}</span>`}</div>
    <p class="dialog-category">${escapeHtml(product.category)}</p>
    <h2 class="dialog-title" id="dialog-title">${escapeHtml(product.name)}</h2>
    <p class="dialog-description">${escapeHtml(product.description)}</p>
    ${specifications ? `<section class="specification-section" aria-labelledby="specification-title"><h3 id="specification-title">Specifications</h3><dl class="specification-list">${specifications}</dl></section>` : ""}
    <div class="dialog-meta"><span>${product.stock > 0 ? `${product.stock} available` : "Currently unavailable"}</span><span class="dialog-price">${currency.format(product.price)}</span></div>
    ${product.stock > 0
      ? `<button class="primary-button dialog-add" type="button" data-testid="product-dialog-add-to-cart" data-add-product="${product.id}">Add to bag <span aria-hidden="true">↗</span></button>`
      : `<button class="primary-button dialog-add" type="button" disabled>Out of stock</button>`}
    ${detailsError}${renderProductReviews(product)}`;
}

function openProductDialog(id, trigger) {
  const product = products.find((entry) => entry.id === id);
  if (!product) return;
  state.returnFocus = trigger;
  state.reviewMessage = null;
  state.currentUser = loadCurrentUser();
  updateAccountButton();
  renderProductDialog(product);
  elements.productDialog.showModal();
}

function saveProductReview(form) {
  const productId = Number(form.dataset.productReview);
  const product = products.find((entry) => entry.id === productId);
  const user = loadCurrentUser();
  state.currentUser = user;
  updateAccountButton();
  if (!product || !user) {
    state.reviewMessage = { productId, text: "Sign in again to submit a review.", error: true };
    if (product) renderProductDialog(product);
    return;
  }
  const formData = new FormData(form);
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 500) {
    state.reviewMessage = { productId, text: "Choose a rating from 1 to 5 and keep comments under 500 characters.", error: true };
    renderProductDialog(product);
    return;
  }
  try {
    if (!customerPurchasedProduct(user.email, productId)) {
      throw new Error("Only customers who completed a purchase of this item can review it.");
    }
    const reviews = loadReviews();
    if (reviews.some((review) => review.productId === productId && review.email.toLocaleLowerCase() === user.email.toLocaleLowerCase())) {
      throw new Error("You have already reviewed this item.");
    }
    reviews.push({
      productId,
      email: user.email,
      name: user.name,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    });
    writeStoredJson(reviewsStorageKey, reviews);
    state.reviewMessage = { productId, text: "Thanks — your review has been added to this demo.", error: false };
  } catch (error) {
    console.error("Could not submit product review.", error);
    state.reviewMessage = { productId, text: error.message, error: true };
  }
  renderProductDialog(product);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(state.toastTimeout);
  state.toastTimeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 2400);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function testIdSlug(value) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function clearFilters() {
  elements.search.value = "";
  elements.minPrice.value = "";
  elements.maxPrice.value = "";
  elements.inStock.checked = false;
  elements.sort.value = "featured";
  state.category = "All";
  state.page = 1;
  renderCategories();
  renderProducts();
}

function onFilterChange() {
  state.page = 1;
  renderProducts();
}

elements.categoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  state.page = 1;
  renderCategories();
  renderProducts();
});

elements.grid.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-product]");
  if (addButton) {
    addToCart(Number(addButton.dataset.addProduct));
    return;
  }
  const detailTrigger = event.target.closest("[data-open-product]");
  if (detailTrigger) openProductDialog(Number(detailTrigger.dataset.openProduct), detailTrigger);
});

elements.grid.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-open-product]")) {
    event.preventDefault();
    openProductDialog(Number(event.target.dataset.openProduct), event.target);
  }
});

elements.pagination.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (!button || button.disabled) return;
  state.page = Number(button.dataset.page);
  renderProducts();
  document.querySelector("#catalog-title").scrollIntoView({ block: "start" });
});

elements.activeFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-filter]");
  if (!button) return;
  const filter = button.dataset.removeFilter;
  if (filter === "search") elements.search.value = "";
  if (filter === "category") state.category = "All";
  if (filter === "min") elements.minPrice.value = "";
  if (filter === "max") elements.maxPrice.value = "";
  if (filter === "stock") elements.inStock.checked = false;
  state.page = 1;
  renderCategories();
  renderProducts();
});

elements.cartItems.addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity]");
  if (quantityButton) {
    updateQuantity(Number(quantityButton.dataset.quantity), Number(quantityButton.dataset.delta));
    return;
  }
  const removeButton = event.target.closest("[data-remove-item]");
  if (removeButton) removeFromCart(Number(removeButton.dataset.removeItem));
});

elements.search.addEventListener("input", onFilterChange);
elements.minPrice.addEventListener("input", onFilterChange);
elements.maxPrice.addEventListener("input", onFilterChange);
elements.inStock.addEventListener("change", onFilterChange);
elements.sort.addEventListener("change", onFilterChange);
document.querySelector("#clear-filters").addEventListener("click", clearFilters);
document.querySelector("#empty-clear").addEventListener("click", clearFilters);
document.querySelector("#open-cart").addEventListener("click", openCart);
document.querySelector("#close-cart").addEventListener("click", closeCart);
document.querySelector("#continue-shopping").addEventListener("click", closeCart);
elements.backdrop.addEventListener("click", closeCart);
document.querySelector("#checkout-button").addEventListener("click", openCheckout);
document.querySelector("#close-product-dialog").addEventListener("click", () => elements.productDialog.close());
elements.productDialog.addEventListener("click", (event) => {
  if (event.target === elements.productDialog) elements.productDialog.close();
});
elements.productDialog.addEventListener("close", () => {
  if (state.returnFocus && typeof state.returnFocus.focus === "function") state.returnFocus.focus();
});
elements.dialogContent.addEventListener("click", (event) => {
  if (event.target.closest("[data-review-signin]")) {
    elements.productDialog.close();
    window.setTimeout(openAccount, 0);
    return;
  }
  const button = event.target.closest("[data-add-product]");
  if (!button) return;
  addToCart(Number(button.dataset.addProduct));
  elements.productDialog.close();
});
elements.dialogContent.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-product-review]");
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  saveProductReview(form);
});
elements.checkoutContent.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-checkout-close]");
  if (closeButton) {
    closeCheckout();
    return;
  }
  const backButton = event.target.closest("[data-checkout-back]");
  if (backButton) {
    state.checkout.step = Math.max(1, state.checkout.step - 1);
    state.checkout.error = "";
    renderCheckout();
    return;
  }
  const editButton = event.target.closest("[data-edit-checkout]");
  if (editButton) {
    state.checkout.step = Number(editButton.dataset.editCheckout);
    state.checkout.error = "";
    renderCheckout();
    return;
  }
  const couponButton = event.target.closest("[data-apply-coupon]");
  if (couponButton) {
    applyCheckoutCoupon();
    return;
  }
  if (event.target.closest("[data-finish-checkout]")) {
    closeCheckout();
    state.checkout = null;
    return;
  }
});

elements.checkoutContent.addEventListener("change", (event) => {
  if (event.target.name !== "paymentMethod") return;
  state.checkout.paymentMethod = event.target.value;
  state.checkout.error = "";
  renderCheckout();
});

elements.checkoutContent.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-checkout-step]");
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const step = Number(form.dataset.checkoutStep);
  state.checkout.error = "";
  if (step === 1) {
    state.checkout.address = Object.fromEntries(formData.entries());
    if (!await refreshCheckoutShipping(state.checkout)) return;
    state.checkout.step = 2;
  } else if (step === 2) {
    if (!await refreshCheckoutShipping(state.checkout)) return;
    state.checkout.step = 3;
  } else if (step === 3) {
    state.checkout.paymentMethod = formData.get("paymentMethod");
    if (state.checkout.paymentMethod === "card") {
      const installments = Number(formData.get("installments"));
      if (getCheckoutTotals().total < 50 || !installments) {
        state.checkout.error = "Credit card installments must be at least R$ 50,00 each. Choose Pix or boleto for a smaller total.";
        renderCheckout();
        return;
      }
      state.checkout.cardName = String(formData.get("cardName")).trim();
      state.checkout.cardNumber = String(formData.get("cardNumber")).trim();
      state.checkout.cardExpiry = String(formData.get("cardExpiry")).trim();
      state.checkout.cardCvc = String(formData.get("cardCvc")).trim();
      state.checkout.installments = installments;
    }
    state.checkout.step = 4;
  } else if (step === 4) {
    if (state.checkout.paymentMethod === "card") {
      const number = state.checkout.cardNumber.replace(/\D/g, "");
      if (number === "4111111111111111") {
        completeDemoOrder("PAGO");
        return;
      }
      state.checkout.error = number === "4000000000000002"
        ? "The demo card was declined. No payment was taken; choose another demo payment method."
        : number === "4000000000000119"
          ? "The simulated payment timed out. No payment was taken; try again or choose another method."
          : "Use one of the three demo card numbers shown in the payment step. No real card is accepted.";
      state.checkout.step = 3;
    } else if (state.checkout.paymentMethod === "pix") {
      completeDemoOrder("PAGO");
      return;
    } else {
      completeDemoOrder("AGUARDANDO_PAGAMENTO");
      return;
    }
  }
  renderCheckout();
});

elements.checkoutDialog.addEventListener("close", () => {
  if (state.returnFocus && typeof state.returnFocus.focus === "function") state.returnFocus.focus();
});
document.querySelector("#open-account").addEventListener("click", openAccount);
elements.accountContent.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-account-close]");
  if (closeButton) {
    closeAccount();
    return;
  }
  const viewButton = event.target.closest("[data-account-view]");
  if (viewButton) {
    state.accountMessage = null;
    renderAccountDialog(viewButton.dataset.accountView);
    return;
  }
  const adminTab = event.target.closest("[data-admin-tab]");
  if (adminTab) {
    try {
      requireAdminSession();
      state.adminTab = adminTab.dataset.adminTab;
      state.accountMessage = null;
      renderAccountDialog("dashboard");
    } catch (error) {
      state.accountMessage = { text: error.message, error: true };
      renderAccountDialog("dashboard");
    }
    return;
  }
  const editProduct = event.target.closest("[data-admin-edit]");
  if (editProduct) {
    try {
      requireAdminSession();
      state.editingProductId = Number(editProduct.dataset.adminEdit);
      state.adminTab = "products";
      state.adminImageDataUrl = products.find((product) => product.id === state.editingProductId)?.imageDataUrl || null;
      state.accountMessage = null;
    } catch (error) {
      state.accountMessage = { text: error.message, error: true };
    }
    renderAccountDialog("dashboard");
    return;
  }
  if (event.target.closest("[data-admin-cancel-edit]")) {
    state.editingProductId = null;
    state.adminImageDataUrl = null;
    state.accountMessage = null;
    renderAccountDialog("dashboard");
    return;
  }
  if (event.target.closest("[data-admin-remove-image]")) {
    state.adminImageDataUrl = null;
    state.accountMessage = { text: "The product will use its generated artwork after saving.", error: false };
    renderAccountDialog("dashboard");
    return;
  }
  const deleteProduct = event.target.closest("[data-admin-delete]");
  if (deleteProduct) {
    try {
      deleteAdminProduct(Number(deleteProduct.dataset.adminDelete));
    } catch (error) {
      state.accountMessage = { text: error.message, error: true };
      renderAccountDialog("dashboard");
    }
    return;
  }
  const demoLogin = event.target.closest("[data-demo-login]");
  if (demoLogin) {
    const email = demoLogin.dataset.demoLogin;
    const password = email === "admin@rampz.test" ? "Admin@1234" : "Teste@1234";
    const emailInput = elements.accountContent.querySelector('[name="email"]');
    const passwordInput = elements.accountContent.querySelector('[name="password"]');
    if (emailInput && passwordInput) {
      emailInput.value = email;
      passwordInput.value = password;
      passwordInput.focus();
    }
    return;
  }
  if (event.target.closest("[data-request-recovery]")) {
    const form = elements.accountContent.querySelector('[data-account-form="recover"]');
    const emailInput = form.querySelector('[name="email"]');
    if (!emailInput.reportValidity()) return;
    requestPasswordReset(form);
    return;
  }
  const cancelButton = event.target.closest("[data-cancel-order]");
  if (cancelButton) {
    cancelCustomerOrder(cancelButton.dataset.cancelOrder);
    return;
  }
  if (event.target.closest("[data-account-logout]")) {
    endDemoSession("You have signed out.");
    renderAccountDialog("login");
  }
});

elements.accountContent.addEventListener("change", async (event) => {
  const input = event.target.closest("[data-testid=\"admin-product-image\"]");
  if (!input || !input.files?.length) return;
  let uploadToken;
  try {
    requireAdminSession();
    uploadToken = ++state.adminImageUploadToken;
    state.adminImageProcessing = true;
    state.accountMessage = null;
    renderAccountDialog("dashboard");
    const dataUrl = await optimizeAdminProductImage(input.files[0]);
    requireAdminSession();
    if (uploadToken !== state.adminImageUploadToken) return;
    state.adminImageDataUrl = dataUrl;
    state.accountMessage = { text: "Image optimized. Save the product to apply it.", error: false };
  } catch (error) {
    console.error("Could not prepare the admin product image.", error);
    if (uploadToken === undefined || uploadToken === state.adminImageUploadToken) {
      state.accountMessage = { text: error.message || "The product image could not be prepared.", error: true };
    }
  } finally {
    if (uploadToken === undefined || uploadToken === state.adminImageUploadToken) {
      state.adminImageProcessing = false;
      renderAccountDialog("dashboard");
    }
  }
});

elements.accountContent.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-admin-product-form]");
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  try {
    saveAdminProduct(form);
  } catch (error) {
    console.error("Could not save the admin product.", error);
    state.accountMessage = { text: error.message || "The product could not be saved.", error: true };
    renderAccountDialog("dashboard");
  }
});

elements.accountContent.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-admin-status-form]");
  if (!form) return;
  event.preventDefault();
  const status = new FormData(form).get("status");
  try {
    updateAdminOrderStatus(form.dataset.adminStatusForm, String(status || ""));
  } catch (error) {
    console.error("Could not update the admin order status.", error);
    state.accountMessage = { text: error.message || "The order status could not be updated.", error: true };
    renderAccountDialog("dashboard");
  }
});

elements.accountContent.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-account-form]");
  if (!form || state.accountBusy) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  state.accountMessage = null;
  state.accountBusy = true;
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    if (form.dataset.accountForm === "login") {
      await signIn(form);
    } else if (form.dataset.accountForm === "register") {
      await registerAccount(form);
    } else if (form.dataset.accountForm === "recover") {
      await resetPassword(form);
    }
    state.accountBusy = false;
  } catch (error) {
    state.accountBusy = false;
    console.error(`Demo ${form.dataset.accountForm} flow failed.`, error);
    state.accountMessage = { text: error.message || "The account action could not be completed.", error: true };
    const values = Array.from(new FormData(form).entries()).filter(([key]) => !/password|token/i.test(key));
    renderAccountDialog(form.dataset.accountForm);
    values.forEach(([name, value]) => {
      const input = elements.accountContent.querySelector(`[name="${name}"]`);
      if (input) input.value = String(value);
    });
  }
});

elements.accountDialog.addEventListener("close", () => {
  if (state.returnFocus && typeof state.returnFocus.focus === "function") state.returnFocus.focus();
});
document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const feedback = document.querySelector("#contact-feedback");
  feedback.textContent = "Thanks for reaching out. Your demo message was validated locally; no email was sent or stored.";
  form.reset();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.closest(".search-box").classList.add("search-open");
    elements.search.focus();
  }
  if (event.key === "Escape" && elements.drawer.classList.contains("open")) closeCart();
});
elements.search.addEventListener("blur", () => {
  elements.search.closest(".search-box").classList.remove("search-open");
});

bootstrapDemoData();
state.currentUser = loadCurrentUser();
updateAccountButton();
for (const activity of ["click", "keydown", "input", "pointerdown"]) {
  document.addEventListener(activity, refreshSessionActivity, { passive: true });
}
window.setInterval(() => {
  if (!state.currentUser) return;
  try {
    if (!readSession()) {
      endDemoSession("Your demo session expired. Sign in again.");
      if (elements.accountDialog.open) {
        renderAccountDialog("login");
      }
    }
  } catch (error) {
    console.error("Could not verify the demo session timeout.", error);
    endDemoSession(error.message);
  }
}, 30_000);

async function loadCatalogFromApi() {
  if (location.hostname.endsWith(".github.io")) {
    categoryOrder.splice(0, categoryOrder.length, ...catalog.categories);
    products.splice(0, products.length, ...catalog.products);
    return;
  }

  const [categoriesResponse, firstProductsResponse] = await Promise.all([
    fetch("/api/v1/categories"),
    fetch("/api/v1/products?limit=100"),
  ]);
  if (!categoriesResponse.ok) throw new Error(`Categories request failed with HTTP ${categoriesResponse.status}.`);
  if (!firstProductsResponse.ok) throw new Error(`Product request failed with HTTP ${firstProductsResponse.status}.`);

  const categoriesResult = await categoriesResponse.json();
  const productsResult = await firstProductsResponse.json();
  if (!Array.isArray(categoriesResult.data)
    || !categoriesResult.data.length
    || categoriesResult.data.some((category) => typeof category !== "string")
    || !Array.isArray(productsResult.data)
    || !productsResult.pagination
    || !Number.isSafeInteger(productsResult.pagination.totalPages)
    || productsResult.pagination.totalPages < 0) {
    throw new Error("The catalog API returned an invalid response.");
  }

  const catalogProducts = [...productsResult.data];
  for (let page = 2; page <= productsResult.pagination.totalPages; page += 1) {
    const response = await fetch(`/api/v1/products?limit=100&page=${page}`);
    if (!response.ok) throw new Error(`Product request failed with HTTP ${response.status}.`);
    const result = await response.json();
    if (!Array.isArray(result.data)) throw new Error("The catalog API returned an invalid product page.");
    catalogProducts.push(...result.data);
  }

  const validProducts = catalogProducts.every((product) =>
    product
    && Number.isSafeInteger(product.id)
    && typeof product.name === "string"
    && typeof product.category === "string"
    && Number.isFinite(product.price)
    && Number.isSafeInteger(product.stock)
    && typeof product.symbol === "string"
    && typeof product.description === "string"
    && isValidSpecifications(product.specifications)
    && (product.imageUrl === undefined || catalogImageUrls.has(product.imageUrl))
    && categoriesResult.data.includes(product.category));
  if (!validProducts || catalogProducts.length !== productsResult.pagination.total) {
    throw new Error("The catalog API returned incomplete or invalid product data.");
  }

  categoryOrder.splice(0, categoryOrder.length, ...categoriesResult.data);
  products.splice(0, products.length, ...catalogProducts);
}

elements.resultsCount.textContent = "Loading the collection…";
loadCatalogFromApi().then(() => {
  try {
    hydrateDemoProducts();
    restoreInventoryFromOrders();
    state.cart = state.cart.flatMap((item) => {
      const product = products.find((entry) => entry.id === item.id);
      return product && product.stock > 0
        ? [{ id: product.id, quantity: Math.min(item.quantity, product.stock, 10) }]
        : [];
    });
    renderCategories();
    renderProducts();
    renderCart();
  } catch (error) {
    console.error("Could not restore the demo inventory.", error);
    showCatalogLoadError(error);
  }
}).catch((error) => {
  console.error("Could not load the product catalog.", error);
  showCatalogLoadError(error);
});

function showCatalogLoadError(error) {
  elements.grid.hidden = true;
  elements.emptyState.hidden = true;
  elements.pagination.innerHTML = "";
  elements.resultsCount.setAttribute("role", "alert");
  elements.resultsCount.textContent = `The catalog could not be loaded: ${error.message}`;
}
