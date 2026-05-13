/**
 * Patches nativewind@2.x styled-component.js to remove the React.useMemo hook call.
 *
 * Root cause: NativeWind 2.x's StyledComponent HOC calls React.useMemo inside a
 * forwardRef callback. With React Native 0.81+ (New Architecture / Fabric), the
 * Fabric renderer has React's internals bundled internally. This means Fabric sets
 * ReactCurrentDispatcher.current on its own bundled React copy, not on the standalone
 * react package that NativeWind imports. So when NativeWind's StyledComponent calls
 * react_1.default.useMemo(), the dispatcher is null → "Cannot read property 'useMemo'
 * of null" / "Invalid hook call".
 *
 * Fix: Replace the useMemo(() => styled(component), [component]) call with a
 * module-level Map cache. styled(component) is a pure function; caching globally
 * is semantically equivalent and eliminates the React hook dependency entirely.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bunStoreDir = path.join(repoRoot, "node_modules", ".bun");

const ALREADY_PATCHED_MARKER = "_styledCache";

const PATCH_NEEDLE = "react_1.default.useMemo";

const PATCH_PREFIX = `const _styledCache = new Map();
function _getStyledComponent(c) {
    if (!_styledCache.has(c)) _styledCache.set(c, (0, styled_1.styled)(c));
    return _styledCache.get(c);
}
`;

function patchFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");

  if (source.includes(ALREADY_PATCHED_MARKER)) {
    return false;
  }

  if (!source.includes(PATCH_NEEDLE)) {
    return false;
  }

  // Replace the full StyledComponent export that uses useMemo
  let patched = source.replace(
    /exports\.StyledComponent = react_1\.default\.forwardRef\(\(\{ component, \.\.\.options \}, ref\) => \{[\s\S]*?const Component = react_1\.default\.useMemo\([^)]+\[[^\]]*\]\);[\s\S]*?\}\);/,
    PATCH_PREFIX +
      `exports.StyledComponent = react_1.default.forwardRef(({ component, ...options }, ref) => {
    const Component = _getStyledComponent(component);
    return ((0, jsx_runtime_1.jsx)(Component, { ...options, ref: ref }));
});`,
  );

  if (patched === source) {
    // Fallback: simpler single-line replacement for slightly different formatting
    patched = source.replace(
      /const Component = react_1\.default\.useMemo\(\(\) => \(0, styled_1\.styled\)\(component\), \[component\]\);/,
      "const Component = _getStyledComponent(component);",
    );

    if (patched === source) {
      console.warn(`[nativewind-patch] Pattern not matched in: ${filePath}`);
      return false;
    }

    // Inject the helper before the StyledComponent export
    patched = patched.replace(
      "exports.StyledComponent = react_1.default.forwardRef(",
      PATCH_PREFIX + "exports.StyledComponent = react_1.default.forwardRef(",
    );
  }

  fs.writeFileSync(filePath, patched, "utf8");
  return true;
}

function main() {
  if (!fs.existsSync(bunStoreDir)) {
    console.log("[nativewind-patch] Bun store not found, skipping.");
    return;
  }

  const entries = fs.readdirSync(bunStoreDir, { withFileTypes: true });
  const targets = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("nativewind@"))
    .map((entry) =>
      path.join(
        bunStoreDir,
        entry.name,
        "node_modules",
        "nativewind",
        "dist",
        "styled-component.js",
      ),
    )
    .filter((targetPath) => fs.existsSync(targetPath));

  if (!targets.length) {
    console.log("[nativewind-patch] No nativewind targets found, skipping.");
    return;
  }

  let patched = 0;
  for (const target of targets) {
    if (patchFile(target)) {
      console.log(`[nativewind-patch] Patched: ${path.relative(repoRoot, target)}`);
      patched++;
    }
  }

  if (patched === 0) {
    console.log("[nativewind-patch] No changes needed (already patched or pattern not found).");
  }
}

main();
