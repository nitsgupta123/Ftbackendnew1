import { AUDIT_USER_HEADER } from "./audit-context";
import { getStoredToken, getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";
import {
  PACKAGE_CATALOG_CONFIG,
  type CreatePackageCatalogInput,
  type ListPackageCatalogParams,
  type ListPackageCatalogResult,
  type PackageCatalogKind,
  type PackageCatalogRecord,
  type UpdatePackageCatalogInput,
} from "./package-catalog-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function requestHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const user = getStoredUser();
  if (user?.fullName) headers[AUDIT_USER_HEADER] = user.fullName;
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

function buildQuery(params: ListPackageCatalogParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.activeOnly) search.set("activeOnly", "true");
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function apiUrl(kind: PackageCatalogKind, path = "") {
  return `${API_BASE}${PACKAGE_CATALOG_CONFIG[kind].apiPath}${path}`;
}

export async function listPackageCatalog(
  kind: PackageCatalogKind,
  params: ListPackageCatalogParams = {}
) {
  const response = await fetch(apiUrl(kind, buildQuery(params)), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListPackageCatalogResult>(response);
}

export async function createPackageCatalog(kind: PackageCatalogKind, input: CreatePackageCatalogInput) {
  const response = await fetch(apiUrl(kind), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ item: PackageCatalogRecord }>(response);
}

export async function updatePackageCatalog(
  kind: PackageCatalogKind,
  id: number,
  input: UpdatePackageCatalogInput
) {
  const response = await fetch(apiUrl(kind, `/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ item: PackageCatalogRecord }>(response);
}

export async function deletePackageCatalog(kind: PackageCatalogKind, id: number) {
  const response = await fetch(apiUrl(kind, `/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}

export async function listActivePackageCatalog(kind: PackageCatalogKind) {
  return listPackageCatalog(kind, {
    activeOnly: true,
    limit: 100,
    sort: "display_order",
    order: "asc",
  });
}
