import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query } from "./db";
import { slugify, uniqueSlug } from "./slug";
import {
  PACKAGE_CATALOG_CONFIG,
  type CreatePackageCatalogInput,
  type ListPackageCatalogParams,
  type ListPackageCatalogResult,
  type PackageCatalogKind,
  type PackageCatalogRecord,
  type UpdatePackageCatalogInput,
} from "./package-catalog-types";

function tableFor(kind: PackageCatalogKind) {
  return PACKAGE_CATALOG_CONFIG[kind].table;
}

function labelFor(kind: PackageCatalogKind) {
  return PACKAGE_CATALOG_CONFIG[kind].singular;
}

function parseRow(row: RowDataPacket): PackageCatalogRecord {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    display_order: Number(row.display_order),
    status: row.status,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

async function listExistingSlugs(kind: PackageCatalogKind, excludeId?: number): Promise<string[]> {
  const table = tableFor(kind);
  const sql = excludeId
    ? `SELECT slug FROM ${table} WHERE id != ?`
    : `SELECT slug FROM ${table}`;
  const rows = await query<RowDataPacket[]>(sql, excludeId ? [excludeId] : []);
  return rows.map((row) => String(row.slug));
}

async function isNameTaken(kind: PackageCatalogKind, name: string, excludeId?: number) {
  const table = tableFor(kind);
  const sql = excludeId
    ? `SELECT id FROM ${table} WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1`
    : `SELECT id FROM ${table} WHERE LOWER(name) = LOWER(?) LIMIT 1`;
  const rows = await query<RowDataPacket[]>(sql, excludeId ? [name, excludeId] : [name]);
  return rows.length > 0;
}

async function isSlugTaken(kind: PackageCatalogKind, slug: string, excludeId?: number) {
  const table = tableFor(kind);
  const sql = excludeId
    ? `SELECT id FROM ${table} WHERE slug = ? AND id != ? LIMIT 1`
    : `SELECT id FROM ${table} WHERE slug = ? LIMIT 1`;
  const rows = await query<RowDataPacket[]>(sql, excludeId ? [slug, excludeId] : [slug]);
  return rows.length > 0;
}

async function resolveSlug(
  kind: PackageCatalogKind,
  name: string,
  requestedSlug?: string,
  excludeId?: number
) {
  const base = requestedSlug?.trim() ? slugify(requestedSlug) : slugify(name);
  if (!base) throw new Error("Unable to generate a valid slug");
  if (!(await isSlugTaken(kind, base, excludeId))) return base;
  return uniqueSlug(base, await listExistingSlugs(kind, excludeId));
}

export async function listPackageCatalog(
  kind: PackageCatalogKind,
  params: ListPackageCatalogParams = {}
): Promise<ListPackageCatalogResult> {
  const {
    search,
    status = "all",
    sort = "display_order",
    order = "asc",
    page = 1,
    limit = 20,
    activeOnly = false,
  } = params;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (activeOnly || status === "active") conditions.push("status = 'active'");
  else if (status === "inactive") conditions.push("status = 'inactive'");

  if (search?.trim()) {
    conditions.push("name LIKE ?");
    values.push(`%${search.trim()}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sortColumn = sort === "created_at" ? "created_at" : "display_order";
  const sortOrder = order === "desc" ? "DESC" : "ASC";
  const table = tableFor(kind);

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${table} ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${table}
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, name ASC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
  );

  return {
    items: rows.map(parseRow),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getPackageCatalogById(
  kind: PackageCatalogKind,
  id: number
): Promise<PackageCatalogRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${tableFor(kind)} WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? parseRow(rows[0]) : null;
}

export async function createPackageCatalog(
  kind: PackageCatalogKind,
  input: CreatePackageCatalogInput,
  audit?: PackageAuditContext
): Promise<PackageCatalogRecord> {
  const name = input.name.trim();
  const label = labelFor(kind);
  if (!name) throw new Error(`${label[0].toUpperCase()}${label.slice(1)} name is required`);
  if (await isNameTaken(kind, name)) {
    throw new Error(`A ${label} with this name already exists`);
  }

  const slug = await resolveSlug(kind, name, input.slug);
  const auditUser = audit?.user ?? null;
  const result = await query<ResultSetHeader>(
    `INSERT INTO ${tableFor(kind)} (
      name, slug, description, display_order, status, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      slug,
      input.description?.trim() || null,
      input.display_order ?? 0,
      input.status ?? "active",
      auditUser,
      auditUser,
    ]
  );

  const created = await getPackageCatalogById(kind, result.insertId);
  if (!created) throw new Error(`Failed to load ${label} after create`);
  return created;
}

export async function updatePackageCatalog(
  kind: PackageCatalogKind,
  id: number,
  input: UpdatePackageCatalogInput,
  audit?: PackageAuditContext
): Promise<PackageCatalogRecord | null> {
  const existing = await getPackageCatalogById(kind, id);
  if (!existing) return null;

  const label = labelFor(kind);
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error(`${label[0].toUpperCase()}${label.slice(1)} name is required`);
    if (await isNameTaken(kind, name, id)) {
      throw new Error(`A ${label} with this name already exists`);
    }
    fields.push("name = ?");
    values.push(name);
  }

  if (input.slug !== undefined || input.name !== undefined) {
    const slug = await resolveSlug(
      kind,
      input.name?.trim() || existing.name,
      input.slug ?? existing.slug,
      id
    );
    fields.push("slug = ?");
    values.push(slug);
  }

  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description?.trim() || null);
  }
  if (input.display_order !== undefined) {
    fields.push("display_order = ?");
    values.push(input.display_order);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }

  if (!fields.length) return existing;

  if (audit?.user) {
    fields.push("updated_by = ?");
    values.push(audit.user);
  }

  values.push(id);
  await query<ResultSetHeader>(
    `UPDATE ${tableFor(kind)} SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
  return getPackageCatalogById(kind, id);
}

export async function deletePackageCatalog(kind: PackageCatalogKind, id: number) {
  const result = await query<ResultSetHeader>(
    `DELETE FROM ${tableFor(kind)} WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}
