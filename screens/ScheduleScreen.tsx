import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { dayLabel, statusColor, statusLabel } from "../lib/format";
import { colors, font } from "../lib/theme";
import type { Snapshot } from "../lib/types";

export function ScheduleScreen({
  snapshot,
  districtId,
  onDistrict,
}: {
  snapshot: Snapshot;
  districtId: string;
  onDistrict: (id: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const district = snapshot.districts.find((item) => item.id === districtId) ?? snapshot.districts[0];
  const slots = snapshot.schedules[district.id] ?? [];
  const warning =
    district.status === "none"
      ? `Сегодня в ${district.name} воды нет`
      : district.status === "low"
        ? `Сегодня в ${district.name} возможны перебои с давлением`
        : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>График подачи</Text>
      {warning && offset === 0 ? (
        <View style={styles.warning}>
          <Ionicons name="warning" size={22} color={colors.amber} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ) : null}
      <View style={styles.filters}>
        <Pressable style={styles.select} onPress={() => setOpen((value) => !value)}>
          <Text style={styles.selectText}>{district.name}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.text} />
        </Pressable>
        <Pressable style={styles.other} onPress={() => setOpen(true)}>
          <Ionicons name="location" size={16} color={colors.blue} />
          <Text style={styles.otherText}>Другой район</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={styles.menu}>
          {snapshot.districts.map((item) => (
            <Pressable
              key={item.id}
              style={styles.menuItem}
              onPress={() => {
                onDistrict(item.id);
                setOpen(false);
              }}
            >
              <Text style={styles.menuText}>{item.name}</Text>
              <Text style={{ color: statusColor(item.status), fontFamily: font.medium, fontSize: 12 }}>
                {statusLabel(item.status)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.dateRow}>
        <View style={styles.dateLabel}>
          <Ionicons name="calendar-outline" size={18} color={colors.text} />
          <Text style={styles.dateText}>{dayLabel(offset)}</Text>
        </View>
        <View style={styles.dateNav}>
          <Pressable hitSlop={8} onPress={() => setOffset((value) => value - 1)}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => setOffset((value) => value + 1)}>
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <View style={styles.list}>
        {slots.map((slot, index) => (
          <View key={`${slot.from}-${slot.to}`}>
            <View style={styles.slot}>
              <View style={styles.when}>
                <MaterialCommunityIcons name="water" size={22} color={statusColor(slot.status)} />
                <View>
                  <Text style={styles.whenTime}>
                    {slot.from} – {slot.to}
                  </Text>
                  <Text style={styles.whenTitle}>{slot.title}</Text>
                </View>
              </View>
              <View style={styles.state}>
                <View style={[styles.dot, { backgroundColor: statusColor(slot.status) }]} />
                <Text style={[styles.stateText, { color: statusColor(slot.status) }]}>{statusLabel(slot.status)}</Text>
              </View>
            </View>
            {index < slots.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>
      <View style={styles.note}>
        <View style={styles.info}>
          <Ionicons name="information" size={18} color={colors.blue} />
        </View>
        <View style={styles.noteCopy}>
          <Text style={styles.noteTitle}>Важно знать</Text>
          <Text style={styles.noteBody}>В случае изменений графика мы отправим уведомление.</Text>
        </View>
        <MaterialCommunityIcons name="faucet" size={36} color={colors.blue} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 8, gap: 12 },
  title: { fontFamily: font.bold, fontSize: 28, color: colors.text },
  warning: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: colors.amberSoft,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningText: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.amber, lineHeight: 16 },
  filters: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 8,
  },
  selectText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  other: { flexDirection: "row", alignItems: "center", gap: 6 },
  otherText: { fontFamily: font.semibold, fontSize: 14, color: colors.blue },
  menu: { backgroundColor: colors.white, borderRadius: 16, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  dateLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateText: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  dateNav: { flexDirection: "row", gap: 14 },
  list: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  slot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, gap: 8 },
  when: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  whenTime: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  whenTitle: { fontFamily: font.regular, fontSize: 13, color: colors.secondary, marginTop: 2 },
  state: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stateText: { fontFamily: font.medium, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.line },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.blueSoft,
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 14,
  },
  info: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  noteCopy: { flex: 1, gap: 2 },
  noteTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  noteBody: { fontFamily: font.regular, fontSize: 12, color: colors.secondary, lineHeight: 16 },
});
