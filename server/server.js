import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { calculateShipping, validateCoupon } from "./rules.js";
import { createSeedState } from "./seed.js";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const staticRoot = process.env.NODE_ENV === "production" ? resolve(projectRoot, "dist") : projectRoot;
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);
const publicFiles = new Set(["index.html", "app.js", "styles.css", "openapi.json", "404.html"]);
const writeRateLimit = { maxRequests: 60, windowMs: 60_000 };
const writeRequestCounts = new Map();
let nextRateLimitCleanup = 0;

let state = createSeedState();

function consumeWriteRequest(request, pathname) {
  const method = request.method;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  const normalizedPath = pathname === "/test/reset" || pathname === "/api/v1/test/reset"
    ? "/api/v1/test/reset"
    : ["/api/v1/coupons/validate", "/api/v1/shipping/calculate"].includes(pathname)
      ? pathname
      : "/api/other-write";
  const key = `${request.socket.remoteAddress}:${normalizedPath}`;
  const now = Date.now();
  if (now >= nextRateLimitCleanup) {
    for (const [entryKey, entry] of writeRequestCounts) {
      if (now - entry.windowStart >= writeRateLimit.windowMs) writeRequestCounts.delete(entryKey);
    }
    nextRateLimitCleanup = now + writeRateLimit.windowMs;
  }
  const current = writeRequestCounts.get(key);
  if (!current || now - current.windowStart >= writeRateLimit.windowMs) {
    writeRequestCounts.set(key, { count: 1, windowStart: now });
    return null;
  }
  if (current.count >= writeRateLimit.maxRequests) {
    return Math.max(1, Math.ceil((current.windowStart + writeRateLimit.windowMs - now) / 1000));
  }
  current.count += 1;
  return null;
}

function securityHeaders() {
  return {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
  };
}

function sendJson(response, statusCode, value, method = "GET") {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...securityHeaders(),
  });
  response.end(method === "HEAD" ? undefined : body);
}

