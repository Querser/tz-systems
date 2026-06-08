import express from "express";
import { requireAdmin } from "../middleware/auth.js";
import { requireCsrf } from "../middleware/csrf.js";
import { auditRepository } from "../repositories/auditRepository.js";
import { projectService } from "../services/projectService.js";

export const projectRouter = express.Router();

projectRouter.get("/", (_request, response, next) => {
  try {
    response.json(projectService.list());
  } catch (error) {
    next(error);
  }
});

projectRouter.post("/", requireAdmin, requireCsrf, (request, response, next) => {
  try {
    const project = projectService.create(request.body);
    auditRepository.log(request.adminSession.admin_id, "project.create", project.id);
    response.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

projectRouter.put("/:id", requireAdmin, requireCsrf, (request, response, next) => {
  try {
    const project = projectService.update(request.params.id, request.body);
    auditRepository.log(request.adminSession.admin_id, "project.update", project.id);
    response.json(project);
  } catch (error) {
    next(error);
  }
});

projectRouter.delete("/:id", requireAdmin, requireCsrf, (request, response, next) => {
  try {
    const id = projectService.delete(request.params.id);
    auditRepository.log(request.adminSession.admin_id, "project.delete", id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});
