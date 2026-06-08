/** Blocks browser state-changing requests explicitly marked as cross-site. */
export function requireSameOrigin(request, response, next) {
  const fetchSite = request.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    response.status(403).json({ error: "Cross-site запрос отклонён." });
    return;
  }

  const origin = request.get("origin");
  if (origin) {
    const expectedOrigin = `${request.protocol}://${request.get("host")}`;
    if (origin !== expectedOrigin) {
      response.status(403).json({ error: "Источник запроса не разрешён." });
      return;
    }
  }
  next();
}
