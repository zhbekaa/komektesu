export type WaterStatus = "normal" | "low" | "none";
export type ReportType = "no_water" | "no_hot" | "low_pressure" | "emergency";
export type TankerStatus = "idle" | "en_route" | "serving";

/** Live district state. Geometry stays in lib/aktau-geo.ts and is joined by id. */
export type DistrictState = {
  id: string;
  status: WaterStatus;
  /** Simulated, not a network reading. */
  pressureBar: number;
  expectedNormalAt: string | null;
  updatedAt: number;
  complaints6h: number;
  cause: string | null;
};

export type Report = {
  id: string;
  districtId: string;
  building: string;
  type: ReportType;
  residentName: string;
  createdAt: number;
  confirmed: boolean;
};

export type Tanker = {
  id: string;
  number: number;
  status: TankerStatus;
  plate: string;
  capacityLiters: number;
  waterLiters: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetDistrictId: string | null;
  tripStartedAt: number | null;
  tripDurationMs: number;
  initialEtaMin: number;
  etaMinutes: number;
  etaToHome: number | null;
  distanceKm: number | null;
};

export type DeliveryRequest = {
  id: string;
  number: number;
  districtId: string;
  building: string;
  tankerId: string | null;
  status: "accepted" | "en_route" | "done";
  createdAt: number;
  residentName: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  kind: "outage" | "tanker" | "schedule";
};

export type ScheduleSlot = {
  from: string;
  to: string;
  title: string;
  status: WaterStatus;
};

export type Suggestion = {
  districtId: string;
  districtName: string;
  tankerId: string;
  tankerNumber: number;
  tankerPlate: string;
  etaMinutes: number;
  distanceKm: number;
  reason: string;
};

export type Incident = {
  id: string;
  title: string;
  summary: string;
  districtIds: string[];
  startedAt: number;
  expectedNormalAt: string | null;
};

export type SnapshotMeta = {
  simulated: boolean;
  city: string;
  operator: string;
  waterSource: string;
  coverage: {
    districts: number;
    areaKm2: number;
    buildings: number;
    residentialBuildings: number;
  };
  sources: { label: string; source: string; detail: string }[];
  assumptions: string[];
};

export type Snapshot = {
  serverTime: number;
  homeDistrictId: string;
  meta: SnapshotMeta;
  incident: Incident | null;
  districts: DistrictState[];
  tankers: Tanker[];
  reports: Report[];
  requests: DeliveryRequest[];
  notifications: AppNotification[];
  schedules: Record<string, ScheduleSlot[]>;
  situation: string;
  suggestions: Suggestion[];
};

export type Profile = {
  name: string;
  districtId: string;
  building: string;
  language: "ru" | "kk";
  favorites: string[];
};
