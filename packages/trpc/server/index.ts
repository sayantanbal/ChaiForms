import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { responsesRouter } from "./routes/responses/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  responses: responsesRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
export {
  createCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  csrfCookieOptions,
  assertCsrf,
} from "./utils/csrf";
