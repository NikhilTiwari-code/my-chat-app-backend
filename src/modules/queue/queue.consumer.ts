import { consumeEvents } from "./queue.service";
import { emitToConversation, emitToUser } from "../realtime/realtime.gateway";
import { logger } from "../../config/logger";

export const startQueueConsumer = async () => {
  await consumeEvents(async (event) => {
    if (!event?.type) return;
    if (event.type === "message:new" || event.type === "message:deleted") {
      await emitToConversation(event.conversationId, event.type, event.payload ?? {});
    }
    if (event.type === "notification:new") {
      await emitToUser(event.userId, event.type, event.payload ?? {});
    }
  });
  logger.info("Queue consumer started");
};
