import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDirectory = resolve(projectRoot, "dist");
const publicFiles = ["index.html", "app.js", "styles.css", "404.html", "openapi.json"];

await mkdir(outputDirectory, { recursive: true });
await Promise.all(publicFiles.map((file) => copyFile(
  resolve(projectRoot, file),
  resolve(outputDirectory, file),
)));

console.log(`Production storefront built in ${outputDirectory}.`);
