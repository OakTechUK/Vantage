import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { OfficerProfile } from "./types";

export const TOKEN_COOKIE = "vantage_token";

export function apiBaseUrl() {
  return process.env.API_URL ?? "http://localhost:5189";
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function serverApi<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(await authHeaders()),
    ...(init?.headers ?? {}),
  };

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export const getSession = cache(async (): Promise<OfficerProfile | null> => {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl()}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as OfficerProfile;
});
