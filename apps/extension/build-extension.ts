import { build } from "esbuild"

await build({
  entryPoints: ["index.ts"],
  outfile: "dist/background.js",
  bundle: true,
  platform: "browser",
  target: "es2022",
  format: "esm",
})

await build({
  entryPoints: ["content.ts"],
  outfile: "dist/content.js",
  bundle: true,
  platform: "browser",
  target: "es2022",
  format: "esm",
})

await build({
  entryPoints: ["provider.ts"],
  outfile: "dist/provider.js",
  bundle: true,
  platform: "browser",
  target: "es2022",
  format: "iife",
})

console.log("Extension build complete")
