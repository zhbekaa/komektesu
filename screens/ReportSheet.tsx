import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
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
  busy,
  success,
  onClose,
  onSubmit,
  onTrack,
}: {
  place: string;
  busy: boolean;
  success: string | null;
  onClose: () => void;
  onSubmit: (type: ReportType) => void;
  onTrack: () => void;
}) {
  const [picked, setPicked] = useState<ReportType | null>(null);

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
            <Pressable style={styles.track} onPress={onTrack}>
              <Text style={styles.trackText}>Следить на карте</Text>
            </Pressable>
          </View>
        ) : (
          ISSUES.map((issue) => (
            <Pressable
              key={issue.type}
              style={styles.issue}
              disabled={busy}
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
          ))
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
});
