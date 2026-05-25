import http from "node:http";
import { logger } from "@repo/logger";
import { app as expressApplication } from "./server";
import { setupWebSocketServer } from "./websocket";
import { purgeExpiredForms } from "./cron/purge-deleted-forms";
import { refreshAnalyticsMaterializedViews } from "./cron/refresh-analytics";
import { createResponsePartitions } from "./cron/create-response-partitions";
import { startHealthCheck } from "./monitoring/health-check";

import { env } from "./env";

const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const PARTITION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function init() {
  try {
    const server = http.createServer(expressApplication);
    setupWebSocketServer(server);

    const PORT: number = env.PORT ? +env.PORT : 8000;
    server.listen(PORT, "0.0.0.0", () => {
      logger.info(`http server is running on PORT ${PORT}`);
      startHealthCheck();
    });

    void purgeExpiredForms().catch((err) => {
      logger.error("Initial purge of deleted forms failed", { err });
    });

    setInterval(() => {
      void purgeExpiredForms().catch((err) => {
        logger.error("Scheduled purge of deleted forms failed", { err });
      });
    }, PURGE_INTERVAL_MS);

    void refreshAnalyticsMaterializedViews().catch((err) => {
      logger.error("Initial analytics materialized view refresh failed", { err });
    });

    setInterval(() => {
      void refreshAnalyticsMaterializedViews().catch((err) => {
        logger.error("Scheduled analytics view refresh failed", { err });
      });
    }, ANALYTICS_REFRESH_INTERVAL_MS);

    void createResponsePartitions().catch((err) => {
      logger.error("Initial response partition creation failed", { err });
    });

    setInterval(() => {
      void createResponsePartitions().catch((err) => {
        logger.error("Scheduled response partition creation failed", { err });
      });
    }, PARTITION_CHECK_INTERVAL_MS);
  } catch (err) {
    logger.error(`Error creating http server`, { err });
    process.exit(1);
  }
}

init();
