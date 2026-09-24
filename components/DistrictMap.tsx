import { useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fillFor, liveTanker } from "../lib/format";
import { colors, font } from "../lib/theme";
import type { District, Tanker } from "../lib/types";

type Box = { width: number; height: number };

function project(box: Box, x: number, y: number) {
  const scale = Math.max(box.width / 390, box.height / 640);
  const offsetX = (box.width - 390 * scale) / 2;
  return { left: offsetX + x * scale, top: y * scale, scale };
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
}: {
  districts: District[];
  tankers?: Tanker[];
  showTankers?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  now: number;
  home?: { x: number; y: number } | null;
  trackTankerId?: string | null;
}) {
  const [box, setBox] = useState<Box>({ width: 390, height: 520 });

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width !== box.width || height !== box.height) setBox({ width, height });
  }

  const tracked = trackTankerId ? tankers.find((tanker) => tanker.id === trackTankerId) : null;
  const trackedLive = tracked ? liveTanker(tracked, now) : null;

  return (
    <View style={styles.map} onLayout={onLayout}>
      <Svg width={box.width} height={box.height} viewBox="0 0 390 640" preserveAspectRatio="xMidYMin slice">
        <Rect width="390" height="640" fill={colors.water} />
        {districts.map((district) => (
          <Path
            key={district.id}
            d={district.path}
            fill={fillFor(district.status, district.baseFill)}
            stroke={selectedId === district.id ? colors.blue : colors.white}
            strokeWidth={selectedId === district.id ? 8 : 6}
            strokeLinejoin="round"
            onPress={() => onSelect?.(district.id)}
          />
        ))}
        {trackedLive && home ? (
          <Line
            x1={trackedLive.x}
            y1={trackedLive.y}
            x2={home.x}
            y2={home.y}
            stroke={colors.blue}
            strokeWidth={3}
            strokeDasharray="7 6"
          />
        ) : null}
      </Svg>
      {districts.map((district) => {
        const point = project(box, district.label.x, district.label.y);
        return (
          <Pressable
            key={`${district.id}-label`}
            style={[styles.labelHit, { left: point.left, top: point.top }]}
            onPress={() => onSelect?.(district.id)}
          >
            <Text style={styles.label}>{district.name}</Text>
          </Pressable>
        );
      })}
      {(() => {
        const city = project(box, 16, 448);
        return <Text style={[styles.label, { position: "absolute", left: city.left, top: city.top }]}>Актау</Text>;
      })()}
      {showTankers
        ? tankers.map((tanker) => {
            const live = liveTanker(tanker, now);
            const point = project(box, live.x, live.y);
            const size = 34;
            return (
              <View
                key={tanker.id}
                style={[
                  styles.pin,
                  {
                    left: point.left - size / 2,
                    top: point.top - size / 2,
                    backgroundColor: tanker.id === trackTankerId ? colors.blue : colors.blue,
                  },
                ]}
              >
                <MaterialCommunityIcons name="truck" size={18} color={colors.white} />
              </View>
            );
          })
        : null}
      {home
        ? (() => {
            const point = project(box, home.x, home.y);
            return <View style={[styles.home, { left: point.left - 7, top: point.top - 7 }]} />;
          })()
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: colors.water, overflow: "hidden" },
  labelHit: { position: "absolute" },
  label: { fontFamily: font.semibold, fontSize: 12, color: colors.text },
  pin: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A2947",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  home: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.blue,
  },
});
