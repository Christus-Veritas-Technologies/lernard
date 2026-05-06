import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bunStoreDir = path.join(repoRoot, "node_modules", ".bun");

function patchFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");

  if (source.includes('"key"in t&&delete t.key')) {
    return false;
  }

  const needle = "const t={...s};";
  if (!source.includes(needle)) {
    return false;
  }

  const patched = source.replace(needle, 'const t={...s};"key"in t&&delete t.key;');
  fs.writeFileSync(filePath, patched, "utf8");
  return true;
}

function main() {
  if (!fs.existsSync(bunStoreDir)) {
    console.log("[hugeicons-patch] Bun store not found, skipping.");
    return;
  }

  const entries = fs.readdirSync(bunStoreDir, { withFileTypes: true });
  const targets = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("hugeicons-react-native@"))
    .flatMap((entry) => [
      path.join(
        bunStoreDir,
        entry.name,
        "node_modules",
        "hugeicons-react-native",
        "dist",
        "esm",
        "create-hugeicon-component.js",
      ),
      path.join(
        bunStoreDir,
        entry.name,
        "node_modules",
        "hugeicons-react-native",
        "dist",
        "cjs",
        "create-hugeicon-component.js",
      ),
    ])
    .filter((targetPath) => fs.existsSync(targetPath));

  if (!targets.length) {
    console.log("[hugeicons-patch] No hugeicons-react-native targets found, skipping.");
    return;
  }

  let patchedCount = 0;
  for (const target of targets) {
    if (patchFile(target)) {
      patchedCount += 1;
      console.log(`[hugeicons-patch] patched ${target}`);
    }
  }

  if (!patchedCount) {
    console.log("[hugeicons-patch] Already patched or pattern not found.");
  }
}

main();
