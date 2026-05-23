import express from "express";
import cookieParser from "cookie-parser";
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

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());

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

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.use(
  "/api",
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
