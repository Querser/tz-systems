const attempts = new Map();
const windowMs = 15 * 60 * 1000;
const blockMs = 15 * 60 * 1000;
const maxFailures = 5;

function getRecord(key) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.startedAt > windowMs) {
    const freshRecord = { failures: 0, startedAt: now, blockedUntil: 0 };
    attempts.set(key, freshRecord);
    return freshRecord;
  }
  return record;
}

export const loginRateLimit = {
  /** Stops repeated password guesses for the current network address. */
  check(request, response, next) {
    const record = getRecord(request.ip);
    if (record.blockedUntil > Date.now()) {
      response.set("Retry-After", String(Math.ceil((record.blockedUntil - Date.now()) / 1000)));
      response.status(429).json({ error: "Слишком много попыток. Повторите позже." });
      return;
    }
    next();
  },

  /** Records one failed password check and starts a temporary block if needed. */
  registerFailure(key) {
    const record = getRecord(key);
    record.failures += 1;
    if (record.failures >= maxFailures) {
      record.blockedUntil = Date.now() + blockMs;
    }
  },

  /** Clears accumulated failures after a successful authentication. */
  reset(key) {
    attempts.delete(key);
  },
};
