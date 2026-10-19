import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, beforeEach, test } from "node:test";

const serverPath = fileURLToPath(new URL("../server/server.js", import.meta.url));
let child;
let baseUrl;
let output = "";

async function startServer(environment) {
  child = spawn(process.execPath, [serverPath], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, NODE_ENV: environment, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5_000) {
    const match = /listening at (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
    if (match) {
      baseUrl = match[1];
      return;
    }
    if (child.exitCode !== null) throw new Error(`Server exited early: ${output}`);
    await delay(25);
  }
  throw new Error(`Server did not start: ${output}`);
}

async function stopServer() {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([once(child, "exit"), delay(3_000)]);
}

before(async () => {
  await startServer("test");
});

beforeEach(async () => {
  const response = await fetch(`${baseUrl}/api/v1/test/reset`, { method: "POST" });
  assert.equal(response.status, 200, "Each API test starts from the deterministic seed.");
  await response.json();
});

after(async () => {
  await stopServer();
});

test("health endpoint is available at root and API base path", async () => {
  for (const path of ["/health", "/api/v1/health"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.status, "ok");
    assert.equal(body.service, "rampz-store");
    assert.equal(body.environment, "test");
  }
});

test("HEAD requests expose the GET status and headers without a response body", async () => {
  for (const [path, expectedStatus] of [
    ["/health", 200],
    ["/api/v1/categories", 200],
    ["/api/v1/products", 200],
    ["/api/v1/products/3", 200],
    ["/api/v1/products/999", 404],
    ["/api/v1/products?page=0", 400],
    ["/api/v1/openapi.json", 200],
    ["/api/v1/coupons/validate", 405],
    ["/api/v1/shipping/calculate", 405],
    ["/api/v1/test/reset", 405],
    ["/api/v1/missing", 404],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { method: "HEAD" });
    assert.equal(response.status, expectedStatus, path);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8", path);
    assert.equal(await response.text(), "", path);
  }
  for (const [path, contentType, expectedStatus] of [
    ["/", /text\/html/, 200],
    ["/missing-page", /text\/html/, 404],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { method: "HEAD" });
    assert.equal(response.status, expectedStatus, path);
    assert.match(response.headers.get("content-type"), contentType, path);
    assert.equal(await response.text(), "", path);
  }
});

test("API and static responses include security headers", async () => {
  for (const path of ["/health", "/", "/api/v1/missing"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
    assert.equal(response.headers.get("x-frame-options"), "DENY", path);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer", path);
    assert.equal(
      response.headers.get("permissions-policy"),
      "camera=(), microphone=(), geolocation=()",
      path,
    );
  }
});

test("test reset restores deterministic seed counts", async () => {
  const response = await fetch(`${baseUrl}/api/v1/test/reset`, { method: "POST" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "reset",
    products: 20,
    users: 5,
    orders: 2,
  });
});

test("test reset reproduces the same catalog and coupon eligibility", async () => {
  const readSeedSnapshot = async () => {
    const [categoriesResponse, productsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v1/categories`),
      fetch(`${baseUrl}/api/v1/products?limit=100`),
    ]);
    assert.equal(categoriesResponse.status, 200);
    assert.equal(productsResponse.status, 200);
    const categories = await categoriesResponse.json();
    const products = await productsResponse.json();
    const validateWelcome = async (email) => {
      const response = await fetch(`${baseUrl}/api/v1/coupons/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "BEMVINDO10", subtotal: 100, email }),
      });
      return { status: response.status, body: await response.json() };
    };
    return {
      categories,
      products,
      usedCustomerCoupon: await validateWelcome("cliente@rampz.test"),
      newCustomerCoupon: await validateWelcome("novo@rampz.test"),
    };
  };

  const firstSnapshot = await readSeedSnapshot();
  const resetResponse = await fetch(`${baseUrl}/api/v1/test/reset`, { method: "POST" });
  assert.equal(resetResponse.status, 200);
  const secondSnapshot = await readSeedSnapshot();
  assert.deepEqual(secondSnapshot, firstSnapshot);
});

