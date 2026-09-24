import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { DistrictMap } from "../components/DistrictMap";
import { ago, liveTanker, tankerLabel } from "../lib/format";
import { colors, font } from "../lib/theme";
import type { DeliveryRequest, Snapshot, Tanker } from "../lib/types";

export function TankersScreen({
  snapshot,
  now,
  onRequest,
  onOpenRequests,
  onTrack,
  busy,
}: {
  snapshot: Snapshot;
  now: number;
  onRequest: () => void;
  onOpenRequests: () => void;
  onTrack: (tankerId: string) => void;
  busy: boolean;
}) {
  const idle = snapshot.tankers
    .filter((tanker) => tanker.status === "idle" && tanker.etaToHome != null)
    .sort((a, b) => (a.etaToHome ?? 99) - (b.etaToHome ?? 99));
  const nearest = idle[0] ?? snapshot.tankers.find((tanker) => tanker.status === "en_route");
  const active = snapshot.requests.filter((request) => request.status !== "done");
  const moving = snapshot.tankers.some((tanker) => tanker.status === "en_route");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Водовозы</Text>
      <View style={styles.banner}>
        <MaterialCommunityIcons name="water" size={20} color={colors.blue} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Доступно {snapshot.tankers.length} водовозов в городе</Text>
          <Text style={styles.bannerSub}>Обновлено {ago(snapshot.serverTime - 2 * 60 * 1000, snapshot.serverTime)}</Text>
        </View>
      </View>
      <View style={styles.mapCard}>
        <DistrictMap districts={snapshot.districts} tankers={snapshot.tankers} showTankers now={now} />
        {nearest ? (
          <View style={styles.nearest}>
            <View style={styles.nearestHead}>
              <View style={styles.truckIcon}>
                <MaterialCommunityIcons name="truck" size={20} color={colors.blue} />
              </View>
              <Text style={styles.nearestTitle}>Ближайший водовоз №{nearest.number}</Text>
              <View style={[styles.badge, nearest.status === "idle" ? styles.badgeFree : styles.badgeBusy]}>
                <Text style={[styles.badgeText, { color: nearest.status === "idle" ? colors.green : colors.blue }]}>
                  {tankerLabel(nearest.status)}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.meta}>
                <Ionicons name="time-outline" size={14} color={colors.secondary} />
                <Text style={styles.metaText}>До вас {nearest.etaToHome ?? nearest.etaMinutes} мин</Text>
              </View>
              <View style={styles.meta}>
                <MaterialCommunityIcons name="water" size={14} color={colors.blue} />
                <Text style={styles.metaText}>Запас воды {nearest.waterLiters.toLocaleString("ru-RU")} л</Text>
              </View>
            </View>
            <Pressable
              style={styles.cta}
              disabled={busy}
              onPress={() => (moving && nearest.status !== "idle" ? onTrack(nearest.id) : onRequest())}
            >
              <Text style={styles.ctaText}>
                {nearest.status === "en_route" ? "Следить на карте" : busy ? "Отправляем…" : "Запросить подвоз"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={styles.requestsHead}>
        <Text style={styles.requestsTitle}>Мои активные заявки</Text>
        <Pressable style={styles.all} onPress={onOpenRequests}>
          <Text style={styles.allText}>Все</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.blue} />
        </Pressable>
      </View>
      {active.length === 0 ? <Text style={styles.empty}>Активных заявок нет</Text> : null}
      {active.map((request) => {
        const tanker = snapshot.tankers.find((item) => item.id === request.tankerId);
        return (
          <Pressable key={request.id} onPress={() => tanker && onTrack(tanker.id)}>
            <RequestCard request={request} tanker={tanker} now={now} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function RequestCard({ request, tanker, now }: { request: DeliveryRequest; tanker?: Tanker; now: number }) {
  const live = tanker ? liveTanker(tanker, now) : null;
  const state = request.status === "done" ? "На месте" : request.status === "en_route" ? "В пути" : "Принята";
  const eta = live && request.status === "en_route" ? `На подходе ~ ${live.eta} мин` : request.status === "accepted" ? `На подходе ~ ${tanker?.etaToHome ?? 8} мин` : "Можно набирать воду";
  return (
    <View style={styles.request}>
      <View style={styles.truckIconLg}>
        <MaterialCommunityIcons name="truck" size={20} color={colors.blue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.requestTitle}>Заявка №{request.number}</Text>
        <Text style={styles.requestSub}>
          {request.districtId} мкр, дом {request.building}
        </Text>
      </View>
      <View style={styles.requestState}>
        <View style={styles.accepted}>
          <Text style={styles.acceptedText}>{state}</Text>
        </View>
        <Text style={styles.eta}>{eta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 24 },
  title: { fontFamily: font.bold, fontSize: 28, color: colors.text, paddingHorizontal: 16, paddingTop: 6 },
  banner: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  bannerTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  bannerSub: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  mapCard: { height: 430, marginTop: 10 },
  nearest: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    shadowColor: "#1A2947",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  nearestHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  truckIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  nearestTitle: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.text },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeFree: { backgroundColor: colors.greenSoft },
  badgeBusy: { backgroundColor: colors.blueSoft },
  badgeText: { fontFamily: font.semibold, fontSize: 12 },
  metaRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontFamily: font.medium, fontSize: 13, color: colors.secondary },
  cta: { backgroundColor: colors.blue, borderRadius: 999, alignItems: "center", paddingVertical: 12 },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: colors.white },
  requestsHead: {
    marginTop: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestsTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  all: { flexDirection: "row", alignItems: "center", gap: 2 },
  allText: { fontFamily: font.semibold, fontSize: 14, color: colors.blue },
  empty: { marginHorizontal: 16, marginTop: 10, color: colors.muted, fontFamily: font.regular },
  request: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  truckIconLg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  requestTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  requestSub: { fontFamily: font.regular, fontSize: 12, color: colors.secondary, marginTop: 2 },
  requestState: { alignItems: "flex-end", gap: 4 },
  accepted: { backgroundColor: colors.blueSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  acceptedText: { fontFamily: font.semibold, fontSize: 11, color: colors.blue },
  eta: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
});
