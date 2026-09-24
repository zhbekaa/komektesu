import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { DistrictMap } from "../components/DistrictMap";
import { findDistrict, joinDistricts, type DistrictView } from "../lib/districts";
import { ago, causeLine, MAP_FILL, statusColor, statusLabel } from "../lib/format";
import { colors, font } from "../lib/theme";
import type { Snapshot } from "../lib/types";

export function MapScreen({
  snapshot,
  now,
  selectedId,
  onSelect,
  onReport,
  onNotifications,
  onProfile,
}: {
  snapshot: Snapshot;
  now: number;
  selectedId: string;
  onSelect: (id: string) => void;
  onReport: () => void;
  onNotifications: () => void;
  onProfile: () => void;
}) {
  const [query, setQuery] = useState("");
  const [legend, setLegend] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const districts = joinDistricts(snapshot.districts);
  const selected = findDistrict(districts, selectedId);
  const unread = snapshot.notifications.filter((item) => !item.read).length;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return districts.filter(
      (district) =>
        district.name.toLowerCase().includes(q) ||
        district.nameKk.toLowerCase().includes(q) ||
        district.id.includes(q),
    );
  }, [query, districts]);

  const none = districts.filter((district) => district.status === "none");
  const low = districts.filter((district) => district.status === "low");
  const others = [...none, ...low].filter((district) => district.id !== selected.id).length;
  const banner =
    selected.status === "none"
      ? { bg: colors.redSoft, color: colors.red, text: others ? `Нет воды: ${selected.name} · ещё ${others}` : `Нет воды: ${selected.name}` }
      : selected.status === "low"
        ? { bg: colors.amberSoft, color: colors.amber, text: others ? `Слабый напор: ${selected.name} · ещё ${others}` : `Слабый напор: ${selected.name}` }
        : none.length || low.length
          ? {
              bg: colors.amberSoft,
              color: colors.amber,
              text: `${selected.name}: норма · ${[none.length ? `нет воды ${none.length}` : "", low.length ? `слабый напор ${low.length}` : ""].filter(Boolean).join(", ")}`,
            }
          : { bg: colors.greenSoft, color: colors.green, text: `${selected.name}: вода подаётся стабильно` };

  function choose(id: string) {
    onSelect(id);
    setFocusId(id);
    setFocusNonce((value) => value + 1);
    setQuery("");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Введите микрорайон"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        <Pressable onPress={onNotifications} hitSlop={8}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread > 0 ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable style={styles.avatar} onPress={onProfile}>
          <Ionicons name="person" size={18} color={colors.blue} />
        </Pressable>
      </View>
      {matches.length > 0 ? (
        <View style={styles.results}>
          {matches.map((district) => (
            <Pressable
              key={district.id}
              style={styles.result}
              onPress={() => choose(district.id)}
            >
              <Text style={styles.resultText}>{district.name}</Text>
              <Text style={{ color: statusColor(district.status), fontFamily: font.medium, fontSize: 13 }}>
                {statusLabel(district.status)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.bannerWrap}>
        <View style={[styles.banner, { backgroundColor: banner.bg }]}>
          <MaterialCommunityIcons name="water" size={16} color={banner.color} />
          <Text style={[styles.bannerText, { color: banner.color }]} numberOfLines={2}>
            {banner.text}
          </Text>
        </View>
      </View>
      <View style={styles.mapWrap}>
        <DistrictMap
          districts={districts}
          selectedId={selected.id}
          focusId={focusId}
          focusNonce={focusNonce}
          onSelect={choose}
          now={now}
          home={(() => {
            const home = findDistrict(districts, snapshot.homeDistrictId);
            return home ? { x: home.center.x, y: home.center.y } : null;
          })()}
        />
        <Pressable style={styles.eye} onPress={() => setLegend((value) => !value)}>
          <Ionicons name={legend ? "eye-off-outline" : "eye-outline"} size={20} color={colors.text} />
        </Pressable>
        {legend ? <Legend /> : null}
        <DistrictCard district={selected} now={snapshot.serverTime} />
      </View>
      <Pressable style={styles.report} onPress={onReport}>
        <Ionicons name="add" size={18} color={colors.white} />
        <Text style={styles.reportText}>Сообщить о проблеме</Text>
      </Pressable>
    </View>
  );
}

function DistrictCard({ district, now }: { district: DistrictView; now: number }) {
  const color = statusColor(district.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardTitle}>
        <Text style={styles.cardName}>{district.name}</Text>
        <View style={styles.pressure}>
          <MaterialCommunityIcons name="water" size={16} color={color} />
          <Text style={[styles.pressureText, { color }]}>{statusLabel(district.status)}</Text>
        </View>
      </View>
      {district.cause ? (
        <View style={styles.meta}>
          <Ionicons name="warning-outline" size={14} color={colors.secondary} />
          <Text style={styles.metaText}>{causeLine(district.cause, district.expectedNormalAt)}</Text>
        </View>
      ) : null}
      <View style={styles.meta}>
        <Ionicons name="speedometer-outline" size={14} color={colors.secondary} />
        <Text style={styles.metaText}>Давление {district.pressureBar.toFixed(1)} бар · демо</Text>
      </View>
      <View style={styles.updated}>
        <View style={styles.meta}>
          <Ionicons name="refresh" size={14} color={colors.muted} />
          <Text style={styles.updatedText}>Обновлено {ago(district.updatedAt, now)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </View>
    </View>
  );
}

function Legend() {
  const rows = [
    { color: MAP_FILL.normal, label: "Нормальное давление" },
    { color: MAP_FILL.low, label: "Слабый напор / по графику" },
    { color: MAP_FILL.none, label: "Воды нет" },
  ];
  return (
    <View style={styles.legend}>
      {rows.map((row) => (
        <View key={row.label} style={styles.legendRow}>
          <View style={[styles.swatch, { backgroundColor: row.color }]} />
          <Text style={styles.legendText}>{row.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  search: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.field,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.text, padding: 0 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  results: {
    marginHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  result: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  resultText: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  bannerWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  bannerText: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 16 },
  mapWrap: { flex: 1 },
  eye: {
    position: "absolute",
    right: 16,
    bottom: 126,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A2640",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  legend: {
    position: "absolute",
    right: 16,
    bottom: 174,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    shadowColor: "#1A2640",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontFamily: font.medium, fontSize: 12, color: colors.text },
  card: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 14,
    gap: 8,
    shadowColor: "#1A2640",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  cardTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardName: { fontFamily: font.semibold, fontSize: 20, color: colors.text },
  pressure: { flexDirection: "row", alignItems: "center", gap: 6 },
  pressureText: { fontFamily: font.medium, fontSize: 14 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontFamily: font.regular, fontSize: 13, color: colors.secondary },
  updated: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  updatedText: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  report: {
    position: "absolute",
    alignSelf: "center",
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.blue,
    borderRadius: 999,
    paddingLeft: 18,
    paddingRight: 20,
    paddingVertical: 14,
    shadowColor: "#2E59F2",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  reportText: { fontFamily: font.semibold, fontSize: 16, color: colors.white },
});
