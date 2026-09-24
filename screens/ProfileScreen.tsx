import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { lastSignalLabel } from "../lib/format";
import { colors, font } from "../lib/theme";
import type { Profile, Snapshot } from "../lib/types";

export type ProfileRoute = "history" | "notifications" | "favorites" | "language" | "support" | "about" | "address";

export function ProfileScreen({
  snapshot,
  profile,
  onOpen,
}: {
  snapshot: Snapshot;
  profile: Profile;
  onOpen: (route: ProfileRoute) => void;
}) {
  const mine = snapshot.reports.filter((report) => report.residentName === profile.name);
  const confirmed = mine.filter((report) => report.confirmed).length;
  const last = mine[0];
  const unread = snapshot.notifications.filter((item) => !item.read).length;
  const district = snapshot.districts.find((item) => item.id === profile.districtId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.hero}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.address}>
              {district?.name ?? profile.districtId}, дом {profile.building}
            </Text>
          </View>
          <Pressable onPress={() => onOpen("notifications")} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
          </Pressable>
        </View>
        <Pressable style={styles.edit} onPress={() => onOpen("address")}>
          <Ionicons name="pencil" size={14} color={colors.white} />
          <Text style={styles.editText}>Изменить адрес</Text>
        </Pressable>
      </View>
      <View style={styles.stats}>
        <Text style={styles.statsTitle}>Моя статистика</Text>
        <View style={styles.statsRow}>
          <Stat icon={<MaterialCommunityIcons name="access-point" size={26} color={colors.blue} />} value={String(mine.length)} label="Отправлено сигналов" />
          <View style={styles.statDivider} />
          <Stat icon={<Ionicons name="checkmark-circle" size={26} color={colors.green} />} value={String(confirmed)} label="Подтверждено службами" />
          <View style={styles.statDivider} />
          <Stat
            icon={<Ionicons name="time" size={26} color={colors.amber} />}
            value={last ? lastSignalLabel(last.createdAt, snapshot.serverTime) : "—"}
            label="Последний сигнал"
          />
        </View>
      </View>
      <View style={styles.menu}>
        <Row icon="time-outline" label="История сигналов" onPress={() => onOpen("history")} />
        <Row icon="notifications-outline" label="Мои уведомления" badge={unread} onPress={() => onOpen("notifications")} />
        <Row icon="heart-outline" label="Избранные районы" onPress={() => onOpen("favorites")} />
        <Row icon="globe-outline" label="Язык приложения" value={profile.language === "ru" ? "Русский" : "Қазақша"} onPress={() => onOpen("language")} />
        <Row icon="chatbubble-outline" label="Поддержка и обратная связь" onPress={() => onOpen("support")} />
        <Row icon="information-circle-outline" label="О приложении" onPress={() => onOpen("about")} last />
      </View>
    </ScrollView>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  badge,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  badge?: number;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.secondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.blue, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 78 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: font.bold, fontSize: 22, color: colors.white },
  address: { fontFamily: font.medium, fontSize: 14, color: colors.white, marginTop: 2 },
  edit: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 76, marginTop: 8 },
  editText: { fontFamily: font.medium, fontSize: 14, color: colors.white },
  stats: {
    marginHorizontal: 16,
    marginTop: -58,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: "#142447",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  statsTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.secondary, marginLeft: 8, marginBottom: 12 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontFamily: font.bold, fontSize: 22, color: colors.text },
  statLabel: { fontFamily: font.regular, fontSize: 11, color: colors.secondary, textAlign: "center" },
  statDivider: { width: 1, height: 56, backgroundColor: colors.line },
  menu: { marginHorizontal: 16, marginTop: 16, backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text },
  rowValue: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: colors.white, fontFamily: font.bold, fontSize: 11 },
});
