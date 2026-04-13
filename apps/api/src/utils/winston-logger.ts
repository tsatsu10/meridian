/**
 * Backward-compat shim for legacy imports.
 * Canonical logger implementation lives in `utils/logger.ts`.
 */
import logger from './logger';

export const winstonLog = logger;
export const winstonLogger = logger;
export type Logger = typeof logger;
export default winstonLog;


