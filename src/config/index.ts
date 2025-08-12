import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || "1111", 10),
    env: process.env.NODE_ENV || "development",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },

  llm: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      baseUrl: "https://api.openai.com/v1",
    },
  },

  mcp: {
    serverUrl: process.env.MCP_SERVER_URL || "http://localhost:9999",
    workspaceHash: process.env.MCP_WORKSPACE_HASH || "",
  },

  // Security configs removed - using simple API key auto-registration

  logging: {
    level: process.env.LOG_LEVEL || "info",
    dir: process.env.LOG_DIR || path.join(__dirname, "../../logs"),
  },

  cors: {
    allowedOrigins: (
      process.env.ALLOWED_ORIGINS || "http://localhost:3000"
    ).split(","),
  },
};
