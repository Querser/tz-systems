export const sessionCookieName = "portfolio_admin_session";
export const entryCookieName = "portfolio_admin_entry";

/** Returns shared cookie flags with production-only HTTPS enforcement. */
export function cookieOptions(env, maxAge) {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: env.isProduction,
    path: "/",
    maxAge,
  };
}

/** Applies restrictive browser security headers without external middleware. */
export function applySecurityHeaders(_request, response, next) {
  response.set({
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  });
  next();
}
