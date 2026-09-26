import type { ReportType, Snapshot } from "./types";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");

async function request(path: string, body?: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Сервер недоступен");
  }
  return (await response.json()) as Snapshot;
}

export function fetchState(home: string) {
  return request(`/api/state?home=${encodeURIComponent(home)}`);
}

export function sendReport(input: {
  districtId: string;
  building: string;
  type: ReportType;
  residentName: string;
}) {
  return request("/api/reports", input);
}

export function requestTanker(input: { districtId: string; building: string; residentName: string }) {
  return request("/api/requests", input);
}

export function markRead(ids?: string[]) {
  return request("/api/notifications", { ids });
}

export function sendFeedback(input: { text: string; residentName: string }) {
  return request("/api/feedback", input);
}
