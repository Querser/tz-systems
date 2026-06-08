import { authService } from "../services/authService.js";

/** Requires a valid server-side session for protected API routes. */
export function requireAdmin(request, response, next) {
  const session = authService.resolveSession(request);
  if (!session) {
    response.status(401).json({ error: "Требуется авторизация." });
    return;
  }

  request.adminSession = session;
  next();
}
