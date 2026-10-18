// Bundles the social card function into api/og.js. Vercel only picks up the
// Edge runtime from a literal `export const config` in the file it deploys,
// which the bundler would rewrite, so it is written on top of the bundle.
import { execFileSync } from "child_process";
import { readFile, writeFile } from "fs/promises";

execFileSync("bun", ["build", "functions/og.ts", "--outfile", "api/og.js", "--target", "browser", "--external", "@vercel/og"], { stdio: "inherit" });
await writeFile("api/og.js", `export const config = { runtime: "edge" };\n\n${await readFile("api/og.js", "utf8")}`);
