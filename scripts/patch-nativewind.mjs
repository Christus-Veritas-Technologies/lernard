/**
 * Patches nativewind@2.x for React Native Fabric + React 19 compatibility.
 *
 * NativeWind's runtime styled wrappers call hooks through the standalone "react" package.
 * Under Fabric, dispatcher state is owned by renderer-bundled React internals, so these
 * calls can resolve to a null dispatcher and crash with "Invalid hook call".
 *
 * We run NativeWind in transformOnly mode, so className->style work is already done at
 * Babel compile time. Runtime styled processing is unnecessary.
 *
 * This patch applies two safe transforms:
 * 1) styled-component.js: replace useMemo with a module-level cache.
 * 2) styled/index.js: replace Styled function body with hook-free passthrough.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bunStoreDir = path.join(repoRoot, "node_modules", ".bun");

const STYLED_COMPONENT_PATCH_MARKER = "_styledCache";
const STYLED_COMPONENT_NEEDLE = "react_1.default.useMemo";
const STYLED_INDEX_PATCH_MARKER = "nativewind-transformOnly-passthrough";

const STYLED_COMPONENT_HELPER = `const _styledCache = new Map();
function _getStyledComponent(c) {
    if (!_styledCache.has(c)) _styledCache.set(c, (0, styled_1.styled)(c));
    return _styledCache.get(c);
}
`;

const STYLED_INDEX_PASSTHROUGH_FUNCTION = `function Styled({ className: propClassName = "", tw: twClassName, style: inlineStyles, children: componentChildren, ...componentProps }, ref) {
  // nativewind-transformOnly-passthrough
  // transformOnly mode already compiled className to style.
  // Avoid NativeWind runtime hook calls (incompatible with Fabric dispatcher ownership).
  return (0, react_1.createElement)(Component, {
    ...componentProps,
    style: inlineStyles,
    children: componentChildren,
    ref,
  });
}`;

function patchStyledComponentFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");

  if (source.includes(STYLED_COMPONENT_PATCH_MARKER)) {
    return false;
  }

  if (!source.includes(STYLED_COMPONENT_NEEDLE)) {
    return false;
  }

  // Replace the full StyledComponent export that uses useMemo
  let patched = source.replace(
    /exports\.StyledComponent = react_1\.default\.forwardRef\(\(\{ component, \.\.\.options \}, ref\) => \{[\s\S]*?const Component = react_1\.default\.useMemo\([^)]+\[[^\]]*\]\);[\s\S]*?\}\);/,
    STYLED_COMPONENT_HELPER +
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
      STYLED_COMPONENT_HELPER + "exports.StyledComponent = react_1.default.forwardRef(",
    );
  }

  fs.writeFileSync(filePath, patched, "utf8");
  return true;
}

function patchStyledIndexFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");

  const functionStart = source.indexOf("function Styled(");
  if (functionStart === -1) {
    console.warn(`[nativewind-patch] Styled function not found in: ${filePath}`);
    return false;
  }

  const functionEndAnchor = source.indexOf("    if (typeof Component !== \"string\") {", functionStart);
  if (functionEndAnchor === -1) {
    console.warn(`[nativewind-patch] Styled function end anchor not found in: ${filePath}`);
    return false;
  }

  const originalFunctionBlock = source.slice(functionStart, functionEndAnchor);
  const replacementFunctionBlock = `    ${STYLED_INDEX_PASSTHROUGH_FUNCTION}\n`;

  if (originalFunctionBlock === replacementFunctionBlock || source.includes(STYLED_INDEX_PATCH_MARKER)) {
    // If already patched correctly, do nothing.
    if (originalFunctionBlock === replacementFunctionBlock) {
      return false;
    }
  }

  const patched =
    source.slice(0, functionStart) +
    replacementFunctionBlock +
    source.slice(functionEndAnchor);

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
    .map((entry) => ({
      styledComponent: path.join(
        bunStoreDir,
        entry.name,
        "node_modules",
        "nativewind",
        "dist",
        "styled-component.js",
      ),
      styledIndex: path.join(
        bunStoreDir,
        entry.name,
        "node_modules",
        "nativewind",
        "dist",
        "styled",
        "index.js",
      ),
    }))
    .filter((target) => fs.existsSync(target.styledComponent) || fs.existsSync(target.styledIndex));

  if (!targets.length) {
    console.log("[nativewind-patch] No nativewind targets found, skipping.");
    return;
  }

  let patched = 0;
  for (const target of targets) {
    if (fs.existsSync(target.styledComponent) && patchStyledComponentFile(target.styledComponent)) {
      console.log(`[nativewind-patch] Patched: ${path.relative(repoRoot, target.styledComponent)}`);
      patched++;
    }

    if (fs.existsSync(target.styledIndex) && patchStyledIndexFile(target.styledIndex)) {
      console.log(`[nativewind-patch] Patched: ${path.relative(repoRoot, target.styledIndex)}`);
      patched++;
    }
  }

  if (patched === 0) {
    console.log("[nativewind-patch] No changes needed (already patched or pattern not found).");
  }
}

main();
