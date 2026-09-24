# Komektesu

Resident app for water in Aktau. The map colors neighborhoods green (normal pressure), yellow (low pressure or scheduled supply), and red (no water). Two taps send a report. A water tanker can be requested and followed on the map.

Start the API in `komektesu_backend` first (`npm run dev` on port 3000), then:

```bash
npm install
npm start
```

The app calls `http://localhost:3000` by default. On a phone, set `EXPO_PUBLIC_API_URL` to your computer's address.

Pitch path: open the map on 14 мкр, tap **Сообщить о проблеме**, then **Нет воды**. The neighborhood turns red and the nearest tanker, №12, is dispatched with an arrival time.
