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
startQueueConsumer().catch((error) => {
  logger.error({ error }, "Queue consumer failed to start");
});

prisma
  .$connect()
  .then(() => logger.info("Prisma connected"))
  .catch((error) => logger.error({ error }, "Prisma connection failed"));

server.listen(env.port, () => {
  logger.info(`Server running on port ${env.port}`);
});
