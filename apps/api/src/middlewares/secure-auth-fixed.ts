// Backward-compat shim: keep old import paths working.
export {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requirePermission,
} from './secure-auth';

export { authMiddleware as default } from './secure-auth';