function healthPayload() {
  return {
    status: "ok",
    service: "rampz-store",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

function listProducts(url) {
  const { searchParams } = url;
  const allowedParameters = new Set(["q", "category", "minPrice", "maxPrice", "inStock", "sort", "page", "limit"]);
  const seenParameters = new Set();
  for (const parameter of searchParams.keys()) {
    if (!allowedParameters.has(parameter)) return { error: `Unknown query parameter: ${parameter}.` };
    if (seenParameters.has(parameter)) return { error: `Query parameter must not be repeated: ${parameter}.` };
    seenParameters.add(parameter);
  }
  const parseNumber = (parameter, fallback, { min, max } = {}) => {
    const raw = searchParams.get(parameter);
    if (raw === null) return fallback;
    if (!/^\d+(?:\.\d+)?$/.test(raw)) throw new Error(`${parameter} must be a valid non-negative number.`);
    const value = Number(raw);
    if (!Number.isFinite(value) || (min !== undefined && value < min) || (max !== undefined && value > max)) {
      throw new Error(`${parameter} is outside the allowed range.`);
    }
    return value;
  };

  let page;
  let limit;
  let minPrice;
  let maxPrice;
  try {
    page = parseNumber("page", 1, { min: 1, max: 1_000_000 });
    limit = parseNumber("limit", 12, { min: 1, max: 100 });
    minPrice = parseNumber("minPrice", null);
    maxPrice = parseNumber("maxPrice", null);
  } catch (error) {
    return { error: error.message };
  }
  if (!Number.isSafeInteger(page) || !Number.isSafeInteger(limit)) {
    return { error: "page and limit must be whole numbers." };
  }
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { error: "minPrice must not be greater than maxPrice." };
  }

  const query = (searchParams.get("q") || "").trim().toLocaleLowerCase();
  if (query.length > 120) return { error: "q must be at most 120 characters." };
  const category = searchParams.get("category");
  if (category && !state.categories.includes(category)) return { error: "category is not recognized." };
  const inStockValue = searchParams.get("inStock");
  if (inStockValue !== null && !["true", "false"].includes(inStockValue)) {
    return { error: "inStock must be true or false." };
  }
  const sort = searchParams.get("sort") || "featured";
  if (!["featured", "price-asc", "price-desc", "name-asc", "newest"].includes(sort)) {
    return { error: "sort must be featured, price-asc, price-desc, name-asc, or newest." };
  }

  const products = state.products.filter((product) => {
    const matchesQuery = !query
      || product.name.toLocaleLowerCase().includes(query)
      || product.category.toLocaleLowerCase().includes(query);
    return matchesQuery
      && (!category || product.category === category)
      && (minPrice === null || product.price >= minPrice)
      && (maxPrice === null || product.price <= maxPrice)
      && (inStockValue !== "true" || product.stock > 0);
  });
  if (sort === "price-asc") products.sort((first, second) => first.price - second.price || first.id - second.id);
  if (sort === "price-desc") products.sort((first, second) => second.price - first.price || first.id - second.id);
  if (sort === "name-asc") products.sort((first, second) => first.name.localeCompare(second.name, "en") || first.id - second.id);
  if (sort === "newest") products.sort((first, second) => second.id - first.id);
  const total = products.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return {
    data: products.slice(start, start + limit),
    pagination: { page, limit, total, totalPages },
  };
}

async function serveStatic(pathname, response, method) {
  if (pathname === "/404.html") {
    await sendNotFoundPage(response, method);
    return;
  }
  let relativePath;
  try {
    relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  } catch {
    sendJson(response, 400, { error: "Invalid path encoding." }, method);
    return;
  }
  if (!publicFiles.has(relativePath)) {
    await sendNotFoundPage(response, method);
    return;
  }
  const filePath = resolve(staticRoot, relativePath);
  if (filePath !== staticRoot && !filePath.startsWith(`${staticRoot}${sep}`)) {
    await sendNotFoundPage(response, method);
    return;
  }
  let body;
  try {
    body = await readFile(filePath);
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "EISDIR") throw error;
    await sendNotFoundPage(response, method);
    return;
  }
  response.writeHead(200, {
    "content-type": contentTypes.get(extname(filePath)) || "application/octet-stream",
    ...securityHeaders(),
  });
  response.end(method === "HEAD" ? undefined : body);
}

async function sendNotFoundPage(response, method) {
  const body = await readFile(resolve(projectRoot, "404.html"));
  response.writeHead(404, {
    "content-type": "text/html; charset=utf-8",
    ...securityHeaders(),
  });
  response.end(method === "HEAD" ? undefined : body);
}

