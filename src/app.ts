import "express-async-errors";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

export const createApp = () => {
  const app = express();

  const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/g, "").toLowerCase();
  const allowedOrigins = env.corsOrigin
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "WhatsApp Clone API" });
  });

  app.use("/api", apiRouter);

  app.use("/docs", swaggerUi.serve, swaggerUi.setup({ openapi: "3.0.0", info: { title: "WhatsApp Clone API", version: "0.1.0" } }));

  app.use(errorHandler);

  return app;
};