test("coupon validation applies discount thresholds and first-purchase eligibility", async () => {
  const validate = async (payload) => {
    const response = await fetch(`${baseUrl}/api/v1/coupons/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { response, body: await response.json() };
  };

  const welcome = await validate({ code: "bemvindo10", subtotal: 100, email: "NOVO@RAMPZ.TEST" });
  assert.equal(welcome.response.status, 200);
  assert.deepEqual(welcome.body.data, { code: "BEMVINDO10", discount: 0.1, freeShipping: false });

  const usedWelcome = await validate({ code: "BEMVINDO10", subtotal: 100, email: "cliente@rampz.test" });
  assert.equal(usedWelcome.response.status, 422);
  assert.match(usedWelcome.body.error, /first completed purchase/);

  const lab20AtThreshold = await validate({ code: "LAB20", subtotal: 300, email: "novo@rampz.test" });
  assert.equal(lab20AtThreshold.response.status, 422);
  const lab20 = await validate({ code: "LAB20", subtotal: 300.01, email: "novo@rampz.test" });
  assert.deepEqual(lab20.body.data, { code: "LAB20", discount: 0.2, freeShipping: false });

  const freeAtThreshold = await validate({ code: "FRETEGRATIS", subtotal: 150, email: "novo@rampz.test" });
  assert.equal(freeAtThreshold.response.status, 422);
  const freeShipping = await validate({ code: "FRETEGRATIS", subtotal: 150.01, email: "novo@rampz.test" });
  assert.deepEqual(freeShipping.body.data, { code: "FRETEGRATIS", discount: 0, freeShipping: true });

  assert.match((await validate({ code: "EXPIRADO", subtotal: 200, email: "novo@rampz.test" })).body.error, /expired/);
  assert.match((await validate({ code: "INVALIDO", subtotal: 200, email: "novo@rampz.test" })).body.error, /not valid/);
});

test("coupon validation rejects malformed requests and unsupported methods", async () => {
  const post = (payload) => fetch(`${baseUrl}/api/v1/coupons/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  for (const payload of [
    { code: "", subtotal: 100, email: "novo@rampz.test" },
    { code: "LAB20", subtotal: -1, email: "novo@rampz.test" },
    { code: "LAB20", subtotal: 100, email: "not-an-email" },
    { code: "LAB20", subtotal: 100, email: "novo@rampz.test", extra: true },
  ]) {
    const response = await post(payload);
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, "string");
  }
  const method = await fetch(`${baseUrl}/api/v1/coupons/validate`);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "POST");

  for (const [body, headers, status] of [
    ["{", { "content-type": "application/json" }, 400],
    ["[]", { "content-type": "application/json" }, 400],
    ["{}", { "content-type": "text/plain" }, 415],
    ["{}", { "content-type": "application/jsonp" }, 415],
    [JSON.stringify({ code: "LAB20", subtotal: 350, email: "novo@rampz.test", padding: "x".repeat(16 * 1024) }),
      { "content-type": "application/json" }, 413],
  ]) {
    const response = await fetch(`${baseUrl}/api/v1/coupons/validate`, {
      method: "POST",
      headers,
      body,
    });
    assert.equal(response.status, status);
    assert.equal(typeof (await response.json()).error, "string");
  }
});

