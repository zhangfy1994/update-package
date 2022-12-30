import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

esbuild.build({
  entryPoints: [path.resolve(__dirname, "../src/index.ts")],
  format: "esm",
  outfile: "es/index.js",
  target: "esnext",
  platform: "node",
});
