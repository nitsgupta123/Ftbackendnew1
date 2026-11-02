import type { FastifyPluginAsync } from "fastify";
import {
  createPackageCatalog,
  deletePackageCatalog,
  getPackageCatalogById,
  listPackageCatalog,
  updatePackageCatalog,
} from "../../src/lib/package-catalog-repository";
import {
  PACKAGE_CATALOG_CONFIG,
  type ListPackageCatalogParams,
  type PackageCatalogKind,
  type PackageCatalogStatus,
} from "../../src/lib/package-catalog-types";
import {
  createPackageCatalogSchema,
  updatePackageCatalogSchema,
} from "../../src/lib/validation";
import { getRequestAudit, requireSuperAdmin } from "../lib/audit";

const VALID_STATUSES: PackageCatalogStatus[] = ["active", "inactive"];

function parseStatus(value?: string): PackageCatalogStatus | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return VALID_STATUSES.includes(value as PackageCatalogStatus)
    ? (value as PackageCatalogStatus)
    : undefined;
}

function isCatalogKind(value: unknown): value is PackageCatalogKind {
  return value === "type" || value === "theme";
}

export function registerPackageCatalogRoutes(kind: PackageCatalogKind): FastifyPluginAsync {
  if (!isCatalogKind(kind)) {
    throw new Error("Package catalog routes require kind type or theme");
  }

  return async (app) => {
  const label = PACKAGE_CATALOG_CONFIG[kind].singular;

  app.addHook("onRequest", app.authenticate);

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const params: ListPackageCatalogParams = {
        search: query.search,
        status: parseStatus(query.status) ?? "all",
        sort: query.sort === "created_at" ? "created_at" : "display_order",
        order: query.order === "desc" ? "desc" : "asc",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        activeOnly: query.activeOnly === "true" || query.activeOnly === "1",
      };
      return reply.send(await listPackageCatalog(kind, params));
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : `Failed to list ${label}s`,
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ error: `Invalid ${label} ID` });
      }
      const item = await getPackageCatalogById(kind, id);
      if (!item) return reply.status(404).send({ error: `${label} not found` });
      return reply.send({ item });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : `Failed to fetch ${label}`,
      });
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const parsed = createPackageCatalogSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }
      const item = await createPackageCatalog(kind, parsed.data, getRequestAudit(request));
      return reply.status(201).send({ item });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : `Failed to create ${label}`;
      return reply.status(message.includes("already exists") ? 409 : 500).send({ error: message });
    }
  });

  app.put("/:id", async (request, reply) => {
    try {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ error: `Invalid ${label} ID` });
      }
      const parsed = updatePackageCatalogSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }
      const item = await updatePackageCatalog(kind, id, parsed.data, getRequestAudit(request));
      if (!item) return reply.status(404).send({ error: `${label} not found` });
      return reply.send({ item });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : `Failed to update ${label}`;
      return reply.status(message.includes("already exists") ? 409 : 500).send({ error: message });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ error: `Invalid ${label} ID` });
      }
      const deleted = await deletePackageCatalog(kind, id);
      if (!deleted) return reply.status(404).send({ error: `${label} not found` });
      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : `Failed to delete ${label}`,
      });
    }
  });
  };
}
