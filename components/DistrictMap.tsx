import { useEffect, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import {
  DEFAULT_VIEW,
  DEPOT,
  DISTRICT_GEO,
  MAP_HEIGHT,
  MAP_WIDTH,
  METRES_PER_UNIT,
  COAST_PATH,
  ROADS_PATH,
  SEA_PATH,
  type DistrictGeo,
} from "../lib/aktau-geo";
import { fillFor, liveTanker } from "../lib/format";
import { colors, font } from "../lib/theme";
import type { DistrictState, Tanker } from "../lib/types";

const LAND = "#F1ECE2";
const SEA = "#C3DCEF";
const SEA_DEEP = "#A9CBE4";
const COAST = "#7FAECB";
const ROAD = "#DED5C6";
const INACTIVE = "#DBD3C4";
const BORDER = "#FFFFFF";
const LABEL = "#2A3342";
const DEPOT_FILL = "#1B2A4A";

const MIN_SPAN = 140;
const PAN_MARGIN = 60;

type Box = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };

function areaUnits(district: DistrictGeo) {
  return (district.areaKm2 * 1_000_000) / METRES_PER_UNIT ** 2;
}

function scaleBox(box: Box, factor: number, originX?: number, originY?: number): Box {
  const w = box.w * factor;
  const h = box.h * factor;
  const cx = originX ?? box.x + box.w / 2;
  const cy = originY ?? box.y + box.h / 2;
  const tx = (cx - box.x) / box.w;
  const ty = (cy - box.y) / box.h;
  return { x: cx - tx * w, y: cy - ty * h, w, h };
}

function clampBox(box: Box): Box {
  const ratio = box.h / box.w;
  const w = Math.min(MAP_WIDTH + PAN_MARGIN * 2, Math.max(MIN_SPAN, box.w));
  const h = w * ratio;
  return {
    w,
    h,
    x: Math.min(Math.max(-PAN_MARGIN, box.x), Math.max(-PAN_MARGIN, MAP_WIDTH + PAN_MARGIN - w)),
    y: Math.min(Math.max(-PAN_MARGIN, box.y), Math.max(-PAN_MARGIN, MAP_HEIGHT + PAN_MARGIN - h)),
  };
}

function districtFrame(geo: DistrictGeo): Box {
  const ratio = DEFAULT_VIEW.h / DEFAULT_VIEW.w;
  const w = Math.max(MIN_SPAN, Math.sqrt(areaUnits(geo)) * 3.6);
  return clampBox({
    x: geo.center.x - w / 2,
    y: geo.center.y - (w * ratio) / 2,
    w,
    h: w * ratio,
  });
}

function framePoints(points: Point[]): Box {
  const ratio = DEFAULT_VIEW.h / DEFAULT_VIEW.w;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const span = Math.max(maxX - minX, (maxY - minY) / ratio, MIN_SPAN);
  const w = span * 1.65;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return clampBox({ x: cx - w / 2, y: cy - (w * ratio) / 2, w, h: w * ratio });
}

type Chip = { id: string; label: string; x: number; y: number; w: number; h: number; fontPx: number };

