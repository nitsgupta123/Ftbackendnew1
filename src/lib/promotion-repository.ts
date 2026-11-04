import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import type { PackageAuditContext } from "./audit-context";
import { DB_TIME_ZONE, getPool, query } from "./db";
import type {
  CreatePromotionInput,
  PromotionDiscountType,
  PromotionRecord,
  PromotionStatus,
  UpdatePromotionInput,
} from "./promotion-types";

const TABLE = "promotions";
const PACKAGES_TABLE = "promotion_packages";
const PACKAGE_KEY = /^(wizard|legacy):\d+$/;

function formatSqlDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) {
    const shifted = new Date(value.getTime() + 8 * 60 * 60 * 1000);
    const year = shifted.getUTCFullYear();
    const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
    const day = String(shifted.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function formatTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parsePromotionRow(row: RowDataPacket, packageKeys: string[]): PromotionRecord {
  return {
    id: Number(row.id),
    title: row.title,
    booking_from: formatSqlDate(row.booking_from),
    booking_to: formatSqlDate(row.booking_to),
    travel_from: formatSqlDate(row.travel_from),
    travel_to: formatSqlDate(row.travel_to),
    discount_type: row.discount_type,
    value: Number(row.value),
    package_keys: packageKeys,
    status: row.status,
    created_at: formatTimestamp(row.created_at),
    updated_at: formatTimestamp(row.updated_at),
  };
}

function normalizeDate(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Dates must use YYYY-MM-DD");
  }
  return trimmed;
}

function assertWindow(from: string | null, to: string | null, label: string) {
  if (from && to && to < from) {
    throw new Error(`${label} end date must be on or after the start date`);
  }
}

function normalizePackageKeys(keys: string[] | undefined): string[] {
  const unique = [...new Set((keys ?? []).map((key) => key.trim()).filter(Boolean))];
  const invalid = unique.find((key) => !PACKAGE_KEY.test(key));
  if (invalid) {
    throw new Error(`Invalid package selection: ${invalid}`);
  }
  return unique;
}

function assertDiscount(type: PromotionDiscountType, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Value must be greater than 0");
  }
  if (type === "percentage" && value > 100) {
    throw new Error("Percentage cannot be more than 100");
  }
}

async function withTransaction<T>(fn: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    await connection.query(`SET time_zone = '${DB_TIME_ZONE}'`);
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function loadPackageKeys(promotionIds: number[]): Promise<Map<number, string[]>> {
  const grouped = new Map<number, string[]>();
  if (!promotionIds.length) return grouped;

  const placeholders = promotionIds.map(() => "?").join(", ");
  const rows = await query<RowDataPacket[]>(
    `SELECT promotion_id, package_key
     FROM ${PACKAGES_TABLE}
     WHERE promotion_id IN (${placeholders})
     ORDER BY package_key ASC`,
    promotionIds
  );

  for (const row of rows) {
    const id = Number(row.promotion_id);
    const keys = grouped.get(id) ?? [];
    keys.push(String(row.package_key));
    grouped.set(id, keys);
  }
  return grouped;
}

async function replacePackageKeys(
  connection: PoolConnection,
  promotionId: number,
  packageKeys: string[]
) {
  await connection.execute(`DELETE FROM ${PACKAGES_TABLE} WHERE promotion_id = ?`, [promotionId]);
  if (!packageKeys.length) return;

  const placeholders = packageKeys.map(() => "(?, ?)").join(", ");
  const params = packageKeys.flatMap((key) => [promotionId, key]);
  await connection.execute(
    `INSERT INTO ${PACKAGES_TABLE} (promotion_id, package_key) VALUES ${placeholders}`,
    params
  );
}

export async function listPromotions(): Promise<PromotionRecord[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TABLE} ORDER BY updated_at DESC, id DESC`
  );
  const keys = await loadPackageKeys(rows.map((row) => Number(row.id)));
  return rows.map((row) => parsePromotionRow(row, keys.get(Number(row.id)) ?? []));
}

export async function getPromotionById(id: number): Promise<PromotionRecord | null> {
  const rows = await query<RowDataPacket[]>(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) return null;
  const keys = await loadPackageKeys([id]);
  return parsePromotionRow(rows[0], keys.get(id) ?? []);
}

export async function createPromotion(
  input: CreatePromotionInput,
  audit?: PackageAuditContext
): Promise<PromotionRecord> {
  const title = input.title.trim();
  if (!title) throw new Error("Promotion title is required");

  const bookingFrom = normalizeDate(input.booking_from);
  const bookingTo = normalizeDate(input.booking_to);
  const travelFrom = normalizeDate(input.travel_from);
  const travelTo = normalizeDate(input.travel_to);
  assertWindow(bookingFrom, bookingTo, "Booking window");
  assertWindow(travelFrom, travelTo, "Travel window");

  const discountType = input.discount_type;
  const value = input.value;
  assertDiscount(discountType, value);

  const packageKeys = normalizePackageKeys(input.package_keys);
  const status: PromotionStatus = input.status ?? "active";
  const auditUser = audit?.user ?? null;

  const id = await withTransaction(async (connection) => {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO ${TABLE} (
        title, booking_from, booking_to, travel_from, travel_to,
        discount_type, value, status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        bookingFrom,
        bookingTo,
        travelFrom,
        travelTo,
        discountType,
        value,
        status,
        auditUser,
        auditUser,
      ]
    );
    await replacePackageKeys(connection, result.insertId, packageKeys);
    return result.insertId;
  });

  const created = await getPromotionById(id);
  if (!created) throw new Error("Failed to load promotion after create");
  return created;
}

export async function updatePromotion(
  id: number,
  input: UpdatePromotionInput,
  audit?: PackageAuditContext
): Promise<PromotionRecord | null> {
  const existing = await getPromotionById(id);
  if (!existing) return null;

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  if (!title) throw new Error("Promotion title is required");

  const bookingFrom =
    input.booking_from !== undefined ? normalizeDate(input.booking_from) : existing.booking_from;
  const bookingTo =
    input.booking_to !== undefined ? normalizeDate(input.booking_to) : existing.booking_to;
  const travelFrom =
    input.travel_from !== undefined ? normalizeDate(input.travel_from) : existing.travel_from;
  const travelTo =
    input.travel_to !== undefined ? normalizeDate(input.travel_to) : existing.travel_to;
  assertWindow(bookingFrom, bookingTo, "Booking window");
  assertWindow(travelFrom, travelTo, "Travel window");

  const discountType = input.discount_type ?? existing.discount_type;
  const value = input.value ?? existing.value;
  assertDiscount(discountType, value);

  const packageKeys =
    input.package_keys !== undefined
      ? normalizePackageKeys(input.package_keys)
      : existing.package_keys;
  const status = input.status ?? existing.status;
  const auditUser = audit?.user ?? null;

  await withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE ${TABLE}
       SET title = ?, booking_from = ?, booking_to = ?, travel_from = ?, travel_to = ?,
           discount_type = ?, value = ?, status = ?, updated_by = ?
       WHERE id = ?`,
      [
        title,
        bookingFrom,
        bookingTo,
        travelFrom,
        travelTo,
        discountType,
        value,
        status,
        auditUser,
        id,
      ]
    );
    if (input.package_keys !== undefined) {
      await replacePackageKeys(connection, id, packageKeys);
    }
  });

  return getPromotionById(id);
}

export async function deletePromotion(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}
