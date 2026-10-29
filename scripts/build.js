import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDirectory = resolve(projectRoot, "dist");
const publicFiles = ["index.html", "app.js", "catalog.js", "styles.css", "404.html", "favicon.svg", "openapi.json"];
const publicImages = [
  "item01.jpeg",
  "item02.jpeg",
  "item03.jpeg",
  "item04.png",
  "item05.png",
  "item06.png",
  "item07.png",
  "item08.png",
];

await mkdir(outputDirectory, { recursive: true });
await Promise.all(publicFiles.map((file) => copyFile(
  resolve(projectRoot, file),
  resolve(outputDirectory, file),
)));
const imageDirectory = resolve(outputDirectory, "img");
await mkdir(imageDirectory, { recursive: true });
await Promise.all(publicImages.map((file) => copyFile(
  resolve(projectRoot, "img", file),
  resolve(imageDirectory, file),
)));

console.log(`Production storefront built in ${outputDirectory}.`);