async function readJsonBody(request) {
  const contentType = request.headers["content-type"] || "";
  if (!/^\s*application\/json\s*(?:;|$)/i.test(contentType)) {
    const error = new Error("Content-Type must be application/json.");
    error.statusCode = 415;
    throw error;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16 * 1024) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must contain valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

const server = createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url, "http://localhost");
  } catch {
    sendJson(response, 400, { error: "Invalid request URL." }, request.method);
    return;
  }
  const { pathname } = url;

  if (pathname.startsWith("/api/") || pathname === "/test/reset") {
    const retryAfter = consumeWriteRequest(request, pathname);
    if (retryAfter !== null) {
      response.setHeader("retry-after", String(retryAfter));
      sendJson(response, 429, { error: "Too many write requests. Try again later." });
      return;
    }
  }

  if (pathname === "/health" || pathname === "/api/v1/health") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("allow", "GET, HEAD");
      sendJson(response, 405, { error: "Method not allowed." }, request.method);
      return;
    }
    sendJson(response, 200, healthPayload(), request.method);
    return;
  }

  if (pathname === "/test/reset" || pathname === "/api/v1/test/reset") {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      sendJson(response, 405, { error: "Method not allowed." }, request.method);
      return;
    }
    if (process.env.NODE_ENV !== "test") {
      sendJson(response, 403, { error: "Seed reset is available only in the test environment." });
      return;
    }
    state = createSeedState();
    writeRequestCounts.clear();
    sendJson(response, 200, {
      status: "reset",
      products: state.products.length,
      users: state.users.length,
      orders: state.orders.length,
    });
    return;
  }

  if (pathname === "/api/v1/categories") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("allow", "GET, HEAD");
      sendJson(response, 405, { error: "Method not allowed." }, request.method);
      return;
    }
    sendJson(response, 200, { data: state.categories }, request.method);
    return;
  }

  if (pathname === "/api/v1/openapi.json") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("allow", "GET, HEAD");
      sendJson(response, 405, { error: "Method not allowed." }, request.method);
      return;
    }
    await serveStatic("/openapi.json", response, request.method);
    return;
  }

  if (pathname === "/api/v1/coupons/validate") {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      sendJson(response, 405, { error: "Method not allowed." }, request.method);
      return;
    }
    let payload;
    try {
      payload = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message });
      return;
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      sendJson(response, 400, { error: "Request body must be a JSON object." });
      return;
    }
    const unknownFields = Object.keys(payload).filter((key) => !["code", "subtotal", "email"].includes(key));
    if (unknownFields.length) {
      sendJson(response, 400, { error: `Unknown request field: ${unknownFields[0]}.` });
      return;
    }
    const result = validateCoupon(payload, state.orders);
    if (result.statusCode !== 200) {
      sendJson(response, result.statusCode, { error: result.error });
      return;
    }
    sendJson(response, 200, { data: result.data });
    return;
  }

  if (pathname === "/api/v1/shipping/calculate") {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      sendJson(response, 405, { error: "Method not allowed." }, request.method);
      return;
    }
    let payload;
    try {
      payload = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message });
      return;
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      sendJson(response, 400, { error: "Request body must be a JSON object." });
      return;
    }
    const unknownFields = Object.keys(payload).filter((key) => !["cep", "subtotal", "coupon"].includes(key));
    if (unknownFields.length) {
      sendJson(response, 400, { error: `Unknown request field: ${unknownFields[0]}.` });
      return;
    }
    const result = calculateShipping(payload);
    if (result.statusCode !== 200) {
      sendJson(response, result.statusCode, { error: result.error });
      return;
    }
    sendJson(response, 200, result.data);
    return;
  }

  if (pathname === "/api/v1/products") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("allow", "GET, HEAD");
      sendJson(response, 405, { error: "Method not allowed." }, request.method);
      return;
    }
    const result = listProducts(url);
    if (result.error) {
      sendJson(response, 400, { error: result.error }, request.method);
      return;
    }
    sendJson(response, 200, result, request.method);
    return;
  }

  const productMatch = /^\/api\/v1\/products\/([^/]+)$/.exec(pathname);
  if (productMatch) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("allow", "GET, HEAD");
      sendJson(response, 405, { error: "Method not allowed." }, request.method);
      return;
    }
    const id = Number(productMatch[1]);
    if (!Number.isSafeInteger(id) || id < 1) {
      sendJson(response, 400, { error: "Product id must be a positive integer." }, request.method);
      return;
    }
    const product = state.products.find((entry) => entry.id === id);
    if (!product) {
      sendJson(response, 404, { error: "Product not found." }, request.method);
      return;
    }
    sendJson(response, 200, { data: product }, request.method);
    return;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "API endpoint not found." }, request.method);
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("allow", "GET, HEAD");
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }
  try {
    await serveStatic(pathname, response, request.method);
  } catch (error) {
    console.error("Could not serve the requested file.", error);
    sendJson(response, 500, { error: "Internal server error." });
  }
});

const requestedPort = Number(process.env.PORT || 3000);
if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
  throw new Error("PORT must be an integer between 0 and 65535.");
}

server.listen(requestedPort, process.env.HOST || "127.0.0.1", () => {
  const address = server.address();
  console.log(`Rampz Store demo listening at http://${process.env.HOST || "127.0.0.1"}:${address.port}`);
});
