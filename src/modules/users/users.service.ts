import { prisma } from "../../config/prisma";

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, username: true, avatarUrl: true, createdAt: true }
  });
};

export const searchUsers = async (query: string, limit = 20) => {
  return prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { username: { contains: query, mode: "insensitive" } }
      ]
    },
    select: { id: true, email: true, username: true, avatarUrl: true },
    take: limit
  });
};

export const updateUserStatus = async (userId: string, status: string | null) => {
  return prisma.user.update({
    where: { id: userId },
    data: { status, lastSeenAt: new Date() },
    select: { id: true, status: true, lastSeenAt: true }
  });
};

export const updateUserProfile = async (
  userId: string,
  data: { status?: string; username?: string }
) => {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, username: true, avatarUrl: true, status: true, lastSeenAt: true }
  });
};

export const updateUserAvatar = async (userId: string, avatarUrl: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: { id: true, avatarUrl: true }
  });
};
