# Punch Clock

A private, offline-first time tracking app (PWA). Punch in/out with one tap, log breaks,
round times by your own rules, and export timesheets as CSV, Excel, PDF, JSON, text or HTML.

- **No account, no server, no tracking, no ads.** All data stays in the browser on your device (IndexedDB).
- Works offline once loaded, installable on iPhone ("Add to Home Screen"), Android and desktop.
- English and German UI.

## Features

- **Home:** big Punch In button → Punch Out / Start Break → Stop Break. Live shift timer, today's and
  this week's total, overtime vs. target, earnings. A running shift survives closing the app or
  restarting the phone (every punch is written to IndexedDB immediately).
- **Rounding:** separate rule for punch in, punch out, break start and break end. Modes: off /
  nearest / always up / always down. Interval 1, 5, 6, 10, 15, 30, 60 min or custom (1–1440).
  Default: punch in and out to the nearest 15 min. The raw **and** rounded time are both stored.
  Reports use rounded times unless you switch on "Show exact times in reports".
- **History:** day / week / month views, tap an entry to edit or delete, add entries manually,
  overnight shifts (+1 day) supported.
- **Day notes:** optional note per calendar day ("what did I do today?") on the home screen and in
  History, also for days without hours (vacation, sick). Exported as a "Day note" column.
- **Export:** any date range; CSV, XLSX, PDF, JSON, TXT, HTML with per-shift rows, day totals,
  weekly and monthly totals. On iPhone the share sheet opens (Save to Files, Mail, AirDrop…);
  other browsers download the file.
- **Backup & restore:** full JSON backup (shares or downloads), restore by merging or replacing,
  monthly reminder (configurable), persistent storage request with status in Settings.
- **Settings:** 12/24 h, week start, language, theme (system/light/dark), h:mm or decimal
  durations, automatic break deduction, daily/weekly targets with workdays, hourly rate +
  currency, default export format and range, delete all data.

## Development

Requirements: Node.js 20+ (22 LTS recommended).

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # lint + typecheck + unit tests
npm run build        # production build into dist/
npm run preview      # serve the production build (service worker active)
npm run icons        # regenerate icons + iOS splash screens (no extra dependencies)
```

### Project structure

```
src/
  core/                 framework-free business logic (no React/Dexie imports – enforced by ESLint)
    rounding.ts         rounding engine (local wall-clock grid, midnight + DST safe)
    punch.ts            punch state machine + invariants (start ≤ breaks ≤ end)
    calc.ts             shift durations, break merging, auto-break rule
    periods.ts          day/week/month keys and ranges
    report.ts           aggregation into days/weeks/months with targets, overtime, earnings
    edit.ts             manual entry form ⇄ shift conversion and validation
    backup.ts           backup file format, validation, merge, reminder logic
    export/             CSV, JSON, TXT, HTML, XLSX (SheetJS), PDF (jsPDF) builders
    *.test.ts           unit tests (Vitest, run in Europe/Berlin to exercise DST)
  db/db.ts              Dexie (IndexedDB) schema and repository functions
  store/appStore.ts     Zustand store: loads from DB, persists every change immediately
  features/             screens: punch, history, export, settings, backup, about
  i18n/                 en.ts (source of keys), de.ts, tiny typed translate()
  ui/                   shared components, icons, hash router, PWA update prompt
scripts/generate-icons.mjs
```

The `src/core` modules have no UI or storage dependencies, so they can be reused unchanged in a
Capacitor (App Store) build or any other shell.

### Notes on time handling

- All timestamps are stored as UTC epoch milliseconds; they are converted to local time only for
  rounding and display.
- Rounding works on a grid anchored at local midnight (so "15 min" always means :00/:15/:30/:45),
  rolls over midnight (23:53 → 00:00 next day) and is corrected for DST transitions.
- If rounding would put the end before the start (e.g. in rounded up, out rounded down), the rounded
  end is clamped to the rounded start; breaks are clamped into the shift. Raw times are kept.
- A shift counts towards the day on which it starts.
- Automatic break deduction: when a shift is longer than _Y_ hours, the total break is topped up to
  at least _X_ minutes (breaks you logged count towards it).

## Deployment (GitHub Pages)

A PWA must be served over HTTPS. The included workflow
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) runs lint, typecheck and tests, builds
with the correct base path and publishes to GitHub Pages on every push to `main`.

One-time setup:

1. Create a new GitHub repository (it can be private only on paid plans; public is fine because no
   personal data is in the code), e.g. `punch-clock`.
2. Push this project:
   ```bash
   git remote add origin https://github.com/<your-user>/punch-clock.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Wait for the "Deploy to GitHub Pages" action to finish (Actions tab). Your app is then at
   `https://<your-user>.github.io/punch-clock/`.

If you name the repository `<your-user>.github.io`, change `BASE_PATH` in the workflow to `/`.

Alternative: Cloudflare Pages works too (build command `npm run build`, output `dist`, no
`BASE_PATH` needed).

## Install on iPhone

1. Open the app URL (e.g. `https://<your-user>.github.io/punch-clock/`) in **Safari**
   (other iOS browsers can also add to Home Screen since iOS 16.4, but Safari is the most reliable).
2. Wait until the page has loaded completely once (this caches it for offline use).
3. Tap the **Share** button (square with arrow up) in the toolbar.
4. Scroll down and tap **Add to Home Screen**, keep the name, tap **Add**.
5. Start the app from the new Home Screen icon. It runs full-screen and works offline.
6. Go to **Menu → Backup & Restore** and create a first backup to iCloud Drive / Files.

Important: The Home Screen app has its own storage, separate from Safari tabs. Use the Home Screen
icon for everyday use, and make regular backups – iOS may delete website data if the app is not
used for a long time or storage runs low, and deleting the Home Screen icon deletes its data.

Updates: when a new version is deployed, the app shows "A new version is available – Update".

## Privacy

The app makes no network requests besides loading its own files. There is no analytics, no
crash reporting, no cookies. Exports and backups only leave the device when you share them.
