import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { TabBar, type TabId } from "./components/TabBar";
import { fetchState, markRead, requestTanker, sendReport } from "./lib/api";
import { districtName } from "./lib/districts";
import { colors, font } from "./lib/theme";
import type { Profile, ReportType, Snapshot } from "./lib/types";
import { MapScreen } from "./screens/MapScreen";
import { ProfileScreen, type ProfileRoute } from "./screens/ProfileScreen";
import { ReportSheet } from "./screens/ReportSheet";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import {
  AboutScreen,
  AddressScreen,
  FavoritesScreen,
  HistoryScreen,
  LanguageScreen,
  NotificationsScreen,
  RequestsScreen,
  SupportScreen,
  TrackScreen,
} from "./screens/StackScreens";
import { TankersScreen } from "./screens/TankersScreen";

type Stack =
  | { name: ProfileRoute }
  | { name: "requests" }
  | { name: "track"; tankerId: string }
  | null;

const INITIAL_PROFILE: Profile = {
  name: "Айбек Н.",
  districtId: "14",
  building: "12",
  language: "ru",
  favorites: ["14"],
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [tab, setTab] = useState<TabId>("map");
  const [stack, setStack] = useState<Stack>(null);
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("14");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBuilding, setReportBuilding] = useState(INITIAL_PROFILE.building);
  const [addressReady, setAddressReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const seen = useRef<string | null>(null);
  const skew = useRef(0);

  const load = useCallback(async () => {
    try {
      const next = await fetchState(profile.districtId);
      skew.current = next.serverTime - Date.now();
      setSnapshot(next);
      setError(null);
      const fresh = next.notifications.find(
        (item) => !item.read && (!item.audience || item.audience === profile.name),
      );
      if (fresh && seen.current && fresh.id !== seen.current && fresh.createdAt > next.serverTime - 8000) {
        setToast(fresh.body);
      }
      if (fresh) seen.current = fresh.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Нет связи с сервером");
    }
  }, [profile.districtId, profile.name]);

  useEffect(() => {
    const kickoff = setTimeout(() => {
      void load();
    }, 0);
    const poll = setInterval(() => {
      void load();
    }, 2000);
    const clock = setInterval(() => setNow(Date.now() + skew.current), 200);
    return () => {
      clearTimeout(kickoff);
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function submitReport(type: ReportType) {
    const building = reportBuilding.trim();
    if (!building) return;
    setBusy(true);
    try {
      const next = await sendReport({
        districtId: selectedId,
        building,
        type,
        residentName: profile.name,
      });
      setSnapshot(next);
      setSuccess("Сигнал принят. Диспетчер видит дом, а район обновится на карте.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  async function requestWater(place: { districtId: string; building: string }, announce: boolean) {
    const building = place.building.trim();
    if (!building) return;
    setBusy(true);
    try {
      const next = await requestTanker({
        districtId: place.districtId,
        building,
        residentName: profile.name,
      });
      setSnapshot(next);
      const mine = next.requests.find(
        (item) =>
          item.residentName === profile.name &&
          item.districtId === place.districtId &&
          item.building === building &&
          item.status !== "done",
      );
      if (announce && mine?.status === "en_route" && mine.tankerId) {
        setReportOpen(false);
        setStack({ name: "track", tankerId: mine.tankerId });
      } else if (announce) {
        setToast("Заявка у диспетчера. Водовоз выедет после назначения.");
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Не удалось отправить заявку");
    } finally {
      setBusy(false);
    }
  }

  if ((!fontsLoaded && !fontError) || !snapshot) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.blue} />
        <Text style={styles.bootText}>{error ?? "Komektesu"}</Text>
        {error ? (
          <Pressable onPress={() => void load()}>
            <Text style={styles.retry}>Повторить</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (!addressReady) {
    return (
      <View style={styles.frame}>
        <SafeAreaView style={[styles.root, { backgroundColor: colors.white }]}>
          <ExpoStatusBar style="dark" />
          <AddressScreen
            mode="gate"
            snapshot={snapshot}
            profile={profile}
            onSave={(districtId, building, name) => {
              setProfile((current) => ({ ...current, name, districtId, building }));
              setSelectedId(districtId);
              setAddressReady(true);
            }}
          />
        </SafeAreaView>
      </View>
    );
  }

  const profileBlue = tab === "profile" && !stack;
  const placeName = districtName(selectedId);
  const filedRequest = snapshot.requests.find(
    (item) =>
      item.residentName === profile.name &&
      item.districtId === selectedId &&
      item.building === reportBuilding.trim() &&
      item.status !== "done",
  );
  const trackedTankerId =
    filedRequest?.tankerId ??
    snapshot.tankers.find((item) => item.targetDistrictId === selectedId && item.status !== "idle")?.id ??
    null;

  function openTrack(tankerId: string) {
    setReportOpen(false);
    setSuccess(null);
    setStack({ name: "track", tankerId });
  }

  return (
    <View style={styles.frame}>
    <SafeAreaView style={[styles.root, { backgroundColor: profileBlue ? colors.blue : colors.white }]}>
      <ExpoStatusBar style={profileBlue ? "light" : "dark"} />
      <View style={styles.body}>
        {stack?.name === "notifications" ? (
          <NotificationsScreen
            snapshot={snapshot}
            residentName={profile.name}
            onBack={() => {
              const ids = snapshot.notifications
                .filter((item) => !item.audience || item.audience === profile.name)
                .map((item) => item.id);
              void markRead(ids).then(setSnapshot).catch(() => undefined);
              setStack(null);
            }}
          />
        ) : null}
        {stack?.name === "history" ? <HistoryScreen snapshot={snapshot} profile={profile} onBack={() => setStack(null)} /> : null}
        {stack?.name === "favorites" ? (
          <FavoritesScreen
            snapshot={snapshot}
            profile={profile}
            onBack={() => setStack(null)}
            onOpen={(id) => {
              setSelectedId(id);
              setTab("map");
              setStack(null);
            }}
            onToggle={(id) =>
              setProfile((current) => ({
                ...current,
                favorites: current.favorites.includes(id)
                  ? current.favorites.filter((item) => item !== id)
                  : [...current.favorites, id],
              }))
            }
          />
        ) : null}
        {stack?.name === "language" ? (
          <LanguageScreen language={profile.language} onBack={() => setStack(null)} onChange={(language) => setProfile((current) => ({ ...current, language }))} />
        ) : null}
        {stack?.name === "support" ? <SupportScreen residentName={profile.name} onBack={() => setStack(null)} /> : null}
        {stack?.name === "about" ? <AboutScreen onBack={() => setStack(null)} /> : null}
        {stack?.name === "address" ? (
          <AddressScreen
            snapshot={snapshot}
            profile={profile}
            onBack={() => setStack(null)}
            onSave={(districtId, building, name) => {
              setProfile((current) => ({ ...current, name, districtId, building }));
              setSelectedId(districtId);
              setStack(null);
            }}
          />
        ) : null}
        {stack?.name === "requests" ? (
          <RequestsScreen snapshot={snapshot} profile={profile} now={now} onBack={() => setStack(null)} onTrack={openTrack} />
        ) : null}
        {stack?.name === "track" ? (
          <TrackScreen snapshot={snapshot} profile={profile} now={now} tankerId={stack.tankerId} onBack={() => setStack(null)} />
        ) : null}
        {!stack && tab === "map" ? (
          <MapScreen
            snapshot={snapshot}
            now={now}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReport={() => {
              setSuccess(null);
              setReportBuilding(selectedId === profile.districtId ? profile.building : "");
              setReportOpen(true);
            }}
            onSchedule={() => setTab("schedule")}
            onNotifications={() => setStack({ name: "notifications" })}
            onProfile={() => setTab("profile")}
            residentName={profile.name}
          />
        ) : null}
        {!stack && tab === "schedule" ? (
          <ScheduleScreen snapshot={snapshot} districtId={selectedId} onDistrict={setSelectedId} />
        ) : null}
        {!stack && tab === "tankers" ? (
          <TankersScreen
            snapshot={snapshot}
            now={now}
            busy={busy}
            onRequest={() => void requestWater({ districtId: profile.districtId, building: profile.building }, true)}
            profile={profile}
            onOpenRequests={() => setStack({ name: "requests" })}
            onTrack={openTrack}
          />
        ) : null}
        {!stack && tab === "profile" ? <ProfileScreen snapshot={snapshot} profile={profile} onOpen={(name) => setStack({ name })} /> : null}
      </View>
      {!stack ? <TabBar tab={tab} onChange={setTab} /> : null}
      {toast ? (
        <Pressable style={styles.toast} onPress={() => setToast(null)}>
          <Text style={styles.toastTitle}>Komektesu</Text>
          <Text style={styles.toastBody}>{toast}</Text>
        </Pressable>
      ) : null}
      {reportOpen ? (
        <ReportSheet
          place={placeName}
          building={reportBuilding}
          onBuilding={setReportBuilding}
          otherDistrict={selectedId !== profile.districtId}
          busy={busy}
          success={success}
          requestStatus={filedRequest && filedRequest.status !== "done" ? filedRequest.status : null}
          canTrack={trackedTankerId !== null}
          onClose={() => setReportOpen(false)}
          onSubmit={(type) => void submitReport(type)}
          onRequest={() => void requestWater({ districtId: selectedId, building: reportBuilding }, false)}
          onTrack={() => {
            if (trackedTankerId) openTrack(trackedTankerId);
          }}
        />
      ) : null}
      {Platform.OS === "android" ? <StatusBar backgroundColor={profileBlue ? colors.blue : colors.white} /> : null}
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Phone-width frame so the web demo matches the resident layout.
  frame: { flex: 1, alignItems: "center", backgroundColor: "#E7ECF3" },
  root: { flex: 1, width: "100%", maxWidth: 430 },
  body: { flex: 1, backgroundColor: colors.bg },
  boot: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.white },
  bootText: { fontSize: 16, color: colors.secondary },
  retry: { color: colors.blue, fontFamily: font.semibold, fontSize: 16 },
  toast: {
    position: "absolute",
    top: 8,
    left: 16,
    right: 16,
    backgroundColor: colors.text,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  toastTitle: { color: colors.white, fontFamily: font.semibold, fontSize: 13 },
  toastBody: { color: colors.white, fontFamily: font.regular, fontSize: 14, lineHeight: 18 },
});
