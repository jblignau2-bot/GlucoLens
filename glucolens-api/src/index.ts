import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router";
import { createContext } from "./context";

const app = express();
const PORT = process.env.PORT || 3000;

// Behind Railway's proxy — trust the first hop so req.ip is the client IP
app.set("trust proxy", 1);

// CORS: unset or "*" means open; otherwise exact allowlist from comma-split
const allowedOrigins = process.env.ALLOWED_ORIGINS?.trim();
app.use(
  cors({
    origin:
      !allowedOrigins || allowedOrigins === "*"
        ? true
        : allowedOrigins.split(",").map((o) => o.trim()).filter(Boolean),
  })
);

app.use(express.json({ limit: "10mb" })); // headroom for base64 images

// ─── Rate limiter ────────────────────────────────────────────────────────────
// Keyed by Supabase user id when derivable from the JWT, otherwise by IP.
// Counts every POST (mutations), including unauthenticated ones, and charges
// tRPC batches by the number of procedures in the batch.
const RATE_LIMIT = 30; // max mutation calls per window per user/IP
const WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

function rateKey(req: express.Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payloadPart = authHeader.slice(7).split(".")[1] ?? "";
      const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
      if (typeof payload?.sub === "string" && payload.sub) return `user:${payload.sub}`;
    } catch {
      // fall through to IP keying
    }
  }
  return `ip:${req.ip ?? "unknown"}`;
}

app.use("/trpc", (req, res, next) => {
  if (req.method !== "POST") return next();
  const now = Date.now();

  // Prune stale entries periodically
  if (now - lastSweep > WINDOW_MS) {
    lastSweep = now;
    for (const [k, v] of rateBuckets) {
      if (now > v.resetAt) rateBuckets.delete(k);
    }
  }

  // A tRPC batch (?batch=1) contains comma-separated procedure names in the path
  let cost = 1;
  if (String(req.query.batch) === "1") {
    cost = Math.max(1, req.path.replace(/^\//, "").split(",").length);
  }

  const key = rateKey(req);
  const entry = rateBuckets.get(key);
  if (!entry || now > entry.resetAt) {
    rateBuckets.set(key, { count: cost, resetAt: now + WINDOW_MS });
    return next();
  }
  if (entry.count + cost > RATE_LIMIT) {
    return res.status(429).json({ error: { message: "Too many requests. Please wait a minute." } });
  }
  entry.count += cost;
  next();
});

// tRPC
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Health check
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Express error handler — JSON 500, no stack traces in production
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled express error:", err);
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err?.message ?? "Internal server error";
  res.status(typeof err?.status === "number" ? err.status : 500).json({ error: { message } });
});

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

app.listen(PORT, () => {
  console.log(`GlucoLens API running on port ${PORT}`);
});

export type AppRouter = typeof appRouter;
