import Fastify from "fastify";
import cors from "@fastify/cors";
import { APP_NAME, VEXLYX_VERSION } from "@vexlyx/shared";
import { env } from "./config/env.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { healthRoutes } from "./modules/health/routes.js";

/**
 * Creates and configures the Fastify application instance.
 * Registers all plugins (CORS, error handler) and route modules.
 * @returns Configured Fastify instance ready to listen
 */
async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      // Pretty-print logs in development for readability
      ...(env.NODE_ENV !== "production" && {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(errorHandlerPlugin);

  await app.register(healthRoutes, { prefix: "/api/health" });

  return app;
}

/**
 * Starts the Fastify server and sets up graceful shutdown handlers.
 * On SIGINT/SIGTERM, the server finishes in-flight requests before exiting.
 */
async function start() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully…`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      `${APP_NAME} API v${VEXLYX_VERSION} listening on http://${env.HOST}:${env.PORT}`,
    );
  } catch (err) {
    app.log.error(err, "Failed to start server");
    process.exit(1);
  }
}

void start();
