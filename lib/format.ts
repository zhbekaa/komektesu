import type { ReportType, TankerStatus, WaterStatus } from "./types";

export function statusLabel(status: WaterStatus) {
  if (status === "normal") return "Нормальное давление";
  if (status === "low") return "Слабый напор";
  return "Воды нет";
}

export function statusColor(status: WaterStatus) {
  if (status === "normal") return "#1F9D55";
  if (status === "low") return "#E09A12";
  return "#E5484D";
}

export const MAP_FILL = {
  normal: "#71BE8C",
  low: "#EFB44A",
  none: "#E4726E",
} as const;

export function fillFor(status: WaterStatus) {
  if (status === "low") return MAP_FILL.low;
  if (status === "none") return MAP_FILL.none;
  return MAP_FILL.normal;
}

export function reportLabel(type: ReportType) {
  if (type === "no_water") return "Нет воды";
  if (type === "no_hot") return "Нет горячей воды";
  if (type === "low_pressure") return "Слабый напор";
  return "Авария";
}

export function slotTitle(status: WaterStatus) {
  if (status === "normal") return "Подача воды";
  if (status === "low") return "Ограниченная подача";
  return "Подача отключена";
}

export function tankerLabel(status: TankerStatus) {
  if (status === "idle") return "Свободен";
  if (status === "en_route") return "В пути";
  return "Раздаёт воду";
}

export function ago(ts: number, now: number) {
  const minutes = Math.max(0, Math.round((now - ts) / 60000));
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.round(hours / 24);
  if (days === 1) return "вчера";
  return `${days} дн. назад`;
}

export function lastSignalLabel(ts: number, now: number) {
  const hours = (now - ts) / 3600000;
  if (hours < 1) return "Сейчас";
  if (hours < 24) return "Сегодня";
  if (hours < 48) return "Вчера";
  return `${Math.round(hours / 24)} дн.`;
}

/** Short card line: «ремонт на магистрали, норма к 18:00». */
export function causeLine(cause: string, expectedNormalAt: string | null) {
  const head = cause.split(",")[0].trim();
  const lowered = head.charAt(0).toLowerCase() + head.slice(1);
  return expectedNormalAt ? `${lowered}, норма к ${expectedNormalAt}` : lowered;
}

export function dayLabel(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const formatted = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
  if (offset === 0) return `Сегодня, ${formatted}`;
  if (offset === -1) return `Вчера, ${formatted}`;
  if (offset === 1) return `Завтра, ${formatted}`;
  return formatted;
}

export function liveTanker(tanker: {
  status: TankerStatus;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  tripStartedAt: number | null;
  tripDurationMs: number;
  initialEtaMin: number;
  etaMinutes: number;
}, now: number) {
  if (tanker.status !== "en_route" || !tanker.tripStartedAt || !tanker.tripDurationMs) {
    return { x: tanker.x, y: tanker.y, eta: tanker.etaMinutes };
  }
  const progress = Math.min(1, (now - tanker.tripStartedAt) / tanker.tripDurationMs);
  return {
    x: tanker.startX + (tanker.targetX - tanker.startX) * progress,
    y: tanker.startY + (tanker.targetY - tanker.startY) * progress,
    eta: Math.max(0, Math.round(tanker.initialEtaMin * (1 - progress))),
  };
}