test("write endpoints enforce per-IP, per-endpoint rate limits", async () => {
  const reset = await fetch(`${baseUrl}/api/v1/test/reset`, { method: "POST" });
  assert.equal(reset.status, 200);

  const responses = await Promise.all(Array.from({ length: 61 }, () =>
    fetch(`${baseUrl}/api/v1/coupons/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "LAB20", subtotal: 350, email: "novo@rampz.test" }),
    }).then(async (response) => {
      const status = response.status;
      const retryAfter = response.headers.get("retry-after");
      const body = await response.json();
      return { status, retryAfter, body };
    })));

  assert.equal(responses.filter((response) => response.status === 200).length, 60);
  const limited = responses.filter((response) => response.status === 429);
  assert.equal(limited.length, 1);
  assert.match(limited[0].body.error, /Too many write requests/);
  assert.ok(Number(limited[0].retryAfter) >= 1);
});

test("product listing supports pagination, case-insensitive search, filters, and sorting", async () => {
  const firstPage = await fetch(`${baseUrl}/api/v1/products`);
  assert.equal(firstPage.status, 200);
  const firstPageBody = await firstPage.json();
  assert.equal(firstPageBody.data.length, 12);
  assert.deepEqual(firstPageBody.pagination, { page: 1, limit: 12, total: 20, totalPages: 2 });

  const filtered = await fetch(`${baseUrl}/api/v1/products?q=BEAKER&category=Glassware&minPrice=15&maxPrice=20&inStock=true`);
  const filteredBody = await filtered.json();
  assert.equal(filtered.status, 200);
  assert.equal(filteredBody.pagination.total, 1);
  assert.equal(filteredBody.data[0].id, 3);

  const sorted = await fetch(`${baseUrl}/api/v1/products?sort=price-asc&limit=3&page=2`);
  const sortedBody = await sorted.json();
  assert.deepEqual(sortedBody.data.map((product) => product.id), [14, 3, 20]);
  assert.deepEqual(sortedBody.pagination, { page: 2, limit: 3, total: 20, totalPages: 7 });

  const newest = await fetch(`${baseUrl}/api/v1/products?sort=newest&limit=1`);
  assert.equal((await newest.json()).data[0].id, 20);
});

test("categories and product details return seeded catalog data", async () => {
  const categories = await fetch(`${baseUrl}/api/v1/categories`);
  assert.deepEqual((await categories.json()).data, [
    "Glassware",
    "Equipment",
    "Reagents & Solutions",
    "Safety",
    "Tools & Accessories",
    "Learning Kits",
  ]);
  const detail = await fetch(`${baseUrl}/api/v1/products/3`);
  const detailBody = await detail.json();
  assert.equal(detail.status, 200);
  assert.equal(detailBody.data.name, "Glass Beaker 250ml");
  assert.match(detailBody.data.description, /versatile 250 ml beaker/i);
  assert.deepEqual(detailBody.data.specifications, {
    Capacity: "250 ml",
    Material: "Glass",
    Graduations: "Approximate volume markings",
  });
  const listing = await fetch(`${baseUrl}/api/v1/products?limit=100`);
  const listingBody = await listing.json();
  assert.ok(listingBody.data.every((product) =>
    product.specifications && Object.values(product.specifications).every((value) => typeof value === "string")));
  assert.equal((await fetch(`${baseUrl}/api/v1/products/999`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/v1/products/3.5`)).status, 400);
});

