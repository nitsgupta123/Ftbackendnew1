import type { FastifyPluginAsync } from "fastify";
import {
  createPromotion,
  deletePromotion,
  getPromotionById,
  listPromotions,
  updatePromotion,
} from "../../src/lib/promotion-repository";
import { createPromotionSchema, updatePromotionSchema } from "../../src/lib/validation";
import { getRequestAudit, requireSuperAdmin } from "../lib/audit";

function clientErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("required") ||
    message.includes("must") ||
    message.includes("cannot") ||
    message.includes("Invalid") ||
    message.includes("YYYY-MM-DD")
  ) {
    return 400;
  }
  return 500;
}

export const registerPromotionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/", async (_request, reply) => {
    try {
      const promotions = await listPromotions();
      return reply.send({ promotions });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to list promotions",
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const promotionId = Number(id);
      if (!Number.isInteger(promotionId) || promotionId <= 0) {
        return reply.status(400).send({ error: "Invalid promotion ID" });
      }

      const promotion = await getPromotionById(promotionId);
      if (!promotion) {
        return reply.status(404).send({ error: "Promotion not found" });
      }

      return reply.send({ promotion });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch promotion",
      });
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const parsed = createPromotionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const promotion = await createPromotion(parsed.data, getRequestAudit(request));
      return reply.status(201).send({ promotion });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : "Failed to create promotion";
      return reply.status(clientErrorStatus(error)).send({ error: message });
    }
  });

  app.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const promotionId = Number(id);
      if (!Number.isInteger(promotionId) || promotionId <= 0) {
        return reply.status(400).send({ error: "Invalid promotion ID" });
      }

      const parsed = updatePromotionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const promotion = await updatePromotion(promotionId, parsed.data, getRequestAudit(request));
      if (!promotion) {
        return reply.status(404).send({ error: "Promotion not found" });
      }

      return reply.send({ promotion });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : "Failed to update promotion";
      return reply.status(clientErrorStatus(error)).send({ error: message });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const { id } = request.params as { id: string };
      const promotionId = Number(id);
      if (!Number.isInteger(promotionId) || promotionId <= 0) {
        return reply.status(400).send({ error: "Invalid promotion ID" });
      }

      const deleted = await deletePromotion(promotionId);
      if (!deleted) {
        return reply.status(404).send({ error: "Promotion not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to delete promotion",
      });
    }
  });
};
