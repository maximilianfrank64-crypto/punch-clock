# Progress

## Plan

| #   | Milestone                                                            | Status      |
| --- | -------------------------------------------------------------------- | ----------- |
| 1   | Project setup, PWA config, routing/menu, theming, i18n, Dexie schema | in progress |
| 2   | Punch state machine + home screen + persistence                      | in progress |
| 3   | Rounding engine + settings screen + unit tests                       | in progress |
| 4   | History screen with edit/add/delete                                  | in progress |
| 5   | Export (all formats, share sheet)                                    | in progress |
| 6   | Backup/restore, storage persistence, offline testing                 | in progress |
| 7   | Polish: icons, splash, empty states, README, deployment              | in progress |

## Decisions

- **Hash routing** (`#/history`) instead of a router library: works on GitHub Pages and in the iOS
  standalone app without server rewrites, zero dependencies.
- **Own tiny i18n** (`src/i18n`) instead of react-i18next: typed keys (missing German strings are a
  compile error), no runtime dependency. Export labels come from the same dictionaries.
- **Rounding grid anchored at local midnight**, DST-corrected; tests run in `Europe/Berlin`.
- **Auto-break = "minimum break"**: only the missing part up to X minutes is deducted, so logged
  breaks are not deducted twice.
- **Weekly target without daily target** is prorated by configured workdays for partial weeks.
- **Exports are prepared before the tap** so iOS keeps the user gesture for `navigator.share`.
- **SheetJS from cdn.sheetjs.com** (the npm registry version is outdated and has known advisories).
- **GitHub Pages** via GitHub Actions for hosting.

## Next

- Run `npm install`, `npm run check`, `npm run build` and fix anything that comes up.
