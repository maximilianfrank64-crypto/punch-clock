# Progress

## Status

| #   | Milestone                                                            | Status                               |
| --- | -------------------------------------------------------------------- | ------------------------------------ |
| 1   | Project setup, PWA config, routing/menu, theming, i18n, Dexie schema | done                                 |
| 2   | Punch state machine + home screen + persistence                      | done                                 |
| 3   | Rounding engine + settings screen + unit tests                       | done                                 |
| 4   | History screen with edit/add/delete                                  | done                                 |
| 5   | Export (all formats, share sheet)                                    | done                                 |
| 6   | Backup/restore, storage persistence, offline testing                 | done                                 |
| 7   | Polish: icons, splash, empty states, README, deployment              | done (deploy needs your GitHub repo) |

Milestones 1–6 were written before Node.js was available on the machine, so they landed in one
commit once lint/typecheck/tests could run; milestone 7 and the browser-test fixes are a second commit.

## After launch

- **Day notes** (user request): optional note per day, editable on Home ("Note for today") and in
  History (also for days without entries); own column in all exports; included in backups (older
  backups without notes still restore). IndexedDB schema v2 adds the `dayNotes` table; upgrade from
  v1 tested in the browser with existing data. The per-entry note stays in the entry editor.

- **Tax rate** (user request): optional flat "taxes & deductions" percentage next to the hourly
  rate; shows estimated earnings after tax on Home, in History and as an extra export column.
  Intentionally a single user-entered percentage (works for every country), labelled as an estimate.

## Verified

- `npm run check`: ESLint, `tsc --noEmit` (strict), 90 Vitest unit tests – all green.
- `npm run build`: production build + service worker (30 precached files, ~1.6 MB).
- Browser test (375×812, production build):
  - punch in (13:23 → rounded 13:30), start break, punch out during break, state survives reload
  - history: edit end time, add break and note, totals update
  - all six export formats build; sample PDF checked visually (German, umlauts, €, totals)
  - update banner appears after a new deploy and applies on tap
  - **offline**: with the server stopped, the app, the data and PDF/XLSX export still work
  - light/dark themes, English/German, bottom-sheet menu on phones

## Not verifiable here (needs a real iPhone)

- iOS share sheet (`navigator.share` with files), Add to Home Screen, splash screens,
  `navigator.storage.persist()` result in the installed app, safe-area insets on notch devices.

## Decisions

- **Hash routing** (`#/history`) instead of a router library: works on GitHub Pages and in the iOS
  standalone app without server rewrites, zero dependencies.
- **Own tiny i18n** (`src/i18n`) instead of react-i18next: typed keys (a missing German string is a
  compile error), no runtime dependency. Export labels come from the same dictionaries.
- **Rounding grid anchored at local midnight**, DST-corrected; tests run in `Europe/Berlin`.
- **Big home timer counts real elapsed time** (raw punch time); today/week totals and all reports
  use the rounding rules. Otherwise a rounded-up punch-in shows a frozen 0:00:00 for minutes.
- **Auto-break = "minimum break"**: only the missing part up to X minutes is deducted, so logged
  breaks are not deducted twice.
- **Weekly target without daily target** is prorated by configured workdays for partial weeks.
- **Shifts count for the day they start on** (night shifts are not split at midnight).
- **Exports are prepared before the tap** so iOS keeps the user gesture for `navigator.share`.
- **SheetJS from cdn.sheetjs.com** (the npm registry version is outdated and has known advisories).
- **GitHub Pages** via GitHub Actions for hosting.

## Next / ideas

- Push to GitHub and enable Pages (see README → Deployment).
- Test on the iPhone; adjust anything iOS-specific.
- Possible later: Capacitor wrapper (core is already UI-independent), splitting night shifts at
  midnight as an option, CSV import.
