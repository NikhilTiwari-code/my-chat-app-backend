import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import {
  addParticipantsHandler,
  createConversationHandler,
  deleteMessageHandler,
  getConversationHandler,
  listConversationsHandler,
  listMessagesHandler,
  listMediaHandler,
  markConversationReadHandler,
  removeParticipantHandler,
  searchMessagesHandler,
  sendMessageHandler,
  updateMessageStatusHandler
} from "./chats.controller";

export const chatsRouter = Router();

chatsRouter.use(authMiddleware);

chatsRouter.post("/", createConversationHandler);
chatsRouter.get("/", listConversationsHandler);
chatsRouter.get("/:id", getConversationHandler);
chatsRouter.get("/:id/messages", listMessagesHandler);
chatsRouter.get("/:id/search", searchMessagesHandler);
chatsRouter.get("/:id/media", listMediaHandler);
chatsRouter.post("/:id/messages", sendMessageHandler);
chatsRouter.post("/:id/messages/:messageId/status", updateMessageStatusHandler);
chatsRouter.delete("/:id/messages/:messageId", deleteMessageHandler);
chatsRouter.post("/:id/read", markConversationReadHandler);
chatsRouter.post("/:id/participants", addParticipantsHandler);
chatsRouter.delete("/:id/participants/:userId", removeParticipantHandler);