function hits(a: Chip, b: Chip, gap: number) {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

function touchDistance(touches: ReadonlyArray<{ pageX: number; pageY: number }>) {
  if (touches.length < 2) return 0;
  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

export function DistrictMap({
  districts,
  tankers = [],
  showTankers = false,
  selectedId,
  onSelect,
  now,
  home,
  trackTankerId,
  focusId,
  focusNonce = 0,
  fitKey,
  fitPoints,
}: {
  districts: DistrictState[];
  tankers?: Tanker[];
  showTankers?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  now: number;
  home?: Point | null;
  trackTankerId?: string | null;
  /** District to zoom to. `focusNonce` repeats a zoom onto the same id. */
  focusId?: string | null;
  focusNonce?: number;
  /** Frame these points once per key. Used by the track screen. */
  fitKey?: string | null;
  fitPoints?: Point[] | null;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const sizeRef = useRef(box);
  sizeRef.current = box;
  const [view, setView] = useState<Box>(DEFAULT_VIEW);
  const viewRef = useRef(view);
  viewRef.current = view;
  const hostRef = useRef<View>(null);
  const moved = useRef(false);

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width !== box.width || height !== box.height) setBox({ width, height });
  }

  useEffect(() => {
    if (!focusId) return;
    const geo = DISTRICT_GEO.find((district) => district.id === focusId);
    if (geo) setView(districtFrame(geo));
  }, [focusId, focusNonce]);

  useEffect(() => {
    if (!fitKey || !fitPoints || fitPoints.length === 0) return;
    setView(framePoints(fitPoints));
    // Frame when the track target changes, not on every position tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    const node = hostRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== "function") return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const current = viewRef.current;
      const px = Math.min(rect.width / current.w, rect.height / current.h);
      const offsetX = (rect.width - current.w * px) / 2;
      const offsetY = (rect.height - current.h * px) / 2;
      const originX = current.x + (event.clientX - rect.left - offsetX) / px;
      const originY = current.y + (event.clientY - rect.top - offsetY) / px;
      setView(clampBox(scaleBox(current, event.deltaY > 0 ? 1.18 : 0.85, originX, originY)));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  const pinch = useRef<{ dist: number; box: Box } | null>(null);
  const drag = useRef<{ x: number; y: number; box: Box } | null>(null);
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (event, gesture) => {
        const touches = event.nativeEvent.touches?.length ?? 0;
        return touches >= 2 || Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8;
      },
      onPanResponderGrant: (event) => {
        moved.current = false;
        const touches = event.nativeEvent.touches ?? [];
        if (touches.length >= 2) {
          pinch.current = { dist: touchDistance(touches), box: viewRef.current };
          drag.current = null;
          return;
        }
        pinch.current = null;
        drag.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, box: viewRef.current };
      },
      onPanResponderMove: (event, gesture) => {
        const touches = event.nativeEvent.touches ?? [];
        if (touches.length >= 2) {
          const dist = touchDistance(touches);
          const start = pinch.current ?? { dist, box: viewRef.current };
          if (!pinch.current) pinch.current = start;
          if (start.dist > 0 && dist > 0) {
            moved.current = true;
            setView(clampBox(scaleBox(start.box, start.dist / dist)));
          }
          return;
        }
        const start = drag.current;
        if (!start) return;
        const current = viewRef.current;
        const host = hostRef.current as unknown as { getBoundingClientRect?: () => DOMRect } | null;
        const rect = host?.getBoundingClientRect?.();
        const size = sizeRef.current;
        const px = rect ? Math.min(rect.width / current.w, rect.height / current.h) : size.width ? Math.min(size.width / current.w, size.height / current.h) : 0;
        if (!px) return;
        if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8) moved.current = true;
        setView(
          clampBox({
            ...start.box,
            x: start.box.x - (event.nativeEvent.pageX - start.x) / px,
            y: start.box.y - (event.nativeEvent.pageY - start.y) / px,
          }),
        );
      },
      onPanResponderRelease: () => {
        drag.current = null;
        pinch.current = null;
      },
      onPanResponderTerminate: () => {
        drag.current = null;
        pinch.current = null;
      },
    }),
  ).current;

  const statusById = new Map(districts.map((district) => [district.id, district]));
  const px = box.width && box.height ? Math.min(box.width / view.w, box.height / view.h) : 0.4;
  const unit = (pixels: number) => pixels / px;
  const cityWide = Math.abs(view.w - DEFAULT_VIEW.w) < 8 && Math.abs(view.x - DEFAULT_VIEW.x) < 8;

  const tracked = trackTankerId ? tankers.find((tanker) => tanker.id === trackTankerId) : null;
  const trackedLive = tracked ? liveTanker(tracked, now) : null;
  const parked = showTankers ? tankers.filter((tanker) => tanker.status === "idle" && tanker.id !== trackTankerId) : [];
  const moving = showTankers
    ? tankers
        .filter((tanker) => tanker.status !== "idle" || tanker.id === trackTankerId)
        .map((tanker) => ({ tanker, live: liveTanker(tanker, now) }))
    : [];

  const labels = (() => {
    const placed: Chip[] = [];
    const ranked = DISTRICT_GEO.filter((geo) => geo.kind !== "industrial").sort(
      (a, b) => areaUnits(b) - areaUnits(a),
    );
    const selected = ranked.find((geo) => geo.id === selectedId);
    const order = selected ? [selected, ...ranked.filter((geo) => geo.id !== selected.id)] : ranked;
    for (const geo of order) {
      const selectedChip = geo.id === selectedId;
      const fontPx = selectedChip ? 13 : 11;
      const label = geo.name.replace(" мкр", "");
      const w = Math.max(18, label.length * fontPx * 0.72 + 10) / px;
      const h = (fontPx + 8) / px;
      if (!selectedChip && Math.sqrt(areaUnits(geo)) < w) continue;
      const chip: Chip = { id: geo.id, label, x: geo.center.x - w / 2, y: geo.center.y - h / 2, w, h, fontPx };
      if (!selectedChip && placed.some((other) => hits(chip, other, 6 / px))) continue;
      placed.push(chip);
    }
    return [...placed.filter((chip) => chip.id !== selectedId), ...placed.filter((chip) => chip.id === selectedId)];
  })();

  function zoomBy(factor: number) {
    setView((current) => clampBox(scaleBox(current, factor)));
  }

  return (
    <View ref={hostRef} style={styles.map} onLayout={onLayout} {...responder.panHandlers}>
      <Svg width="100%" height="100%" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="caspian" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0%" stopColor={SEA_DEEP} />
            <Stop offset="100%" stopColor={SEA} />
          </LinearGradient>
        </Defs>
        <Rect x={-MAP_WIDTH} y={-MAP_HEIGHT} width={MAP_WIDTH * 3} height={MAP_HEIGHT * 3} fill={LAND} />
        <Path d={SEA_PATH} fill="url(#caspian)" />
        <Path d={ROADS_PATH} fill="none" stroke={ROAD} strokeWidth={unit(2.2)} strokeLinecap="round" />
        <Path d={COAST_PATH} fill="none" stroke={COAST} strokeWidth={unit(1.4)} />
        {DISTRICT_GEO.map((geo) => {
          const state = statusById.get(geo.id);
          const unserved = geo.kind === "industrial" || !state;
          const selected = selectedId === geo.id;
          return (
            <Path
              key={geo.id}
              d={geo.path}
              fill={unserved ? INACTIVE : fillFor(state.status)}
              fillOpacity={unserved ? 0.5 : 0.88}
              stroke={selected ? colors.blue : BORDER}
              strokeWidth={unit(selected ? 2.6 : 1)}
              strokeLinejoin="round"
              onPress={() => {
                if (moved.current) return;
                if (!unserved) onSelect?.(geo.id);
              }}
            />
          );
        })}
        {showTankers && parked.length > 0 ? (
          <>
            <Rect
              x={DEPOT.x - unit(28)}
              y={DEPOT.y - unit(32)}
              width={unit(56)}
              height={unit(20)}
              rx={unit(10)}
              fill={DEPOT_FILL}
            />
            <SvgText
              x={DEPOT.x}
              y={DEPOT.y - unit(18)}
              textAnchor="middle"
              fontSize={unit(10.5)}
              fontWeight="700"
              fill="white"
            >
              {`База · ${parked.length}`}
            </SvgText>
          </>
        ) : null}
        {trackedLive && home ? (
          <Line
            x1={trackedLive.x}
            y1={trackedLive.y}
            x2={home.x}
            y2={home.y + unit(16)}
            stroke={colors.blue}
            strokeWidth={unit(2)}
            strokeDasharray={`${unit(7)} ${unit(6)}`}
          />
        ) : null}
        {home ? <House x={home.x} y={home.y + unit(16)} unit={unit} /> : null}
        {moving.map(({ tanker, live }) => (
          <Circle
            key={tanker.id}
            cx={live.x}
            cy={live.y}
            r={unit(11)}
            fill={colors.blue}
            stroke="white"
            strokeWidth={unit(2)}
          />
        ))}
        {moving.map(({ tanker, live }) => (
          <SvgText
            key={`${tanker.id}-n`}
            x={live.x}
            y={live.y + unit(4)}
            textAnchor="middle"
            fontSize={unit(12)}
            fontWeight="700"
            fill="white"
          >
            {String(tanker.number)}
          </SvgText>
        ))}
        {labels.map((chip) => (
          <G key={`${chip.id}-label`}>
            <Rect
              x={chip.x}
              y={chip.y}
              width={chip.w}
              height={chip.h}
              rx={unit(4)}
              fill="white"
              fillOpacity={0.96}
            />
            <SvgText
              x={chip.x + chip.w / 2}
              y={chip.y + chip.h / 2 + unit(chip.fontPx * 0.35)}
              textAnchor="middle"
              fontSize={unit(chip.fontPx)}
              fontWeight="700"
              fill={LABEL}
            >
              {chip.label}
            </SvgText>
          </G>
        ))}
      </Svg>
      <View style={styles.zoom}>
        <Pressable style={styles.zoomBtn} onPress={() => zoomBy(0.7)} accessibilityLabel="Приблизить">
          <Text style={styles.zoomGlyph}>+</Text>
        </Pressable>
        <Pressable style={[styles.zoomBtn, styles.zoomBorder]} onPress={() => zoomBy(1.42)} accessibilityLabel="Отдалить">
          <Text style={styles.zoomGlyph}>−</Text>
        </Pressable>
        {cityWide ? null : (
          <Pressable style={[styles.zoomBtn, styles.zoomBorder]} onPress={() => setView(DEFAULT_VIEW)} accessibilityLabel="Весь город">
            <Text style={styles.zoomCity}>Город</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function House({ x, y, unit }: { x: number; y: number; unit: (pixels: number) => number }) {
  const w = unit(16);
  const h = unit(12);
  const left = x - w / 2;
  const top = y - h * 0.15;
  const roof = `M ${x} ${top - h * 0.55} L ${left - unit(2)} ${top} L ${left + w + unit(2)} ${top} Z`;
  return (
    <>
      <Circle cx={x} cy={y} r={unit(13)} fill="white" />
      <Path d={roof} fill={colors.blue} />
      <Rect x={left} y={top} width={w} height={h} rx={unit(1.5)} fill={colors.blue} />
      <Rect x={x - unit(2.2)} y={top + h * 0.38} width={unit(4.4)} height={h * 0.62} fill="white" />
    </>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: LAND, overflow: "hidden" },
  zoom: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#1A2640",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  zoomBtn: { minWidth: 36, height: 34, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  zoomBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  zoomGlyph: { fontSize: 18, lineHeight: 20, color: colors.text, fontFamily: font.medium },
  zoomCity: { fontSize: 10, color: colors.secondary, fontFamily: font.semibold },
});
