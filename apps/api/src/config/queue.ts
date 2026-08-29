import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Queue, Worker } from "bullmq";
import { env } from "./env.js";

declare module "fastify" {
  interface FastifyInstance {
    queues: Map<string, Queue>;
  }
}

function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: {
      host: new URL(env.REDIS_URL).hostname,
      port: Number(new URL(env.REDIS_URL).port) || 6379,
    },
  });
}

function createWorker(
  name: string,
  processor: (job: { id?: string; name: string; data: unknown }) => Promise<void>,
  app: FastifyInstance,
): Worker {
  const worker = new Worker(name, processor, {
    connection: {
      host: new URL(env.REDIS_URL).hostname,
      port: Number(new URL(env.REDIS_URL).port) || 6379,
    },
  });

  worker.on("completed", (job) => {
    app.log.debug({ jobId: job?.id, queue: name }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    app.log.error({ jobId: job?.id, queue: name, err }, "Job failed");
  });

  return worker;
}

async function queuePlugin(app: FastifyInstance) {
  const queues = new Map<string, Queue>();
  const workers: Worker[] = [];

  const testQueue = createQueue("test-ping");
  queues.set("test-ping", testQueue);

  const testWorker = createWorker(
    "test-ping",
    async (job) => {
      app.log.info({ jobId: job.id, data: job.data }, "test-ping job processed");
    },
    app,
  );
  workers.push(testWorker);

  app.decorate("queues", queues);

  app.log.info("BullMQ queue infrastructure ready (test-ping worker active)");

  app.addHook("onClose", async () => {
    for (const worker of workers) {
      await worker.close();
    }
    for (const queue of queues.values()) {
      await queue.close();
    }
  });
}

export const queuePlugin_ = fp(queuePlugin, {
  name: "queue",
  dependencies: ["redis"],
});
