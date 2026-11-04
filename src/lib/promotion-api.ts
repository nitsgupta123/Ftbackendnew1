import type { CreatePromotionInput, PromotionRecord, UpdatePromotionInput } from "./promotion-types";
import { AUDIT_USER_HEADER } from "./audit-context";
import { getStoredToken, getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function requestHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const user = getStoredUser();
  if (user?.fullName) {
    headers[AUDIT_USER_HEADER] = user.fullName;
  }
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function listPromotions(): Promise<{ promotions: PromotionRecord[] }> {
  const response = await fetch(apiUrl("/api/promotions"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ promotions: PromotionRecord[] }>(response);
}

export async function createPromotion(input: CreatePromotionInput) {
  const response = await fetch(apiUrl("/api/promotions"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ promotion: PromotionRecord }>(response);
}

export async function updatePromotion(id: number, input: UpdatePromotionInput) {
  const response = await fetch(apiUrl(`/api/promotions/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ promotion: PromotionRecord }>(response);
}

export async function deletePromotion(id: number) {
  const response = await fetch(apiUrl(`/api/promotions/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}
