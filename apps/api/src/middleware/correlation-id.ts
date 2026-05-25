import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const CORRELATION_HEADER = "x-correlation-id";

export const correlationIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.headers[CORRELATION_HEADER];
  const correlationId =
    typeof incoming === "string" && incoming.trim() ? incoming.trim() : randomUUID();

  req.headers[CORRELATION_HEADER] = correlationId;
  res.setHeader(CORRELATION_HEADER, correlationId);
  next();
};
