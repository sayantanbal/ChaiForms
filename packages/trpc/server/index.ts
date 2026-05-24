import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { formsRouter } from "./routes/forms/route";
import { responsesRouter } from "./routes/responses/route";
import { analyticsRouter } from "./routes/analytics/route";
import { exploreRouter } from "./routes/explore/route";
import { adminRouter } from "./routes/admin/route";
import { workspacesRouter } from "./routes/workspaces/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  forms: formsRouter,
  responses: responsesRouter,
  analytics: analyticsRouter,
  explore: exploreRouter,
  admin: adminRouter,
  workspaces: workspacesRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../shared/csrf";
export { createCsrfToken, csrfCookieOptions, assertCsrf } from "./utils/csrf";
export {
  broadcastDelta,
  subscribeToChannel,
  unsubscribeFromChannel,
} from "./utils/analytics-broadcast";
