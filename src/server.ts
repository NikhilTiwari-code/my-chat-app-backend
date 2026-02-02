import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { initRealtimeGateway } from "./modules/realtime/realtime.gateway";
import { startQueueConsumer } from "./modules/queue/queue.consumer";
import { prisma } from "./config/prisma";

const app = createApp();
const server = http.createServer(app);

initRealtimeGateway(server);
if (env.queueEnabled && env.rabbitmqUrl) {
  startQueueConsumer().catch((error) => {
    logger.error({ error }, "Queue consumer failed to start");
  });
} else {
  logger.warn("Queue consumer disabled (RabbitMQ not configured)");
}

prisma
  .$connect()
  .then(() => logger.info("Prisma connected"))
  .catch((error) => logger.error({ error }, "Prisma connection failed"));

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled Rejection");
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught Exception");
  process.exit(1);
});

server.listen(env.port, "0.0.0.0", () => {
  logger.info(`Server running on port ${env.port}`);
  logger.info(`Listening on http://0.0.0.0:${env.port}`);
});
