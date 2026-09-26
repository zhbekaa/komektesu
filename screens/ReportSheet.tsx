import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, font } from "../lib/theme";
import type { ReportType } from "../lib/types";

const ISSUES: { type: ReportType; title: string; hint: string; color: string }[] = [
  { type: "no_water", title: "Нет воды", hint: "Холодная вода пропала", color: colors.red },
  { type: "no_hot", title: "Нет горячей воды", hint: "Горячей воды нет", color: colors.amber },
  { type: "low_pressure", title: "Слабый напор", hint: "Вода есть, давление низкое", color: colors.amber },
  { type: "emergency", title: "Авария", hint: "Прорыв или затопление", color: colors.red },
];

export function ReportSheet({
  place,
  building,
  onBuilding,
  otherDistrict,
  busy,
  success,
  requestStatus,
  canTrack,
  onClose,
  onSubmit,
  onRequest,
  onTrack,
}: {
  place: string;
  building: string;
  onBuilding: (value: string) => void;
  otherDistrict: boolean;
  busy: boolean;
  success: string | null;
  requestStatus: "accepted" | "en_route" | "serving" | null;
  canTrack: boolean;
  onClose: () => void;
  onSubmit: (type: ReportType) => void;
  onRequest: () => void;
  onTrack: () => void;
}) {
  const [picked, setPicked] = useState<ReportType | null>(null);
  const houseReady = building.trim().length > 0;

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.dismiss} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Сообщить о проблеме</Text>
        <Text style={styles.place}>{place}</Text>
        {success ? (
          <View style={styles.success}>
            <MaterialCommunityIcons name="truck" size={28} color={colors.blue} />
            <Text style={styles.successText}>{success}</Text>
            {requestStatus === "accepted" ? (
              <Text style={styles.issueHint}>Заявка на подвоз к дому {building.trim()} ждёт диспетчера.</Text>
            ) : null}
            {requestStatus === "en_route" || requestStatus === "serving" ? (
              <Text style={styles.issueHint}>Водовоз уже назначен на этот адрес.</Text>
            ) : null}
            {canTrack ? (
              <Pressable style={styles.track} onPress={onTrack}>
                <Text style={styles.trackText}>Следить за водовозом</Text>
              </Pressable>
            ) : null}
            {requestStatus ? null : (
              <Pressable style={styles.track} disabled={busy} onPress={onRequest}>
                <Text style={styles.trackText}>{busy ? "Отправляем…" : "Запросить подвоз к этому дому"}</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose}>
              <Text style={styles.later}>Закрыть</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.issueHint}>Дом, о котором сигнал</Text>
            <TextInput
              value={building}
              onChangeText={onBuilding}
              keyboardType="number-pad"
              placeholder="Номер дома"
              placeholderTextColor={colors.muted}
              style={styles.building}
            />
            {otherDistrict ? (
              <Text style={styles.issueHint}>Это не ваш домашний район. Укажите дом именно здесь.</Text>
            ) : null}
            {ISSUES.map((issue) => (
              <Pressable
                key={issue.type}
                style={[styles.issue, !houseReady && { opacity: 0.45 }]}
                disabled={busy || !houseReady}
                onPress={() => {
                  setPicked(issue.type);
                  onSubmit(issue.type);
                }}
              >
                <MaterialCommunityIcons name="water" size={22} color={issue.color} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.issueTitle}>{issue.title}</Text>
                  <Text style={styles.issueHint}>{issue.hint}</Text>
                </View>
                {busy && picked === issue.type ? (
                  <ActivityIndicator color={colors.blue} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                )}
              </Pressable>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", backgroundColor: "rgba(27,31,39,0.35)" },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 8,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 6 },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.text },
  place: { fontFamily: font.medium, fontSize: 14, color: colors.secondary, marginBottom: 6 },
  issue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  issueTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  issueHint: { fontFamily: font.regular, fontSize: 13, color: colors.secondary, marginTop: 2 },
  success: { alignItems: "flex-start", gap: 12, paddingVertical: 8 },
  successText: { fontFamily: font.semibold, fontSize: 16, color: colors.text, lineHeight: 22 },
  track: { backgroundColor: colors.blue, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
  trackText: { color: colors.white, fontFamily: font.semibold, fontSize: 15 },
  later: { color: colors.blue, fontFamily: font.semibold, fontSize: 15, paddingVertical: 4 },
  building: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.text,
  },
});
