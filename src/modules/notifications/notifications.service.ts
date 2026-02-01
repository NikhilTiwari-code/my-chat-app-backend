import { prisma } from "../../config/prisma";

export const createNotification = async (userId: string, type: string, payload?: unknown) => {
  return prisma.notification.create({
    data: {
      userId,
      type,
      payload: payload ?? undefined
    }
  });
};

export const listNotifications = async (userId: string, limit = 50, cursor?: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor
      ? {
          skip: 1,
          cursor: { id: cursor }
        }
      : {})
  });
};

export const markNotificationRead = async (id: string, userId: string) => {
  const existing = await prisma.notification.findFirst({
    where: { id, userId }
  });
  if (!existing) {
    const error = new Error("Notification not found");
    (error as any).status = 404;
    throw error;
  }

  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() }
  });
};
