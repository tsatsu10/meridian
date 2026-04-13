// Lodash shim to fix import issues
// This ensures all lodash functions are available with proper exports

// Import the entire lodash library
import * as _ from 'lodash';

// Re-export individual functions with default exports
export { default as get } from 'lodash/get';
export { default as isString } from 'lodash/isString';
export { default as isNumber } from 'lodash/isNumber';
export { default as isNaN } from 'lodash/isNaN';
export { default as isNil } from 'lodash/isNil';
export { default as isFunction } from 'lodash/isFunction';
export { default as isObject } from 'lodash/isObject';
export { default as isEqual } from 'lodash/isEqual';
export { default as max } from 'lodash/max';
export { default as min } from 'lodash/min';
export { default as range } from 'lodash/range';
export { default as find } from 'lodash/find';
export { default as first } from 'lodash/first';
export { default as last } from 'lodash/last';
export { default as every } from 'lodash/every';
export { default as some } from 'lodash/some';
export { default as flatMap } from 'lodash/flatMap';
export { default as isBoolean } from 'lodash/isBoolean';
export { default as maxBy } from 'lodash/maxBy';
export { default as minBy } from 'lodash/minBy';
export { default as sortBy } from 'lodash/sortBy';
export { default as uniqBy } from 'lodash/uniqBy';
export { default as upperFirst } from 'lodash/upperFirst';
export { default as mapValues } from 'lodash/mapValues';
export { default as omit } from 'lodash/omit';
export { default as sumBy } from 'lodash/sumBy';
export { default as throttle } from 'lodash/throttle';
export { default as memoize } from 'lodash/memoize';
export { default as isPlainObject } from 'lodash/isPlainObject';

// Export the entire lodash as default
export default _;