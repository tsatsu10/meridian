/**
 * Vite plugin to fix ReactIs redeclaration errors
 * Addresses the "Identifier 'ReactIs' has already been declared" error
 */

import type { Plugin } from 'vite';

export function reactIsFix(): Plugin {
  return {
    name: 'react-is-fix',
    enforce: 'pre',
    resolveId(id) {
      // Redirect react-is imports to use a single source
      if (id === 'react-is') {
        return '\0react-is-virtual';
      }
      return null;
    },
    load(id) {
      if (id === '\0react-is-virtual') {
        return `
          import { Fragment, isValidElement } from 'react';
          
          export function isFragment(object) {
            return object && object.type === Fragment;
          }
          
          export function isElement(object) {
            return isValidElement(object);
          }
          
          export function isValidElementType(type) {
            return typeof type === 'string' || 
                   typeof type === 'function' || 
                   (typeof type === 'object' && type != null);
          }
          
          export default {
            isFragment,
            isElement,
            isValidElementType
          };
        `;
      }
      return null;
    },
    transform(code, id) {
      // Fix react-markdown's ReactIs import to prevent conflicts
      if (id.includes('react-markdown') && id.includes('ast-to-react.js')) {
        return code.replace(
          /import ReactIs from 'react-is'/g,
          'import * as ReactIs from "react-is"'
        );
      }
      return null;
    }
  };
}