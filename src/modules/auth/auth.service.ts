import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";

const refreshExpiresMs = (days: number) => days * 24 * 60 * 60 * 1000;

export const registerUser = async (email: string, username: string, password: string) => {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });
  if (existing) {
    const error = new Error("User already exists");
    (error as any).status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, username, passwordHash }
  });

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.session.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + refreshExpiresMs(30))
    }
  });

  return { user, accessToken, refreshToken };
};

export const loginUser = async (identifier: string, password: string) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] }
  });

  if (!user) {
    const error = new Error("Invalid credentials");
    (error as any).status = 401;
    throw error;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const error = new Error("Invalid credentials");
    (error as any).status = 401;
    throw error;
  }

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.session.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + refreshExpiresMs(30))
    }
  });

  return { user, accessToken, refreshToken };
};

export const refreshTokens = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);
  const session = await prisma.session.findFirst({
    where: { userId: payload.userId, token: refreshToken }
  });

  if (!session) {
    const error = new Error("Invalid refresh token");
    (error as any).status = 401;
    throw error;
  }

  const newAccessToken = signAccessToken({ userId: payload.userId });
  const newRefreshToken = signRefreshToken({ userId: payload.userId });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + refreshExpiresMs(30))
    }
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);
  await prisma.session.deleteMany({
    where: { userId: payload.userId, token: refreshToken }
  });
  return { success: true };
};
