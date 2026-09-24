# Komektesu

Resident app for water in Aktau. The map is the real city: Caspian coast, arterial roads, and microdistrict polygons from OpenStreetMap. Colour shows supply status — green for normal, yellow for low pressure, red for no water. Pressure, the tanker fleet, and complaints are a labelled demo until КЖСА telemetry exists. Distances on the map are real.

Start the API in `komektesu_backend` first (`npm run dev` on port 3000), then:

```bash
npm install
npm start
```

The app calls `http://localhost:3000` by default. On a phone, set `EXPO_PUBLIC_API_URL` to your computer's address.

The phone joins `/api/state` onto `lib/aktau-geo.ts` (the same geometry the console uses). Delivery and the home pin sit on a district centre.

Pitch path: the console opens on the 14/15 incident. In the resident app, open 14 мкр, tap **Сообщить о проблеме**, then **Нет воды**. The report shows in the resident history, and confirming it in the console marks it confirmed.
