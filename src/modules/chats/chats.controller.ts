import { Request, Response } from "express";
import {
  createConversationSchema,
  messageStatusSchema,
  participantsSchema,
  sendMessageSchema
} from "./chats.validation";
import {
  addParticipants,
  createConversation,
  getConversationById,
  listConversations,
  listMessages,
  markConversationRead,
  removeParticipant,
  sendMessage,
  updateMessageStatus,
  deleteMessage,
  listMedia,
  searchMessages
} from "./chats.service";
import { emitToConversation, emitToUser, emitToUsers } from "../realtime/realtime.gateway";
import { publishEvent } from "../queue/queue.service";
import { createNotification } from "../notifications/notifications.service";

export const createConversationHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const data = createConversationSchema.parse(req.body);
  const conversation = await createConversation(req.user.id, data.type, data.title, data.participantIds);
  return res.status(201).json({ conversation });
};

export const listConversationsHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const conversations = await listConversations(req.user.id);
  return res.json({ conversations });
};

export const sendMessageHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const data = sendMessageSchema.parse(req.body);
  const { message, participantIds } = await sendMessage(
    req.params.id,
    req.user.id,
    data.content,
    data.type ?? "TEXT",
    data.attachment
  );
  emitToUsers(participantIds, "message:new", { message });
  void publishEvent({
    type: "message:new",
    conversationId: req.params.id,
    payload: { message }
  });
  void (async () => {
    await Promise.all(
      participantIds
        .filter((id) => id !== req.user!.id)
        .map(async (id) => {
          const notification = await createNotification(id, "message", {
            conversationId: req.params.id,
            messageId: message.id,
            fromUser: message.sender
          });
          const notificationPublished = await publishEvent({
            type: "notification:new",
            userId: id,
            payload: { notification }
          });
          if (!notificationPublished) {
            emitToUser(id, "notification:new", { notification });
          }
        })
    );
  })();

  return res.status(201).json({ message });
};

export const listMessagesHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const limit = Number(req.query.limit ?? 50);
  const cursor = req.query.cursor as string | undefined;
  const messages = await listMessages(req.params.id, limit, cursor, req.user.id);
  return res.json({ messages });
};

export const searchMessagesHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const query = String(req.query.q ?? "").trim();
  if (!query) {
    return res.json({ messages: [] });
  }

  const messages = await searchMessages(req.params.id, req.user.id, query);
  return res.json({ messages });
};

export const listMediaHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const items = await listMedia(req.params.id, req.user.id);
  return res.json({ items });
};

export const getConversationHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const conversation = await getConversationById(req.params.id, req.user.id);
  return res.json({ conversation });
};

export const updateMessageStatusHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const data = messageStatusSchema.parse(req.body);
  const status = await updateMessageStatus(req.params.id, req.params.messageId, req.user.id, data.status);
  void emitToConversation(req.params.id, "message:status", { messageId: req.params.messageId, status: data.status, userId: req.user.id });
  return res.json({ status });
};

export const markConversationReadHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const result = await markConversationRead(req.params.id, req.user.id);
  void emitToConversation(req.params.id, "conversation:read", { userId: req.user.id });
  return res.json(result);
};

export const addParticipantsHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const data = participantsSchema.parse(req.body);
  const result = await addParticipants(req.params.id, req.user.id, data.participantIds);
  void emitToConversation(req.params.id, "conversation:participants", { action: "added", participantIds: data.participantIds });
  return res.status(201).json({ result });
};

export const removeParticipantHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const result = await removeParticipant(req.params.id, req.user.id, req.params.userId);
  void emitToConversation(req.params.id, "conversation:participants", { action: "removed", participantId: req.params.userId });
  return res.json({ result });
};

export const deleteMessageHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const result = await deleteMessage(req.params.id, req.params.messageId, req.user.id);
  void publishEvent({
    type: "message:deleted",
    conversationId: req.params.id,
    payload: { messageId: req.params.messageId }
  });
  void emitToConversation(req.params.id, "message:deleted", {
    conversationId: req.params.id,
    messageId: req.params.messageId
  });
  return res.json(result);
};
