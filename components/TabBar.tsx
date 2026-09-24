import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, font } from "../lib/theme";

export type TabId = "map" | "schedule" | "tankers" | "profile";

const TABS: { id: TabId; label: string; icon: "map" | "calendar" | "truck" | "person" }[] = [
  { id: "map", label: "Карта", icon: "map" },
  { id: "schedule", label: "График", icon: "calendar" },
  { id: "tankers", label: "Водовозы", icon: "truck" },
  { id: "profile", label: "Профиль", icon: "person" },
];

export function TabBar({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {TABS.map((item) => {
          const active = tab === item.id;
          const color = active ? colors.blue : colors.muted;
          return (
            <Pressable key={item.id} style={styles.tab} onPress={() => onChange(item.id)}>
              {item.icon === "truck" ? (
                <MaterialCommunityIcons name="truck-outline" size={22} color={color} />
              ) : (
                <Ionicons
                  name={item.icon === "map" ? "map-outline" : item.icon === "calendar" ? "calendar-outline" : "person-outline"}
                  size={22}
                  color={color}
                />
              )}
              <Text style={[styles.label, { color, fontFamily: active ? font.semibold : font.medium }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 6,
    paddingBottom: 10,
  },
  row: { flexDirection: "row" },
  tab: { flex: 1, alignItems: "center", gap: 4, paddingTop: 4 },
  label: { fontSize: 11 },
});
