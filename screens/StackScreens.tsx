import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DistrictMap } from "../components/DistrictMap";
import { ago, liveTanker, reportLabel } from "../lib/format";
import { colors, font } from "../lib/theme";
import type { Profile, Snapshot } from "../lib/types";

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

export function NotificationsScreen({ snapshot, onBack }: { snapshot: Snapshot; onBack: () => void }) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Уведомления" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.pad}>
        {snapshot.notifications.map((item) => (
          <View key={item.id} style={[styles.card, !item.read && styles.unread]}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
            <Text style={styles.time}>{ago(item.createdAt, snapshot.serverTime)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function HistoryScreen({
  snapshot,
  profile,
  onBack,
}: {
  snapshot: Snapshot;
  profile: Profile;
  onBack: () => void;
}) {
  const mine = snapshot.reports.filter((report) => report.residentName === profile.name);
  return (
    <View style={styles.screen}>
      <ScreenHeader title="История сигналов" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.pad}>
        {mine.map((report) => (
          <View key={report.id} style={styles.card}>
            <Text style={styles.cardTitle}>{reportLabel(report.type)}</Text>
            <Text style={styles.cardBody}>
              {report.districtId} мкр, дом {report.building}
              {report.confirmed ? " · подтверждено" : ""}
            </Text>
            <Text style={styles.time}>{ago(report.createdAt, snapshot.serverTime)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function FavoritesScreen({
  snapshot,
  profile,
  onToggle,
  onBack,
}: {
  snapshot: Snapshot;
  profile: Profile;
  onToggle: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Избранные районы" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.pad}>
        {snapshot.districts.map((district) => {
          const on = profile.favorites.includes(district.id);
          return (
            <Pressable key={district.id} style={styles.row} onPress={() => onToggle(district.id)}>
              <Text style={styles.cardTitle}>{district.name}</Text>
              <Ionicons name={on ? "heart" : "heart-outline"} size={22} color={on ? colors.red : colors.muted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function LanguageScreen({
  language,
  onChange,
  onBack,
}: {
  language: Profile["language"];
  onChange: (language: Profile["language"]) => void;
  onBack: () => void;
}) {
  const options: { id: Profile["language"]; label: string }[] = [
    { id: "ru", label: "Русский" },
    { id: "kk", label: "Қазақша" },
  ];
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Язык приложения" onBack={onBack} />
      <View style={styles.pad}>
        {options.map((option) => (
          <Pressable key={option.id} style={styles.row} onPress={() => onChange(option.id)}>
            <Text style={styles.cardTitle}>{option.label}</Text>
            {language === option.id ? <Ionicons name="checkmark" size={22} color={colors.blue} /> : null}
          </Pressable>
        ))}
        <Text style={styles.note}>
          {language === "ru"
            ? "Интерфейс жителя показан на русском, как в макете."
            : "Қазақ тілі сақталды. Негізгі экрандар әзірге орыс тілінде."}
        </Text>
      </View>
    </View>
  );
}

export function SupportScreen({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Поддержка" onBack={onBack} />
      <View style={styles.pad}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Опишите вопрос"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
        />
        <Pressable
          style={[styles.button, !text.trim() && { opacity: 0.5 }]}
          disabled={!text.trim()}
          onPress={() => setSent(true)}
        >
          <Text style={styles.buttonText}>{sent ? "Отправлено" : "Отправить"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="О приложении" onBack={onBack} />
      <View style={styles.pad}>
        <Text style={styles.cardTitle}>Komektesu</Text>
        <Text style={styles.cardBody}>
          Карта воды в Актау для жителей и диспетчерская для акимата. Зелёный район — давление в норме, жёлтый — подача по графику, красный — воды нет. Водовоз можно отследить на карте, как машину в пути.
        </Text>
      </View>
    </View>
  );
}

export function AddressScreen({
  snapshot,
  profile,
  onSave,
  onBack,
}: {
  snapshot: Snapshot;
  profile: Profile;
  onSave: (districtId: string, building: string) => void;
  onBack: () => void;
}) {
  const [districtId, setDistrictId] = useState(profile.districtId);
  const [building, setBuilding] = useState(profile.building);
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Адрес" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.label}>Микрорайон</Text>
        <View style={styles.chips}>
          {snapshot.districts.map((district) => (
            <Pressable
              key={district.id}
              style={[styles.chip, district.id === districtId && styles.chipOn]}
              onPress={() => setDistrictId(district.id)}
            >
              <Text style={[styles.chipText, district.id === districtId && styles.chipTextOn]}>{district.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Дом</Text>
        <TextInput value={building} onChangeText={setBuilding} keyboardType="number-pad" style={styles.field} />
        <Pressable style={styles.button} onPress={() => onSave(districtId, building.trim() || "12")}>
          <Text style={styles.buttonText}>Сохранить</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function RequestsScreen({ snapshot, now, onBack, onTrack }: { snapshot: Snapshot; now: number; onBack: () => void; onTrack: (id: string) => void }) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Заявки" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.pad}>
        {snapshot.requests.map((request) => {
          const tanker = snapshot.tankers.find((item) => item.id === request.tankerId);
          const live = tanker ? liveTanker(tanker, now) : null;
          return (
            <Pressable key={request.id} style={styles.card} onPress={() => tanker && onTrack(tanker.id)}>
              <Text style={styles.cardTitle}>Заявка №{request.number}</Text>
              <Text style={styles.cardBody}>
                {request.districtId} мкр, дом {request.building}
                {tanker ? ` · водовоз №${tanker.number}` : ""}
                {live && request.status === "en_route" ? ` · ${live.eta} мин` : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function TrackScreen({
  snapshot,
  now,
  tankerId,
  onBack,
}: {
  snapshot: Snapshot;
  now: number;
  tankerId: string;
  onBack: () => void;
}) {
  const tanker = snapshot.tankers.find((item) => item.id === tankerId);
  const district = snapshot.districts.find((item) => item.id === (tanker?.targetDistrictId ?? snapshot.homeDistrictId));
  const live = tanker ? liveTanker(tanker, now) : null;
  const home = district ? { x: district.anchor.x, y: district.anchor.y + 16 } : null;
  return (
    <View style={styles.screen}>
      <ScreenHeader title={tanker ? `Водовоз №${tanker.number}` : "Водовоз"} onBack={onBack} />
      <View style={{ flex: 1 }}>
        <DistrictMap
          districts={snapshot.districts}
          tankers={tanker ? [tanker] : []}
          showTankers
          now={now}
          home={home}
          trackTankerId={tankerId}
          selectedId={district?.id}
        />
      </View>
      <View style={styles.trackCard}>
        <Text style={styles.cardTitle}>
          {tanker && live && tanker.status === "en_route"
            ? `Водовоз №${tanker.number} прибудет к вашему дому через ${live.eta} мин`
            : tanker?.status === "serving"
              ? `Водовоз №${tanker.number} на месте`
              : "Машина ещё не выехала"}
        </Text>
        <Text style={styles.cardBody}>{district ? `${district.name}, можно следить за точкой на карте` : ""}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white },
  headerTitle: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  pad: { padding: 16, gap: 10 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, gap: 4 },
  unread: { borderWidth: 1, borderColor: colors.blueSoft },
  cardTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  cardBody: { fontFamily: font.regular, fontSize: 13, color: colors.secondary, lineHeight: 18 },
  time: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  row: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  note: { fontFamily: font.regular, fontSize: 13, color: colors.secondary, lineHeight: 18, marginTop: 8 },
  input: {
    minHeight: 120,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
  },
  button: { backgroundColor: colors.blue, borderRadius: 999, alignItems: "center", paddingVertical: 14, marginTop: 8 },
  buttonText: { color: colors.white, fontFamily: font.semibold, fontSize: 16 },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.secondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.blue },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  chipTextOn: { color: colors.white },
  field: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  trackCard: { backgroundColor: colors.white, padding: 16, gap: 6 },
});
