import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";

export type ConversationType = "DIRECT" | "GROUP";

export const createConversation = async (
  userId: string,
  type: ConversationType,
  title: string | undefined,
  participantIds: string[]
) => {
  const participants = Array.from(new Set([userId, ...participantIds]));

  if (type === "DIRECT" && participants.length === 2) {
    const candidates = await prisma.conversation.findMany({
      where: {
        type: "DIRECT",
        participants: {
          some: {
            userId: { in: participants }
          }
        }
      },
      include: { participants: true }
    });

    const existing = candidates.find((conversation) => {
      if (conversation.participants.length !== 2) return false;
      const ids = conversation.participants.map((p) => p.userId).sort();
      const target = [...participants].sort();
      return ids[0] === target[0] && ids[1] === target[1];
    });

    if (existing) {
      return prisma.conversation.findUnique({
        where: { id: existing.id },
        include: {
          participants: { include: { user: { select: { id: true, username: true, email: true, avatarUrl: true } } } }
        }
      });
    }
  }

  return prisma.conversation.create({
    data: {
      type,
      title,
      participants: {
        create: participants.map((id) => ({ userId: id }))
      }
    },
    include: {
      participants: { include: { user: { select: { id: true, username: true, email: true, avatarUrl: true } } } }
    }
  });
};

export const listConversations = async (userId: string) => {
  return prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: { id: true, username: true, email: true, avatarUrl: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
};

export const getConversationById = async (conversationId: string, userId: string) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: { id: true, username: true, email: true, avatarUrl: true } } } }
    }
  });
  if (!conversation) {
    const error = new Error("Conversation not found");
    (error as any).status = 404;
    throw error;
  }
  return conversation;
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
  type: "TEXT" | "IMAGE" | "FILE" = "TEXT",
  attachment?: { url: string; type: string; size?: number }
) => {
  const participants = await prisma.participant.findMany({
    where: { conversationId },
    select: { userId: true }
  });
  const isParticipant = participants.some((p) => p.userId === senderId);
  if (!isParticipant) {
    const error = new Error("Not a participant");
    (error as any).status = 403;
    throw error;
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content,
      type,
      ...(attachment
        ? {
            attachments: {
              create: {
                url: attachment.url,
                type: attachment.type,
                size: attachment.size
              }
            }
          }
        : {})
    },
    include: {
      sender: { select: { id: true, username: true, email: true, avatarUrl: true } },
      attachments: true
    }
  });

  const participantIds = participants.map((p) => p.userId);

  void prisma.messageStatus
    .createMany({
      data: participants.map((p) => ({
        messageId: message.id,
        userId: p.userId,
        status: p.userId === senderId ? "READ" : "SENT"
      }))
    })
    .catch((error) => logger.error({ error }, "Failed creating message statuses"));

  void prisma.conversation
    .update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })
    .catch((error) => logger.error({ error }, "Failed updating lastMessageAt"));

  return { message, participantIds };
};

export const listMessages = async (conversationId: string, limit = 50, cursor?: string, userId?: string) => {
  if (userId) {
    const participant = await prisma.participant.findFirst({
      where: { conversationId, userId }
    });
    if (!participant) {
      const error = new Error("Not a participant");
      (error as any).status = 403;
      throw error;
    }
  }

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, username: true, email: true, avatarUrl: true } },
      attachments: true
    },
    ...(cursor
      ? {
          skip: 1,
          cursor: { id: cursor }
        }
      : {})
  });
};

export const searchMessages = async (conversationId: string, userId: string, query: string) => {
  const participant = await prisma.participant.findFirst({
    where: { conversationId, userId }
  });
  if (!participant) {
    const error = new Error("Not a participant");
    (error as any).status = 403;
    throw error;
  }

  return prisma.message.findMany({
    where: {
      conversationId,
      content: { contains: query, mode: "insensitive" }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      sender: { select: { id: true, username: true, email: true, avatarUrl: true } }
    },
    take: 20
  });
};

export const listMedia = async (conversationId: string, userId: string) => {
  const participant = await prisma.participant.findFirst({
    where: { conversationId, userId }
  });
  if (!participant) {
    const error = new Error("Not a participant");
    (error as any).status = 403;
    throw error;
  }

  return prisma.attachment.findMany({
    where: {
      message: { conversationId }
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      message: {
        select: { id: true, content: true, createdAt: true, senderId: true }
      }
    }
  });
};

export const updateMessageStatus = async (
  conversationId: string,
  messageId: string,
  userId: string,
  status: "SENT" | "DELIVERED" | "READ"
) => {
  const participant = await prisma.participant.findFirst({
    where: { conversationId, userId }
  });
  if (!participant) {
    const error = new Error("Not a participant");
    (error as any).status = 403;
    throw error;
  }

  return prisma.messageStatus.upsert({
    where: { messageId_userId: { messageId, userId } },
    update: { status },
    create: { messageId, userId, status }
  });
};

export const markConversationRead = async (conversationId: string, userId: string) => {
  const participant = await prisma.participant.findFirst({
    where: { conversationId, userId }
  });
  if (!participant) {
    const error = new Error("Not a participant");
    (error as any).status = 403;
    throw error;
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    select: { id: true }
  });

  if (messages.length === 0) {
    return { updated: 0 };
  }

  const result = await prisma.messageStatus.updateMany({
    where: { userId, messageId: { in: messages.map((m) => m.id) } },
    data: { status: "READ" }
  });

  return { updated: result.count };
};

export const addParticipants = async (
  conversationId: string,
  requesterId: string,
  participantIds: string[]
) => {
  const requester = await prisma.participant.findFirst({
    where: { conversationId, userId: requesterId }
  });
  if (!requester) {
    const error = new Error("Not a participant");
    (error as any).status = 403;
    throw error;
  }

  return prisma.participant.createMany({
    data: participantIds.map((id) => ({ conversationId, userId: id })),
    skipDuplicates: true
  });
};

export const removeParticipant = async (
  conversationId: string,
  requesterId: string,
  participantId: string
) => {
  const requester = await prisma.participant.findFirst({
    where: { conversationId, userId: requesterId }
  });
  if (!requester) {
    const error = new Error("Not a participant");
    (error as any).status = 403;
    throw error;
  }

  return prisma.participant.delete({
    where: { conversationId_userId: { conversationId, userId: participantId } }
  });
};

export const deleteMessage = async (conversationId: string, messageId: string, userId: string) => {
  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId }
  });

  if (!message) {
    const error = new Error("Message not found");
    (error as any).status = 404;
    throw error;
  }

  if (message.senderId !== userId) {
    const error = new Error("Forbidden");
    (error as any).status = 403;
    throw error;
  }

  await prisma.messageStatus.deleteMany({ where: { messageId } });
  await prisma.attachment.deleteMany({ where: { messageId } });
  await prisma.message.delete({ where: { id: messageId } });

  return { id: messageId };
};

export const listParticipantIds = async (conversationId: string) => {
  const participants = await prisma.participant.findMany({
    where: { conversationId },
    select: { userId: true }
  });
  return participants.map((p) => p.userId);
};
