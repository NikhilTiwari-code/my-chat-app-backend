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

server.listen(env.port, "0.0.0.0", () => {
  logger.info(`Server running on port ${env.port}`);
});
