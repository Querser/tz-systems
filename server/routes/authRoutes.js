import express from "express";
import { env } from "../config/env.js";
import {
  cookieOptions,
  entryCookieName,
  sessionCookieName,
} from "../config/security.js";
import { auditRepository } from "../repositories/auditRepository.js";
import { requireAdmin } from "../middleware/auth.js";
import { requireCsrf } from "../middleware/csrf.js";
import { loginRateLimit } from "../middleware/rateLimit.js";
import { authService } from "../services/authService.js";
import { projectUpload } from "../config/upload.js";

export const authRouter = express.Router();

authRouter.post("/entry", (request, response) => {
  response.cookie(
    entryCookieName,
    authService.createEntryToken(),
    cookieOptions(env, env.entryDurationMs)
  );
  response.status(204).end();
});

authRouter.post("/login", loginRateLimit.check, async (request, response, next) => {
  try {
    if (!authService.hasValidEntry(request)) {
      response.status(404).json({ error: "Страница входа недоступна." });
      return;
    }

    const admin = await authService.verifyPassword(request.body?.password);
    if (!admin) {
      loginRateLimit.registerFailure(request.ip);
      response.status(401).json({ error: "Неверные данные для входа." });
      return;
    }

    loginRateLimit.reset(request.ip);
    const session = authService.createSession(admin.id);
    response.cookie(
      sessionCookieName,
      session.token,
      cookieOptions(env, env.sessionDurationMs)
    );
    response.clearCookie(entryCookieName, cookieOptions(env, 0));
    auditRepository.log(admin.id, "login");
    response.json({ csrfToken: session.csrfToken });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/session", requireAdmin, (request, response) => {
  response.json({
    authenticated: true,
    username: request.adminSession.username,
    csrfToken: request.adminSession.csrf_token,
    uploadLimits: {
      maxFiles: projectUpload.maxFiles,
      maxFileSize: projectUpload.maxFileSize,
      maxTotalSize: projectUpload.maxTotalSize,
    },
  });
});

authRouter.post("/logout", requireAdmin, requireCsrf, (request, response) => {
  auditRepository.log(request.adminSession.admin_id, "logout");
  authService.destroySession(request);
  response.clearCookie(sessionCookieName, cookieOptions(env, 0));
  response.status(204).end();
});
