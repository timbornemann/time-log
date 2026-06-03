# Logbook

Logbook ist ein lokales Zeit-Tracking-Tool mit Stoppuhr, Countdown, Pomodoro und Tagesauswertung.

## Voraussetzungen

- Node.js 22 (empfohlen)
- npm

## Lokale Entwicklung

1. Abhaengigkeiten installieren:
   ```bash
   npm install
   ```
2. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```

## Qualitaetschecks

- Typecheck:
  ```bash
  npm run lint
  ```
- Produktions-Build:
  ```bash
  npm run build
  ```

## Desktop-App (Electron)

- Desktop-App im Dev-Modus starten:
  ```bash
  npm run desktop:dev
  ```
- Windows-Installer bauen:
  ```bash
  npm run build:desktop:win
  ```
- macOS-Installer bauen:
  ```bash
  npm run build:desktop:mac
  ```

Die erzeugten Artefakte liegen im Ordner `release/`.

## GitHub Release Automation

Beim Veroeffentlichen eines GitHub Releases (`release.published`) laeuft der Workflow
`/.github/workflows/release-desktop.yml` und erstellt automatisch:

- Windows: NSIS Installer (`.exe`)
- macOS: DMG und ZIP (`.dmg`, `.zip`)

Die Artefakte werden direkt am jeweiligen GitHub Release angehaengt.

Hinweis: macOS-Builds sind ohne Apple-Signing/Notarisierung standardmaessig unsigniert.
