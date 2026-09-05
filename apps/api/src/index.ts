import Fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import { APP_NAME, VEXLYX_VERSION } from "@vexlyx/shared";
import { env } from "./config/env.js";
import { databasePlugin } from "./config/database.js";
import { redisClientPlugin } from "./config/redis.js";
import { queuePlugin_ } from "./config/queue.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { authSessionPlugin } from "./plugins/auth.js";
import { socketPlugin } from "./plugins/socket.js";
import { healthRoutes } from "./modules/health/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { projectRoutes } from "./modules/projects/routes.js";
import { gitRoutes } from "./modules/git/routes.js";
import { buildRoutes } from "./modules/build/routes.js";
import { deployRoutes } from "./modules/deploy/routes.js";
import { logRoutes } from "./modules/logs/routes.js";
import { envRoutes } from "./modules/env/routes.js";
import { wordpressRoutes } from "./modules/wordpress/routes.js";
import { dockerfileRoutes } from "./modules/dockerfile/routes.js";
import { databaseRoutes } from "./modules/databases/routes.js";
import { webhookRoutes } from "./modules/webhooks/routes.js";
import { domainRoutes } from "./modules/domains/routes.js";
import { mailRoutes } from "./modules/mail/routes.js";
import { mailboxRoutes } from "./modules/mailboxes/routes.js";


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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(formbody);
  await app.register(databasePlugin);
  await app.register(redisClientPlugin);
  await app.register(queuePlugin_);
  await app.register(errorHandlerPlugin);
  await app.register(authSessionPlugin);
  await app.register(socketPlugin);

  await app.register(healthRoutes, { prefix: "/api/health" });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(gitRoutes, { prefix: "/api/projects" });
  await app.register(buildRoutes, { prefix: "/api/projects" });
  await app.register(deployRoutes, { prefix: "/api/projects" });
  await app.register(logRoutes, { prefix: "/api/projects" });
  await app.register(envRoutes, { prefix: "/api/projects" });
  await app.register(wordpressRoutes, { prefix: "/api/projects" });
  await app.register(dockerfileRoutes, { prefix: "/api/projects" });
  await app.register(databaseRoutes, { prefix: "/api/databases" });
  await app.register(webhookRoutes, { prefix: "/api/webhooks" });
  await app.register(domainRoutes, { prefix: "/api/domains" });
  await app.register(mailRoutes, { prefix: "/api/mail" });
  await app.register(mailboxRoutes, { prefix: "/api/mailboxes" });

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
