#!/usr/bin/env node
// One-click publish for the Voyager observatory (owner runs this; 15 Netlify credits per run)
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
if (!existsSync(join(here, "dist", "index.html"))) { console.error("dist/ missing in " + here + ": unzip deploy/voyager-latest.zip into dist/ first"); process.exit(1); }
console.log("Publishing " + join(here, "dist") + " to https://voyagerterminal.space (Netlify site voyager-observatory) ...");
execSync("netlify deploy --prod --dir dist --no-build", { cwd: here, stdio: "inherit", shell: true });
