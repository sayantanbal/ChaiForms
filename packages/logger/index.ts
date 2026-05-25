import pino from "pino";
import { env } from "./env";

export interface LogContext {
  userId?: string;
  formId?: string;
  responseId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

class Logger {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: env.LOGGER_LEVEL ?? (env.NODE_ENV === "development" ? "debug" : "info"),
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(env.NODE_ENV === "production"
        ? {} // Use JSON in production
        : {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            },
          }),
    });
  }

  child(context: LogContext) {
    return this.logger.child(context);
  }

  info(message: string, context?: LogContext) {
    this.logger.info(context, message);
  }

  error(message: string, context?: LogContext & { error?: Error | unknown }) {
    this.logger.error(context, message);
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(context, message);
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(context, message);
  }
}

export const logger = new Logger();
