import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DistrictMap } from "../components/DistrictMap";
import { districtName, findDistrict, joinDistricts } from "../lib/districts";
import { sendFeedback } from "../lib/api";
import { ago, liveTanker, reportLabel } from "../lib/format";
import { colors, font } from "../lib/theme";
import type { Profile, Snapshot } from "../lib/types";

export function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      ) : (
        <View style={{ width: 24 }} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

export function NotificationsScreen({
  snapshot,
  residentName,
  onBack,
}: {
  snapshot: Snapshot;
  residentName: string;
  onBack: () => void;
}) {
  const items = snapshot.notifications.filter((item) => !item.audience || item.audience === residentName);
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Уведомления" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.pad}>
        {items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Уведомлений нет</Text>
            <Text style={styles.cardBody}>Здесь появятся отключения, назначение водовоза и ответ по вашему сигналу.</Text>
          </View>
        ) : null}
        {items.map((item) => (
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
        {mine.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Сигналов пока нет</Text>
            <Text style={styles.cardBody}>
              От имени {profile.name} ещё ничего не отправлено. Сообщение с карты появится здесь и останется, если вы смените адрес.
            </Text>
          </View>
        ) : null}
        {mine.map((report) => (
          <View key={report.id} style={styles.card}>
            <Text style={styles.cardTitle}>{reportLabel(report.type)}</Text>
            <Text style={styles.cardBody}>
              {districtName(report.districtId)}, дом {report.building}
              {report.confirmed ? " · подтверждено" : report.dismissed ? " · не подтверждено" : " · ждёт проверки"}
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
  onOpen,
  onBack,
}: {
  snapshot: Snapshot;
  profile: Profile;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const districts = joinDistricts(snapshot.districts);
  const saved = districts.filter((district) => profile.favorites.includes(district.id));
  const needle = query.trim().toLowerCase();
  const rest = needle
    ? districts.filter(
        (district) =>
          !profile.favorites.includes(district.id) &&
          (district.name.toLowerCase().includes(needle) ||
            district.nameKk.toLowerCase().includes(needle) ||
            district.id.toLowerCase().includes(needle)),
      )
    : [];
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Избранные районы" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {saved.length === 0 ? <Text style={styles.note}>Сохранённых районов нет.</Text> : null}
        {saved.length > 0 ? <Text style={styles.note}>Нажмите на район, чтобы открыть его на карте и в графике.</Text> : null}
        {saved.map((district) => (
          <View key={district.id} style={styles.row}>
            <Pressable style={{ flex: 1 }} onPress={() => onOpen(district.id)}>
              <Text style={styles.cardTitle}>{district.name}</Text>
            </Pressable>
            <Pressable onPress={() => onToggle(district.id)} hitSlop={8}>
              <Ionicons name="heart" size={22} color={colors.red} />
            </Pressable>
          </View>
        ))}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Найти район, чтобы добавить"
          placeholderTextColor={colors.muted}
          style={styles.field}
        />
        {!needle ? <Text style={styles.note}>Остальные районы откроются через поиск, весь список здесь не нужен.</Text> : null}
        {rest.map((district) => (
          <Pressable key={district.id} style={styles.row} onPress={() => onToggle(district.id)}>
            <Text style={styles.cardTitle}>{district.name}</Text>
            <Ionicons name="heart-outline" size={22} color={colors.muted} />
          </Pressable>
        ))}
        {needle && rest.length === 0 ? <Text style={styles.note}>Ничего не найдено</Text> : null}
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
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Язык приложения" onBack={onBack} />
      <View style={styles.pad}>
        <Pressable style={styles.row} onPress={() => onChange("ru")}>
          <Text style={styles.cardTitle}>Русский</Text>
          {language === "ru" ? <Ionicons name="checkmark" size={22} color={colors.blue} /> : null}
        </Pressable>
        <View style={[styles.row, { opacity: 0.45 }]}>
          <Text style={styles.cardTitle}>Қазақша</Text>
        </View>
        <Text style={styles.note}>Қазақша появится, когда будут готовы строки. Сейчас интерфейс на русском, и переключатель это показывает.</Text>
      </View>
    </View>
  );
}

export function SupportScreen({ residentName, onBack }: { residentName: string; onBack: () => void }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          editable={!sent}
          style={styles.input}
        />
        {error ? <Text style={styles.note}>{error}</Text> : null}
        {sent ? <Text style={styles.note}>Сообщение записано. Диспетчерская его получила.</Text> : null}
        <Pressable
          style={[styles.button, (!text.trim() || sent) && { opacity: 0.5 }]}
          disabled={!text.trim() || busy || sent}
          onPress={() => {
            setBusy(true);
            setError(null);
            void sendFeedback({ text, residentName })
              .then(() => setSent(true))
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Не удалось отправить"))
              .finally(() => setBusy(false));
          }}
        >
          <Text style={styles.buttonText}>{sent ? "Отправлено" : busy ? "Отправляем…" : "Отправить"}</Text>
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
          Карта микрорайонов Актау взята из OpenStreetMap: берег, дороги и границы настоящие. Давление, водовозы и жалобы на этой сборке — демо, пока нет телеметрии КЖСА. Зелёный район — норма, жёлтый — слабый напор, красный — воды нет.
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
  mode = "edit",
}: {
  snapshot: Snapshot;
  profile: Profile;
  onSave: (districtId: string, building: string, name: string) => void;
  onBack?: () => void;
  mode?: "gate" | "edit";
}) {
  const [name, setName] = useState(profile.name);
  const [districtId, setDistrictId] = useState(profile.districtId);
  const [building, setBuilding] = useState(profile.building);
  const [query, setQuery] = useState("");
  const ready = name.trim().length > 0 && building.trim().length > 0;
  const districts = joinDistricts(snapshot.districts);
  const selected = findDistrict(districts, districtId);
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? districts.filter(
        (district) =>
          district.name.toLowerCase().includes(needle) ||
          district.nameKk.toLowerCase().includes(needle) ||
          district.id.toLowerCase().includes(needle),
      )
    : [];
  return (
    <View style={styles.screen}>
      <ScreenHeader title={mode === "gate" ? "Ваш адрес" : "Адрес"} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {mode === "gate" ? (
          <Text style={styles.note}>
            Подтвердите имя и дом. Карта, график и заявки откроются для этого адреса. Поля уже заполнены для демо, их можно поменять.
          </Text>
        ) : null}
        <Text style={styles.label}>Имя</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Имя" placeholderTextColor={colors.muted} style={styles.field} />
        <Text style={styles.label}>Микрорайон</Text>
        <Text style={styles.picked}>{selected?.name ?? districtId}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск: 14, Шығыс, Самал…"
          placeholderTextColor={colors.muted}
          style={styles.field}
        />
        <View style={styles.menu}>
          {matches.map((district) => (
            <Pressable
              key={district.id}
              style={styles.menuItem}
              onPress={() => {
                setDistrictId(district.id);
                setQuery("");
              }}
            >
              <Text style={[styles.cardTitle, district.id === districtId && { color: colors.blue }]}>{district.name}</Text>
              {district.id === districtId ? <Ionicons name="checkmark" size={18} color={colors.blue} /> : null}
            </Pressable>
          ))}
          {needle && matches.length === 0 ? <Text style={styles.note}>Ничего не найдено</Text> : null}
          {!needle ? <Text style={styles.note}>В списке около 66 районов — начните вводить номер или название.</Text> : null}
        </View>
        <Text style={styles.label}>Дом</Text>
        <TextInput value={building} onChangeText={setBuilding} keyboardType="number-pad" style={styles.field} />
        <Pressable
          style={[styles.button, !ready && { opacity: 0.5 }]}
          disabled={!ready}
          onPress={() => onSave(districtId, building.trim(), name.trim())}
        >
          <Text style={styles.buttonText}>{mode === "gate" ? "Это мой адрес" : "Сохранить"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function RequestsScreen({
  snapshot,
  profile,
  now,
  onBack,
  onTrack,
}: {
  snapshot: Snapshot;
  profile: Profile;
  now: number;
  onBack: () => void;
  onTrack: (id: string) => void;
}) {
  const mine = snapshot.requests.filter((request) => request.residentName === profile.name);
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Заявки" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.pad}>
        {mine.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ваших заявок нет</Text>
            <Text style={styles.cardBody}>Заявка появится, когда вы запросите подвоз со своего адреса.</Text>
          </View>
        ) : null}
        {mine.map((request) => {
          const tanker = snapshot.tankers.find((item) => item.id === request.tankerId);
          const live = tanker ? liveTanker(tanker, now) : null;
          return (
            <Pressable key={request.id} style={styles.card} onPress={() => tanker && onTrack(tanker.id)}>
              <Text style={styles.cardTitle}>Заявка №{request.number}</Text>
              <Text style={styles.cardBody}>
                {districtName(request.districtId)}, дом {request.building}
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

function trackTitle(
  tanker: Snapshot["tankers"][number] | undefined,
  live: { eta: number } | null,
  districtLabel: string | undefined,
  profile: Profile,
) {
  if (!tanker || !districtLabel) return "Машина ещё не выехала";
  const home = tanker.targetDistrictId === profile.districtId;
  if (live && tanker.status === "en_route") {
    const where = home ? `к дому ${profile.building} в ${districtLabel}` : `в ${districtLabel}`;
    return `Водовоз №${tanker.number} едет ${where}. Около ${live.eta} мин.`;
  }
  if (tanker.status === "serving") {
    return home
      ? `Водовоз №${tanker.number} на месте у дома ${profile.building}`
      : `Водовоз №${tanker.number} на месте в ${districtLabel}`;
  }
  return "Машина ещё не выехала";
}

export function TrackScreen({
  snapshot,
  profile,
  now,
  tankerId,
  onBack,
}: {
  snapshot: Snapshot;
  profile: Profile;
  now: number;
  tankerId: string;
  onBack: () => void;
}) {
  const tanker = snapshot.tankers.find((item) => item.id === tankerId);
  const districts = joinDistricts(snapshot.districts);
  const district = findDistrict(districts, tanker?.targetDistrictId ?? snapshot.homeDistrictId);
  const live = tanker ? liveTanker(tanker, now) : null;
  const home = district ? { x: district.center.x, y: district.center.y } : null;
  const fitPoints = [
    ...(home ? [home] : []),
    ...(tanker ? [{ x: tanker.startX, y: tanker.startY }, { x: tanker.targetX, y: tanker.targetY }] : []),
    ...(live ? [{ x: live.x, y: live.y }] : []),
  ];
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
          fitKey={tankerId}
          fitPoints={fitPoints}
        />
      </View>
      <View style={styles.trackCard}>
        <Text style={styles.cardTitle}>{trackTitle(tanker, live, district?.name, profile)}</Text>
        <Text style={styles.cardBody}>{district ? `${district.name}. Точка на карте — машина, а не весь район.` : ""}</Text>
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
  picked: { fontFamily: font.bold, fontSize: 18, color: colors.text },
  menu: { backgroundColor: colors.white, borderRadius: 16, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
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
