import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { scheduledPosts } from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, lte } from "drizzle-orm";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

/**
 * Session Management Configuration
 * 
 * Uses express-session with in-memory storage for this demo.
 * In production, you should use a persistent session store like:
 * - connect-pg-simple (PostgreSQL)
 * - connect-redis (Redis)
 * - connect-mongo (MongoDB)
 */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "linkedin-oauth-demo-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  /**
   * Scheduled Post Processor
   * 
   * Background job that checks for scheduled posts every minute and publishes
   * them to LinkedIn when their scheduled time arrives.
   * 
   * In production, consider using a more robust solution like:
   * - BullMQ with Redis
   * - Temporal.io
   * - AWS EventBridge / Google Cloud Scheduler
   */
  if (process.env.DATABASE_URL) {
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    const processScheduledPosts = async () => {
      try {
        const now = new Date();

        // Find all pending posts whose time has arrived
        const dueUsers = await db
          .select()
          .from(scheduledPosts)
          .where(
            and(
              eq(scheduledPosts.status, "pending"),
              lte(scheduledPosts.scheduledTime, now)
            )
          );

        for (const post of dueUsers) {
          try {
            // Note: This is a simplified version. In production, you would:
            // 1. Fetch the user's access token from database/session
            // 2. Check if token is still valid
            // 3. Post to LinkedIn
            // 4. Handle token refresh if needed
            
            // For now, we just mark as failed with a message to use manual posting
            await db
              .update(scheduledPosts)
              .set({
                status: "failed",
                errorMessage: "Automated posting requires persistent access tokens. Please post manually from the app.",
              })
              .where(eq(scheduledPosts.id, post.id));

            log(`Scheduled post ${post.id} marked for manual posting`);
          } catch (error: any) {
            log(`Error processing scheduled post ${post.id}: ${error.message}`);
            await db
              .update(scheduledPosts)
              .set({
                status: "failed",
                errorMessage: error.message || "Unknown error",
              })
              .where(eq(scheduledPosts.id, post.id));
          }
        }
      } catch (error: any) {
        log(`Scheduled post processor error: ${error.message}`);
      }
    };

    // Run every minute
    setInterval(processScheduledPosts, 60 * 1000);
    
    // Run once at startup
    processScheduledPosts().catch(console.error);
    
    log("Scheduled post processor started");
  }
})();
