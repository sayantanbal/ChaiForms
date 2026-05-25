import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { logger } from "@repo/logger";
import cors from "cors";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";
import {
  serverRouter,
  createContext,
  createCsrfToken,
  CSRF_COOKIE_NAME,
  csrfCookieOptions,
} from "@repo/trpc/server";

import { env } from "./env";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "ChaiForms API",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

const isProd = env.NODE_ENV === "production";
const configuredOrigins = env.WEB_ORIGIN.split(",").map((origin) => origin.trim());
const allowAnyOrigin = configuredOrigins.includes("*");
const allowedOrigins = new Set(
  configuredOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin)),
);

function normalizeOrigin(origin: string): string | null {
  const trimmed = origin.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

app.use(
  cors({
    origin(origin, callback) {
      const requestOrigin = origin ? normalizeOrigin(origin) : null;
      if (allowAnyOrigin || !requestOrigin || allowedOrigins.has(requestOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  }),
);

app.use(cookieParser());
app.use(express.json());

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? env.BASE_URL;
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", apiUrl],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

app.get("/", (_req, res) => {
  return res.json({ message: "ChaiForms API is running" });
});

app.get("/health", (_req, res) => {
  return res.json({ message: "ChaiForms API is healthy", healthy: true });
});

/** Issue CSRF token cookie for double-submit protection on tRPC mutations. */
app.get("/csrf", (_req, res) => {
  const token = createCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions(isProd));
  return res.json({ token });
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (_req, res) => {
  return res.json(openApiDocument);
});

import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per `window` (here, per 1 minute)
  standardHeaders: true,
  legacyHeaders: false,
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiLimiter, apiReference({ url: "/openapi.json" }));

app.use(
  "/api",
  apiLimiter,
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
