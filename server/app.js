import express from "express";
import path from "node:path";
import { env, projectRoot } from "./config/env.js";
import { applySecurityHeaders } from "./config/security.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireSameOrigin } from "./middleware/sameOrigin.js";
import { authRouter } from "./routes/authRoutes.js";
import { pageRouter } from "./routes/pageRoutes.js";
import { projectRouter } from "./routes/projectRoutes.js";

/** Builds the HTTP application with protected pages registered before static files. */
export function createApp() {
  const app = express();
  const publicDirectory = path.join(projectRoot, "public");

  app.disable("x-powered-by");
  if (env.isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(applySecurityHeaders);
  app.use(express.json({ limit: "256kb", strict: true }));
  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.use("/api", requireSameOrigin);
  app.use(pageRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectRouter);
  app.use(
    "/admin",
    express.static(path.join(publicDirectory, "admin"), {
      dotfiles: "deny",
      index: false,
      fallthrough: true,
    })
  );
  app.use(
    express.static(publicDirectory, {
      dotfiles: "deny",
      index: "index.html",
      fallthrough: true,
    })
  );

  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "API-маршрут не найден." });
  });
  app.use((_request, response) => {
    response.status(404).sendFile(path.join(publicDirectory, "index.html"));
  });
  app.use(errorHandler);

  return app;
}
