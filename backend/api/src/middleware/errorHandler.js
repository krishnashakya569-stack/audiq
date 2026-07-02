import { logger } from "../config/logger.js";

export function errorHandler(err, req, res, next) {

  logger.error({
    url: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    message: err.message,
  });

}