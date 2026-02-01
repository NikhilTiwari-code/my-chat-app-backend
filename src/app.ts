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

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", apiRouter);

  app.use("/docs", swaggerUi.serve, swaggerUi.setup({ openapi: "3.0.0", info: { title: "WhatsApp Clone API", version: "0.1.0" } }));

  app.use(errorHandler);

  return app;
};
