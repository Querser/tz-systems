import { secretsMatch } from "../utils/tokens.js";

/** Requires the session-bound CSRF token on every protected state change. */
export function requireCsrf(request, response, next) {
  if (!secretsMatch(request.get("x-csrf-token"), request.adminSession?.csrf_token)) {
    response.status(403).json({ error: "Запрос отклонён защитой CSRF." });
    return;
  }
  next();
}
