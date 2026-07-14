import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { corsConfig } from "./config/cors.js";
import { registerRoutes } from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { generalLimiter } from "./middlewares/rateLimit.middleware.js";
import { setupSwagger } from "./docs/swagger.js";

export const createApp = (): Application => {
  const app = express();

  // ── Security ──
  app.use(helmet());
  app.use(cors(corsConfig));

  // ── Parsing ──
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ✅ Apply general limit to all routes
  app.use(generalLimiter);

  // ── Logging ──
  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  }

  // ── Swagger docs ──
  setupSwagger(app);

  // ── Routes ──
  registerRoutes(app);

  // ── Global error handler — must be last ──
  app.use(errorMiddleware);

  return app;
};
