import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const specificationPath = fileURLToPath(new URL("../openapi.json", import.meta.url));
const specification = JSON.parse(await readFile(specificationPath, "utf8"));

assert.equal(specification.openapi, "3.1.0", "OpenAPI version must be 3.1.0.");
assert.ok(specification.info && typeof specification.info.title === "string", "OpenAPI info is required.");
assert.ok(specification.paths && typeof specification.paths === "object", "OpenAPI paths are required.");

const httpMethods = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);
for (const [path, pathItem] of Object.entries(specification.paths)) {
  const operations = Object.entries(pathItem).filter(([key]) => httpMethods.has(key));
  assert.ok(operations.length, `${path} must define at least one HTTP operation.`);
  for (const [method, operation] of operations) {
    assert.ok(operation.responses && typeof operation.responses === "object", `${method.toUpperCase()} ${path} must define responses.`);
    assert.ok(Object.keys(operation.responses).length, `${method.toUpperCase()} ${path} must define at least one response.`);
    for (const statusCode of Object.keys(operation.responses)) {
      assert.ok(/^[1-5]\d\d$/.test(statusCode) || statusCode === "default", `${method.toUpperCase()} ${path} has invalid response key ${statusCode}.`);
    }
  }
}

function resolveLocalReference(reference) {
  assert.ok(reference.startsWith("#/"), `Only local OpenAPI references are supported: ${reference}`);
  return reference.slice(2).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((value, part) => value?.[part], specification);
}

function inspect(value, parentKey = "") {
  if (Array.isArray(value)) {
    value.forEach((entry) => inspect(entry, parentKey));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value.$ref === "string") {
    assert.notEqual(resolveLocalReference(value.$ref), undefined, `Unresolved OpenAPI reference: ${value.$ref}`);
  }
  if (parentKey === "schema") {
    for (const key of Object.keys(value)) {
      assert.ok(!/^[1-5]\d\d$/.test(key), `HTTP response ${key} is incorrectly nested inside an OpenAPI schema.`);
    }
  }
  for (const [key, entry] of Object.entries(value)) inspect(entry, key);
}

inspect(specification);
console.log("OpenAPI document structure and local references are valid.");
