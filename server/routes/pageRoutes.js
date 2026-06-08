import express from "express";
import path from "node:path";
import { env, projectRoot } from "../config/env.js";
import { cookieOptions, entryCookieName } from "../config/security.js";
import { authService } from "../services/authService.js";

const adminDirectory = path.join(projectRoot, "public", "admin");
export const pageRouter = express.Router();

pageRouter.get(["/admin/login", "/admin/login.html"], (request, response) => {
  if (authService.resolveSession(request)) {
    response.redirect(302, "/admin/dashboard.html");
    return;
  }
  if (!authService.hasValidEntry(request)) {
    response.clearCookie(entryCookieName, cookieOptions(env, 0));
    response.redirect(302, "/#hero");
    return;
  }
  response.sendFile(path.join(adminDirectory, "login.html"));
});

pageRouter.get(["/admin/dashboard", "/admin/dashboard.html"], (request, response) => {
  if (!authService.resolveSession(request)) {
    response.redirect(302, "/#hero");
    return;
  }
  response.sendFile(path.join(adminDirectory, "dashboard.html"));
});

pageRouter.get("/admin", (_request, response) => {
  response.redirect(302, "/");
});
