import { HttpError } from "../utils/httpError.js";

/** Converts expected errors to safe JSON and hides internal stack details. */
export function errorHandler(error, request, response, _next) {
  if (response.headersSent) {
    return;
  }

  const reportedStatus = Number(error.status || error.statusCode);
  const status = error instanceof HttpError
    ? error.status
    : reportedStatus >= 400 && reportedStatus < 500
      ? reportedStatus
      : 500;
  if (status >= 500) {
    console.error(`[server] ${request.method} ${request.originalUrl}`, error);
  }
  response.status(status).json({
    error: status >= 500 ? "Внутренняя ошибка сервера." : error.message,
  });
}
