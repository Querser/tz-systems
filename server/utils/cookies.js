/** Parses a Cookie header without adding a global middleware dependency. */
export function parseCookies(request) {
  const cookieHeader = request.headers.cookie || "";

  return cookieHeader.split(";").reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex < 1) {
      return cookies;
    }

    const name = pair.slice(0, separatorIndex).trim();
    const rawValue = pair.slice(separatorIndex + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = "";
    }
    return cookies;
  }, {});
}
