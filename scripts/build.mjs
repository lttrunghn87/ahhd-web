import { cp, rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const indexFile = resolve(dist, "index.html");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, "public"), dist, { recursive: true });
for (const route of ["home", "settings"]) {
  const routeDir = resolve(dist, route);
  await mkdir(routeDir, { recursive: true });
  await cp(indexFile, resolve(routeDir, "index.html"));
}

console.log("Built static files to dist/");
