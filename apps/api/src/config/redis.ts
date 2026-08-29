import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";
import { env } from "./env.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

async function redisPlugin(app: FastifyInstance) {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  redis.on("error", (err) => {
    app.log.error(err, "Redis connection error");
  });

  redis.on("connect", () => {
    app.log.info("Redis connected");
  });

  await redis.connect();

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    await redis.quit();
  });
}

export const redisClientPlugin = fp(redisPlugin, {
  name: "redis",
});
