import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
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

function sameDistricts(a: DistrictState[], b: DistrictState[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].status !== b[i].status) return false;
  }
  return true;
}

type Transform = NonNullable<ViewStyle["transform"]>;
type LiveLayer = { box: Box; transform: Transform | null; origin: string | null };
type PanGesture = { mode: "pan"; x: number; y: number; box: Box; dx: number; dy: number };
type PinchGesture = {
  mode: "pinch";
  dist: number;
  fx: number;
  fy: number;
  box: Box;
  scale: number;
  cx: number;
  cy: number;
};
type Gesture = PanGesture | PinchGesture;

const NATIVE = Platform.OS !== "web";

export const DistrictMap = memo(function DistrictMap({
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
  const hostRef = useRef<View>(null);
  const layerRef = useRef<View>(null);
  const svgRef = useRef<Svg>(null);
  const moved = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const originRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const liveRef = useRef<LiveLayer>({ box: view, transform: null, origin: null });
  const gestureRef = useRef<Gesture | null>(null);
  const frameRef = useRef(0);
  if (gestureRef.current) viewRef.current = liveRef.current.box;
  else {
    viewRef.current = view;
    liveRef.current.box = view;
  }

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    sizeRef.current = { width, height };
    originRef.current = { ...originRef.current, width, height };
    if (width !== box.width || height !== box.height) setBox({ width, height });
    hostRef.current?.measureInWindow((x, y, w, h) => {
      originRef.current = { x, y, width: w, height: h };
    });
  }

  function pixelsPerUnit(current: Box) {
    const { width, height } = sizeRef.current;
    return width && height ? Math.min(width / current.w, height / current.h) : 0;
  }

  function applyViewBox(next: Box) {
    svgRef.current?.setNativeProps({ minX: next.x, minY: next.y, vbWidth: next.w, vbHeight: next.h } as object);
  }

  function applyLayer(transform: Transform | null, origin: string | null, raster: boolean) {
    layerRef.current?.setNativeProps({
      shouldRasterizeIOS: raster,
      renderToHardwareTextureAndroid: raster,
      style: { flex: 1, transform: transform ?? [], transformOrigin: origin ?? "center" },
    });
  }

  function publish(next: Box, transform: Transform | null, origin: string | null, raster: boolean) {
    const clamped = clampBox(next);
    liveRef.current = { box: clamped, transform, origin };
    viewRef.current = clamped;
    applyViewBox(clamped);
    applyLayer(transform, origin, raster);
    return clamped;
  }

  function rememberOrigin() {
    hostRef.current?.measureInWindow((x, y, w, h) => {
      originRef.current = { x, y, width: w, height: h };
    });
  }

  function toLocal(pageX: number, pageY: number) {
    return { x: pageX - originRef.current.x, y: pageY - originRef.current.y };
  }

  function panDelta(gesture: PanGesture, pageX: number, pageY: number) {
    const px = pixelsPerUnit(gesture.box);
    if (!px) return { dx: 0, dy: 0, box: gesture.box };
    const next = clampBox({
      ...gesture.box,
      x: gesture.box.x - (pageX - gesture.x) / px,
      y: gesture.box.y - (pageY - gesture.y) / px,
    });
    return { dx: (gesture.box.x - next.x) * px, dy: (gesture.box.y - next.y) * px, box: next };
  }

  function pinchBox(gesture: PinchGesture) {
    const { width, height, px, ox, oy } = frameMetrics(gesture.box);
    if (!px) return gesture.box;
    const midX = width / 2;
    const midY = height / 2;
    const localX = (midX - gesture.cx) / gesture.scale + gesture.fx;
    const localY = (midY - gesture.cy) / gesture.scale + gesture.fy;
    const ux = gesture.box.x + (localX - ox) / px;
    const uy = gesture.box.y + (localY - oy) / px;
    const zoom = px * gesture.scale;
    return clampBox({
      x: ux - (midX - ox) / zoom,
      y: uy - (midY - oy) / zoom,
      w: gesture.box.w / gesture.scale,
      h: gesture.box.h / gesture.scale,
    });
  }

  function frameMetrics(current: Box) {
    const width = sizeRef.current.width;
    const height = sizeRef.current.height;
    const px = width && height ? Math.min(width / current.w, height / current.h) : 0;
    return { width, height, px, ox: (width - current.w * px) / 2, oy: (height - current.h * px) / 2 };
  }

  function pinchScale(gesture: PinchGesture, dist: number) {
    const minS = gesture.box.w / (MAP_WIDTH + PAN_MARGIN * 2);
    const maxS = gesture.box.w / MIN_SPAN;
    return Math.min(maxS, Math.max(minS, dist / gesture.dist));
  }

  function cancelFrame() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
  }

  function scheduleLayer() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      if (!gestureRef.current) return;
      const live = liveRef.current;
      applyLayer(live.transform, live.origin, true);
    });
  }

  function bakeGesture(gesture: Gesture) {
    if (gesture.mode === "pan") return panDelta(gesture, gesture.x + gesture.dx, gesture.y + gesture.dy).box;
    return pinchBox(gesture);
  }

  function finishNative() {
    const gesture = gestureRef.current;
    cancelFrame();
    gestureRef.current = null;
    if (!gesture) {
      applyLayer(null, null, false);
      return;
    }
    const next = clampBox(bakeGesture(gesture));
    // Leave the layer transform in place until React commits the new viewBox,
    // then drop it in the same frame so the map does not jump.
    liveRef.current = { box: next, transform: null, origin: null };
    viewRef.current = next;
    setView(next);
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

  function startPan(pageX: number, pageY: number, current: Box) {
    gestureRef.current = { mode: "pan", x: pageX, y: pageY, box: current, dx: 0, dy: 0 };
    liveRef.current = { box: current, transform: null, origin: null };
  }

  function startPinch(touches: ReadonlyArray<{ pageX: number; pageY: number }>, current: Box) {
    const a = toLocal(touches[0].pageX, touches[0].pageY);
    const b = toLocal(touches[1].pageX, touches[1].pageY);
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const fx = (a.x + b.x) / 2;
    const fy = (a.y + b.y) / 2;
    gestureRef.current = { mode: "pinch", dist, fx, fy, box: current, scale: 1, cx: fx, cy: fy };
    liveRef.current = { box: current, transform: [{ scale: 1 }], origin: `${fx}px ${fy}px` };
  }

  function moveNative(event: GestureResponderEvent) {
    const touches = event.nativeEvent.touches ?? [];
    const active = gestureRef.current;
    if (touches.length >= 2) {
      if (!active || active.mode !== "pinch") {
        const current = active ? publish(bakeGesture(active), null, null, true) : viewRef.current;
        startPinch(touches, current);
      }
      const pinchGesture = gestureRef.current;
      if (!pinchGesture || pinchGesture.mode !== "pinch") return;
      const dist = touchDistance(touches);
      if (dist <= 0) return;
      const a = toLocal(touches[0].pageX, touches[0].pageY);
      const b = toLocal(touches[1].pageX, touches[1].pageY);
      const scale = pinchScale(pinchGesture, dist);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      pinchGesture.scale = scale;
      pinchGesture.cx = cx;
      pinchGesture.cy = cy;
      if (Math.abs(scale - 1) > 0.01 || Math.hypot(cx - pinchGesture.fx, cy - pinchGesture.fy) > 2) moved.current = true;
      liveRef.current.transform = [
        { translateX: cx - pinchGesture.fx },
        { translateY: cy - pinchGesture.fy },
        { scale },
      ];
      liveRef.current.origin = `${pinchGesture.fx}px ${pinchGesture.fy}px`;
      scheduleLayer();
      return;
    }
    if (!active || active.mode !== "pan") {
      const current = active ? publish(bakeGesture(active), null, null, true) : viewRef.current;
      startPan(event.nativeEvent.pageX, event.nativeEvent.pageY, current);
    }
    const panGesture = gestureRef.current;
    if (!panGesture || panGesture.mode !== "pan") return;
    const shifted = panDelta(panGesture, event.nativeEvent.pageX, event.nativeEvent.pageY);
    panGesture.dx = shifted.dx;
    panGesture.dy = shifted.dy;
    if (Math.hypot(shifted.dx, shifted.dy) > 8) moved.current = true;
    liveRef.current.transform = [{ translateX: shifted.dx }, { translateY: shifted.dy }];
    liveRef.current.origin = null;
    scheduleLayer();
  }

  useEffect(() => {
    if (!NATIVE) return;
    return () => cancelFrame();
  }, []);

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (event, gesture) => {
        const touches = event.nativeEvent.touches?.length ?? 0;
        return touches >= 2 || Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        moved.current = false;
        const touches = event.nativeEvent.touches ?? [];
        if (!NATIVE) {
          if (touches.length >= 2) {
            pinch.current = { dist: touchDistance(touches), box: viewRef.current };
            drag.current = null;
            return;
          }
          pinch.current = null;
          drag.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, box: viewRef.current };
          return;
        }
        rememberOrigin();
        applyLayer(null, null, true);
        if (touches.length >= 2) startPinch(touches, viewRef.current);
        else startPan(event.nativeEvent.pageX, event.nativeEvent.pageY, viewRef.current);
      },
      onPanResponderMove: (event, gesture) => {
        if (NATIVE) {
          moveNative(event);
          return;
        }
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
        if (NATIVE) {
          finishNative();
          return;
        }
        drag.current = null;
        pinch.current = null;
      },
      onPanResponderTerminate: () => {
        if (NATIVE) {
          finishNative();
          return;
        }
        drag.current = null;
        pinch.current = null;
      },
    }),
  ).current;

  useLayoutEffect(() => {
    if (!NATIVE || !gestureRef.current) return;
    const live = liveRef.current;
    applyViewBox(live.box);
    applyLayer(live.transform, live.origin, true);
  });

  useLayoutEffect(() => {
    if (!NATIVE || gestureRef.current) return;
    applyLayer(null, null, false);
  }, [view]);

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
      <View ref={layerRef} style={styles.layer} collapsable={false}>
      <Svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
      >
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
                if (!unserved) onSelectRef.current?.(geo.id);
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
      </View>
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
}, (prev, next) => {
  if (prev.selectedId !== next.selectedId) return false;
  if (prev.focusId !== next.focusId || prev.focusNonce !== next.focusNonce) return false;
  if (prev.showTankers !== next.showTankers || prev.trackTankerId !== next.trackTankerId) return false;
  if (prev.fitKey !== next.fitKey) return false;
  if (prev.home?.x !== next.home?.x || prev.home?.y !== next.home?.y) return false;
  if (prev.districts !== next.districts && !sameDistricts(prev.districts, next.districts)) return false;
  const moving = Boolean(next.showTankers || next.trackTankerId);
  if (moving && (prev.now !== next.now || prev.tankers !== next.tankers)) return false;
  return true;
});

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
  layer: { flex: 1 },
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
