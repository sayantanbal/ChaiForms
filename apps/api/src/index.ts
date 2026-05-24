import http from "node:http";
import { logger } from "@repo/logger";
import { app as expressApplication } from "./server";
import { setupWebSocketServer } from "./websocket";
import { purgeExpiredForms } from "./cron/purge-deleted-forms";

import { env } from "./env";

const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function init() {
  try {
    const server = http.createServer(expressApplication);
    setupWebSocketServer(server);

    const PORT: number = env.PORT ? +env.PORT : 8000;
    server.listen(PORT, () => {
      logger.info(`http server is running on PORT ${PORT}`);
    });

    void purgeExpiredForms().catch((err) => {
      logger.error("Initial purge of deleted forms failed", { err });
    });

    setInterval(() => {
      void purgeExpiredForms().catch((err) => {
        logger.error("Scheduled purge of deleted forms failed", { err });
      });
    }, PURGE_INTERVAL_MS);
  } catch (err) {
    logger.error(`Error creating http server`, { err });
    process.exit(1);
  }
}

init();
