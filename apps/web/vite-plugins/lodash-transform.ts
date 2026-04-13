import type { Plugin } from 'vite';

/**
 * Vite plugin to transform lodash and react-is imports
 * This fixes module resolution issues with recharts and other libraries
 */
export function lodashTransformPlugin(): Plugin {
  return {
    name: 'lodash-transform',
    transform(code: string, id: string) {
      // Skip if not a JS/TS file
      if (!id.match(/\.(js|ts|jsx|tsx)$/)) {
        return null;
      }

      // Transform lodash imports to lodash-es
      let transformedCode = code;
      
      // Replace individual lodash function imports
      transformedCode = transformedCode.replace(
        /import\s+(\w+)\s+from\s+['"]lodash\/(\w+)['"];?/g,
        "import { $2 as $1 } from 'lodash-es';"
      );
      
      // Replace default lodash imports
      transformedCode = transformedCode.replace(
        /import\s+(\w+)\s+from\s+['"]lodash['"];?/g,
        "import * as $1 from 'lodash-es';"
      );

      // Also handle require statements for CommonJS files
      transformedCode = transformedCode.replace(
        /var\s+(\w+)\s+=\s+_interopRequireDefault\(require\(["']lodash\/(\w+)["']\)\);?/g,
        "var $1 = { default: require('lodash-es').$2 };"
      );

      transformedCode = transformedCode.replace(
        /require\(["']lodash\/(\w+)["']\)/g,
        "require('lodash-es').$1"
      );

      // Handle react-is ES6 imports - convert to proper ES6 module syntax
      transformedCode = transformedCode.replace(
        /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]react-is['"];?/g,
        (match, imports) => {
          // Split multiple imports and clean them
          const importList = imports.split(',').map((imp: string) => imp.trim());
          const namedImports = importList.join(', ');
          return `import * as ReactIs from 'react-is'; const { ${namedImports} } = ReactIs;`;
        }
      );

      // Handle individual react-is imports
      transformedCode = transformedCode.replace(
        /import\s+(\w+)\s+from\s+['"]react-is['"];?/g,
        "import * as ReactIs from 'react-is'; const $1 = ReactIs.$1;"
      );

      // Return transformed code if changes were made
      if (transformedCode !== code) {
        return {
          code: transformedCode,
          map: null
        };
      }
      
      return null;
    }
  };
}