import { config } from "dotenv";

config({ path: ".env.local" });
config();
import path from "node:path";
import { mkdirSync } from "node:fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { registerAuthPlugin } from "./plugins/auth";
import { registerAuthRoutes } from "./routes/auth";
import { registerPackageRoutes } from "./routes/packages";
import { registerLegacyAssetRoutes } from "./routes/legacy-assets";
import { registerCategoryRoutes } from "./routes/categories";
import { registerPackageCatalogRoutes } from "./routes/package-catalog";
import { registerUserRoutes } from "./routes/users";
import { registerPricingRulesRoutes } from "./routes/pricing-rules";
import { registerPackageTemplateRoutes } from "./routes/package-templates";
import { registerBlogRoutes } from "./routes/blogs";
import { registerBlogCategoryRoutes } from "./routes/blog-categories";
import { registerPageRoutes } from "./routes/pages";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerEnquiryRoutes } from "./routes/enquiries";
import { registerSettingsRoutes } from "./routes/settings";
import { registerMediaRoutes } from "./routes/media";
import { registerPermissionRoutes } from "./routes/permissions";
import { registerSupplierRoutes } from "./routes/suppliers";
import { registerPromotionRoutes } from "./routes/promotions";
import { isDbConnectionError, verifyDbConnection } from "../src/lib/db";
import { startBlogPublishScheduler } from "./jobs/blog-publish-scheduler";

const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? "0.0.0.0";
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

async function buildServer() {
  mkdirSync(UPLOAD_ROOT, { recursive: true });

  const app = Fastify({
    logger: {
      level: process.env.API_LOG_LEVEL ?? "info",
    },
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(",") ?? [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 80 * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(fastifyStatic, {
    root: UPLOAD_ROOT,
    prefix: "/uploads/",
    decorateReply: false,
  });

  app.get("/health", async () => ({
    ok: true,
    service: "ftbackend",
    database: process.env.DB_NAME ?? "fz",
  }));

  await registerAuthPlugin(app);
  await app.register(registerAuthRoutes, { prefix: "/api/auth" });
  await app.register(registerPackageRoutes, { prefix: "/api/packages" });
  await app.register(registerCategoryRoutes, { prefix: "/api/categories" });
  await app.register(registerPackageCatalogRoutes("type"), { prefix: "/api/package-types" });
  await app.register(registerPackageCatalogRoutes("theme"), { prefix: "/api/package-themes" });
  await app.register(registerUserRoutes, { prefix: "/api/users" });
  await app.register(registerPricingRulesRoutes, { prefix: "/api/pricing-rules" });
  await app.register(registerPackageTemplateRoutes, { prefix: "/api/package-templates" });
  await app.register(registerBlogRoutes, { prefix: "/api/blogs" });
  await app.register(registerBlogCategoryRoutes, { prefix: "/api/blog-categories" });
  await app.register(registerPageRoutes, { prefix: "/api/pages" });
  await app.register(registerDashboardRoutes, { prefix: "/api/dashboard" });
  await app.register(registerEnquiryRoutes, { prefix: "/api/enquiries" });
  await app.register(registerSettingsRoutes, { prefix: "/api/settings" });
  await app.register(registerMediaRoutes, { prefix: "/api/media" });
  await app.register(registerPermissionRoutes, { prefix: "/api/permissions" });
  await app.register(registerSupplierRoutes, { prefix: "/api/suppliers" });
  await app.register(registerPromotionRoutes, { prefix: "/api/promotions" });
  await app.register(registerLegacyAssetRoutes, { prefix: "/api/legacy-assets" });

  app.setErrorHandler((error, _request, reply) => {
    if (isDbConnectionError(error)) {
      return reply.status(503).send({
        error: "Database is unavailable. Start MySQL and try again.",
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  });

  return app;
}

async function start() {
  const app = await buildServer();

  try {
    await verifyDbConnection();
    app.log.info("Database connection verified");
  } catch (error) {
    app.log.error(
      error,
      "Database connection failed. Start MySQL (e.g. XAMPP) and restart the API server."
    );
    process.exit(1);
  }

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Fastify API running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    startBlogPublishScheduler(app.log);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
