import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../../config/logger";
import { verifyAccessToken } from "../../utils/jwt";
import { prisma } from "../../config/prisma";

type ClientMeta = {
  userId: string;
};

let wss: WebSocketServer | null = null;
const clientMeta = new Map<WebSocket, ClientMeta>();
const userSockets = new Map<string, Set<WebSocket>>();

export const initRealtimeGateway = (server: Server) => {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    const token = url.searchParams.get("token") ?? "";

    try {
      const payload = verifyAccessToken(token);
      const meta = { userId: payload.userId };
      clientMeta.set(socket, meta);

      if (!userSockets.has(payload.userId)) {
        userSockets.set(payload.userId, new Set());
      }
      userSockets.get(payload.userId)!.add(socket);
      logger.info({ userId: payload.userId }, "WebSocket client connected");
    } catch {
      logger.warn("WebSocket auth failed");
      socket.close(1008, "Unauthorized");
      return;
    }

    socket.on("message", async (data) => {
      const raw = data.toString();
      logger.debug({ data: raw }, "WebSocket message received");

      try {
        const parsed = JSON.parse(raw);
        if (parsed?.type === "typing") {
          const conversationId = String(parsed?.payload?.conversationId ?? "");
          const isTyping = Boolean(parsed?.payload?.isTyping);
          const meta = clientMeta.get(socket);
          if (meta && conversationId) {
            await emitToConversation(conversationId, "typing", {
              conversationId,
              userId: meta.userId,
              isTyping
            });
          }
          return;
        }

        if (parsed?.type?.startsWith("call:")) {
          const conversationId = String(parsed?.payload?.conversationId ?? "");
          const meta = clientMeta.get(socket);
          if (meta && conversationId) {
            await emitToConversation(conversationId, parsed.type, {
              ...parsed.payload,
              fromUserId: meta.userId
            });
          }
          return;
        }
      } catch {
        // fall through to pong
      }

      socket.send(JSON.stringify({ type: "pong" }));
    });

    socket.on("close", () => {
      const meta = clientMeta.get(socket);
      if (meta) {
        const set = userSockets.get(meta.userId);
        set?.delete(socket);
        if (set && set.size === 0) {
          userSockets.delete(meta.userId);
        }
        clientMeta.delete(socket);
      }
      logger.info("WebSocket client disconnected");
    });
  });

  return wss;
};

export const emitToUser = (userId: string, type: string, payload: unknown) => {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) {
    return;
  }

  const message = JSON.stringify({ type, payload });
  sockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  });
};

export const emitToUsers = (userIds: string[], type: string, payload: unknown) => {
  const unique = new Set(userIds);
  unique.forEach((userId) => emitToUser(userId, type, payload));
};

export const emitToConversation = async (conversationId: string, type: string, payload: unknown) => {
  if (!wss) {
    return;
  }

  const participants = await prisma.participant.findMany({
    where: { conversationId },
    select: { userId: true }
  });

  participants.forEach((p) => emitToUser(p.userId, type, payload));
};