test("OpenAPI document is served and describes implemented API routes", async () => {
  const response = await fetch(`${baseUrl}/api/v1/openapi.json`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  const specification = await response.json();
  assert.equal(specification.openapi, "3.1.0");
  assert.ok(specification.paths["/api/v1/products"]);
  assert.ok(specification.paths["/api/v1/coupons/validate"]);
  assert.ok(specification.paths["/api/v1/shipping/calculate"]);
  assert.ok(specification.paths["/api/v1/openapi.json"]);
  assert.equal(specification.paths["/api/v1/coupons/validate"].post.requestBody.required, true);
  assert.equal(
    specification.paths["/api/v1/coupons/validate"].post.responses["429"].$ref,
    "#/components/responses/TooManyRequests",
  );
  assert.equal(
    specification.paths["/api/v1/shipping/calculate"].post.responses["422"].$ref,
    "#/components/responses/UnprocessableEntity",
  );
  assert.equal(specification.components.responses.UnprocessableEntity.description, "Business rule rejected the request");
});

test("product query validation returns client errors for invalid parameters", async () => {
  for (const query of [
    "page=0",
    "page=1.5",
    "limit=101",
    "minPrice=-1",
    "minPrice=20&maxPrice=10",
    "inStock=yes",
    "sort=unknown",
    "category=Not%20a%20category",
    "unexpected=value",
    "page=1&page=2",
    `q=${"x".repeat(121)}`,
  ]) {
    const response = await fetch(`${baseUrl}/api/v1/products?${query}`);
    assert.equal(response.status, 400, query);
    assert.equal(typeof (await response.json()).error, "string", query);
  }
});

test("shipping quotes use CEP regions and free-shipping thresholds", async () => {
  const quote = async (payload) => {
    const response = await fetch(`${baseUrl}/api/v1/shipping/calculate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { response, body: await response.json() };
  };

  const south = await quote({ cep: "80000-000", subtotal: 100 });
  assert.equal(south.response.status, 200);
  assert.deepEqual(south.body, { cep: "80000000", region: "South", price: 15, days: 3, freeShipping: false });

  const southeast = await quote({ cep: "01310-000", subtotal: 100 });
  assert.deepEqual(southeast.body, { cep: "01310000", region: "Southeast", price: 20, days: 5, freeShipping: false });

  const other = await quote({ cep: "40000-000", subtotal: 100 });
  assert.deepEqual(other.body, { cep: "40000000", region: "Other regions", price: 35, days: 8, freeShipping: false });

  const freeCoupon = await quote({ cep: "80000-000", subtotal: 150.01, coupon: "fretegratis" });
  assert.equal(freeCoupon.body.price, 0);
  assert.equal(freeCoupon.body.freeShipping, true);

  const threshold = await quote({ cep: "01310-000", subtotal: 500 });
  assert.equal(threshold.body.price, 20);
  const aboveThreshold = await quote({ cep: "01310-000", subtotal: 500.01 });
  assert.equal(aboveThreshold.body.price, 0);
});

test("shipping endpoint rejects invalid payloads and unsupported coupons", async () => {
  const post = (body, headers = { "content-type": "application/json" }) =>
    fetch(`${baseUrl}/api/v1/shipping/calculate`, {
      method: "POST",
      headers,
      body,
    });

  for (const payload of [
    { cep: "1234", subtotal: 100 },
    { cep: "12345-6789", subtotal: 100 },
    { cep: "01310-000", subtotal: -1 },
    { cep: "01310-000", subtotal: "20" },
    { cep: "01310-000", subtotal: 100, unknown: true },
  ]) {
    const response = await post(JSON.stringify(payload));
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, "string");
  }

  const ineligibleCoupon = await post(JSON.stringify({ cep: "01310-000", subtotal: 150, coupon: "FRETEGRATIS" }));
  assert.equal(ineligibleCoupon.status, 422);
  const unknownCoupon = await post(JSON.stringify({ cep: "01310-000", subtotal: 300, coupon: "INVALIDO" }));
  assert.equal(unknownCoupon.status, 422);
  const malformedJson = await post("{");
  assert.equal(malformedJson.status, 400);
  const oversizedBody = await post(JSON.stringify({
    cep: "01310-000",
    subtotal: 100,
    padding: "x".repeat(16 * 1024),
  }));
  assert.equal(oversizedBody.status, 413);
  assert.match((await oversizedBody.json()).error, /too large/);
  const wrongContentType = await post("{}", { "content-type": "text/plain" });
  assert.equal(wrongContentType.status, 415);
  const jsonpContentType = await post("{}", { "content-type": "application/jsonp" });
  assert.equal(jsonpContentType.status, 415);
  const jsonWithCharset = await post(
    JSON.stringify({ cep: "01310-000", subtotal: 100 }),
    { "content-type": "application/json; charset=utf-8" },
  );
  assert.equal(jsonWithCharset.status, 200);

  const method = await fetch(`${baseUrl}/api/v1/shipping/calculate`);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "POST");
});

test("API unknown routes return JSON 404 and the app is served locally", async () => {
  const missing = await fetch(`${baseUrl}/api/v1/missing`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("content-type"), /application\/json/);
  const malformedPath = await fetch(`${baseUrl}/%E0%A4%A`);
  assert.equal(malformedPath.status, 400);
  assert.deepEqual(await malformedPath.json(), { error: "Invalid path encoding." });
  const traversalPath = await fetch(`${baseUrl}/%2e%2e/package.json`);
  assert.equal(traversalPath.status, 404);
  assert.match(traversalPath.headers.get("content-type"), /text\/html/);
  const packageFile = await fetch(`${baseUrl}/package.json`);
  assert.equal(packageFile.status, 404);
  assert.match(await packageFile.text(), /This page took a wrong turn/);
  const serverSource = await fetch(`${baseUrl}/server/server.js`);
  assert.equal(serverSource.status, 404);
  const unknownPage = await fetch(`${baseUrl}/pages/not-here`);
  assert.equal(unknownPage.status, 404);
  assert.match(await unknownPage.text(), /Back to the store/);
  const missingApi = await fetch(`${baseUrl}/api/v1/not-here`);
  assert.equal(missingApi.status, 404);
  assert.match(missingApi.headers.get("content-type"), /application\/json/);
  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /text\/html/);
  const homeHtml = await home.text();
  assert.match(homeHtml, /Rampz Store/);
  assert.match(homeHtml, /class="skip-link" href="#main-content"/);
  assert.match(homeHtml, /<main id="main-content" tabindex="-1">/);
});

test("seed reset is forbidden outside the test environment", async () => {
  await stopServer();
  output = "";
  await startServer("development");
  for (const path of ["/test/reset", "/api/v1/test/reset"]) {
    const response = await fetch(`${baseUrl}${path}`, { method: "POST" });
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /only in the test environment/);
  }

  await stopServer();
  output = "";
  await startServer("production");
  const health = await fetch(`${baseUrl}/health`);
  assert.equal((await health.json()).environment, "production");
  const productionReset = await fetch(`${baseUrl}/api/v1/test/reset`, { method: "POST" });
  assert.equal(productionReset.status, 403);
  assert.match((await productionReset.json()).error, /only in the test environment/);
});
