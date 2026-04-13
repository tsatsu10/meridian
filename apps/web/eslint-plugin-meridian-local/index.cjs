/**
 * Local ESLint plugin: enforce that API_BASE_URL is only supplied via canonical modules.
 * Prevents regressions like importing API_URL but using API_BASE_URL (undefined at runtime).
 */
"use strict";

/** @param {string | undefined} src */
function isAllowedImportSource(src) {
  if (typeof src !== "string") return false;
  if (src === "@/constants/urls" || src === "@/lib/api-url") return true;
  if (src.endsWith("/constants/urls") || src.endsWith("/lib/api-url")) return true;
  return false;
}

/** @param {string} filePath forward slashes */
function isCanonicalUrlsDefinitionFile(filePath) {
  return (
    filePath.endsWith("/src/constants/urls.ts") ||
    filePath.endsWith("/src/constants/urls.tsx")
  );
}

/** @type {import('eslint').Rule.RuleModule} */
const restrictApiBaseUrl = {
  meta: {
    type: "problem",
    docs: {
      description:
        "API_BASE_URL must be imported only from @/constants/urls or @/lib/api-url (or relative paths to those modules).",
    },
    schema: [],
    messages: {
      badImport:
        'Import API_BASE_URL only from @/constants/urls or @/lib/api-url (got "{{source}}").',
      unresolved:
        "API_BASE_URL is not bound to an import from @/constants/urls or @/lib/api-url.",
      badDefinition:
        "Do not define API_BASE_URL locally; import it from @/constants/urls or @/lib/api-url.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        for (const spec of node.specifiers) {
          if (spec.type !== "ImportSpecifier") continue;
          if (spec.imported.type !== "Identifier" || spec.imported.name !== "API_BASE_URL") {
            continue;
          }
          const src = node.source && node.source.value;
          if (!isAllowedImportSource(src)) {
            context.report({
              node: spec,
              messageId: "badImport",
              data: { source: String(src) },
            });
          }
        }
      },
      "Program:exit"() {
        const sourceCode = context.getSourceCode();
        const sm = sourceCode.scopeManager;
        if (!sm) return;

        const rawPath = context.getFilename().replace(/\\/g, "/");

        for (const scope of sm.scopes) {
          for (const ref of scope.references) {
            if (ref.identifier.name !== "API_BASE_URL") continue;

            const resolved = ref.resolved;
            if (!resolved) {
              context.report({ node: ref.identifier, messageId: "unresolved" });
              continue;
            }

            const def = resolved.defs[0];
            if (!def) continue;

            if (def.type === "ImportBinding") {
              const parent = def.parent;
              if (parent.type === "ImportDeclaration") {
                const src = parent.source && parent.source.value;
                if (!isAllowedImportSource(src)) {
                  context.report({
                    node: ref.identifier,
                    messageId: "badImport",
                    data: { source: String(src) },
                  });
                }
              }
              continue;
            }

            if (def.type === "Variable") {
              if (isCanonicalUrlsDefinitionFile(rawPath)) {
                continue;
              }
              context.report({ node: ref.identifier, messageId: "badDefinition" });
            }
          }
        }
      },
    };
  },
};

module.exports = {
  rules: {
    "restrict-api-base-url": restrictApiBaseUrl,
  },
};
