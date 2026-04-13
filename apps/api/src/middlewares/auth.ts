import { createMiddleware } from "hono/factory";
import { authMiddleware } from "./secure-auth";

const strictAuth = authMiddleware();

// Canonical auth middleware used across routes.
export const auth = createMiddleware(async (c, next) => strictAuth(c, next));

// Backward-compatible alias for older imports.
export const authenticateToken = auth;

