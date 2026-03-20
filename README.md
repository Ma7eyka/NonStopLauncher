<div align="center">
  <img src="assets/icon.png" width="100" alt="NonStop Launcher"/>
  <br/>
  <br/>

  # NonStop Launcher

  **Open-source game launcher with built-in torrent downloader**

  [![Version](https://img.shields.io/github/v/release/Ma7eyka/NonStopLauncher?style=flat-square&color=c0392b&label=version)](https://github.com/Ma7eyka/NonStopLauncher/releases/latest)
  [![Downloads](https://img.shields.io/github/downloads/Ma7eyka/NonStopLauncher/total?style=flat-square&color=8e44ad)](https://github.com/Ma7eyka/NonStopLauncher/releases)
  [![Platform](https://img.shields.io/badge/platform-Windows-0078d4?style=flat-square)](https://github.com/Ma7eyka/NonStopLauncher/releases)
  [![License](https://img.shields.io/badge/license-MIT-27ae60?style=flat-square)](LICENSE)
  [![Electron](https://img.shields.io/badge/electron-29-47848F?style=flat-square)](https://electronjs.org)
  [![React](https://img.shields.io/badge/react-18-61DAFB?style=flat-square)](https://reactjs.org)

  <br/>

  <a href="https://github.com/Ma7eyka/NonStopLauncher/releases/latest">
    <img src="https://img.shields.io/badge/⬇%20Download%20Latest-NonStop%20Launcher-c0392b?style=for-the-badge&logoColor=white" alt="Download"/>
  </a>

  <br/>
  <br/>

  > Inspired by [Hydra Launcher](https://github.com/hydralauncher/hydra) — built from scratch with ❤️

</div>

---

## 📸 Screenshots

> **Coming soon** — screenshots will be added in the next update.
>
> Want to contribute screenshots? Open a [Pull Request](https://github.com/Ma7eyka/NonStopLauncher/pulls)!

---

## ✨ Features

<table>
  <tr>
    <td>🔍 <b>Repack Search</b></td>
    <td>Search FitGirl Repacks and SteamRIP directly inside the app</td>
  </tr>
  <tr>
    <td>⬇️ <b>Torrent Downloader</b></td>
    <td>Built-in WebTorrent with speed graphs, pause/resume, auto-resume after restart</td>
  </tr>
  <tr>
    <td>🎮 <b>Game Library</b></td>
    <td>Beautiful card grid with Steam covers, sort & filter, playtime tracking</td>
  </tr>
  <tr>
    <td>📄 <b>Game Page</b></td>
    <td>Full info page with Steam description, screenshots, genres, release date</td>
  </tr>
  <tr>
    <td>🗂️ <b>System Tray</b></td>
    <td>Minimize to tray — downloads continue in the background</td>
  </tr>
  <tr>
    <td>🏆 <b>Achievements</b></td>
    <td>Unlock 10 achievements as you build your library and play games</td>
  </tr>
  <tr>
    <td>📊 <b>Statistics</b></td>
    <td>Playtime charts by day, top games leaderboard, daily averages</td>
  </tr>
  <tr>
    <td>🌍 <b>Multi-language</b></td>
    <td>Russian, English, Ukrainian — switch instantly in Settings</td>
  </tr>
  <tr>
    <td>🎨 <b>Customization</b></td>
    <td>Accent colors, dark/light theme, custom backgrounds (image, GIF, video)</td>
  </tr>
  <tr>
    <td>💾 <b>Backup</b></td>
    <td>Export and import your game library as a JSON file</td>
  </tr>
  <tr>
    <td>🔔 <b>Notifications</b></td>
    <td>Sound notifications for download completion, achievements and records</td>
  </tr>
</table>

> ⚠️ **Auto-update (OTA) is temporarily disabled.** Please update manually via [Releases](https://github.com/Ma7eyka/NonStopLauncher/releases). Will be re-enabled in a future version.

---

## 🚀 Installation

### Option 1 — Download installer *(recommended)*

1. Go to [**Releases**](https://github.com/Ma7eyka/NonStopLauncher/releases/latest)
2. Download `NonStop.Launcher.Setup.x.x.x.exe`
3. Run the installer and enjoy 🎮

### Option 2 — Build from source

**Requirements:** Node.js 18+, npm 8+

```bash
# Clone the repository
git clone https://github.com/Ma7eyka/NonStopLauncher
cd NonStopLauncher

# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build installer
npm run electron:build
# → Output: release/NonStop Launcher Setup x.x.x.exe
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **UI Framework** | React 18 + Vite 5 |
| **Desktop Shell** | Electron 29 |
| **Database** | sql.js (SQLite — no native compilation needed) |
| **Torrents** | WebTorrent 2 |
| **Game Covers** | Steam Store API |
| **HTTP Client** | Axios |
| **Build Tool** | electron-builder 24 |

---

## 📋 Changelog

### v1.0.4
- 🐛 **Fix:** Sidebar labels now display correctly in all languages
- 🐛 **Fix:** Playtime counter now tracks accurately while game is running
- 🐛 **Fix:** "Never played" status updates after first launch
- ✨ **New:** Animated "Playing" badge on game card while game is open
- ✨ **New:** Playtime shows hours and minutes format

### v1.0.3
- ✨ **New:** Multi-language support — Russian, English, Ukrainian
- ✨ **New:** Changelog panel moved to right-side FAB with unique icon
- ✨ **New:** Settings reorganized into clear labeled sections (Language, Theme, Appearance, Downloads, Backup)
- ✨ **New:** Improved GitHub README

### v1.0.2
- 🐛 **Fix:** `setup.exe` now launches with admin rights (UAC prompt)
- 🐛 **Fix:** Duplicate downloads and phantom database records eliminated
- 🐛 **Fix:** Progress correctly saved on launcher close
- ✨ **New:** Downloads auto-resume after launcher restart
- ✨ **New:** Smart cover search — GTA IV, HL2, RDR2 abbreviations supported
- ✨ **New:** Option to delete downloaded files when cancelling
- ✨ **New:** Achievements system (10 achievements) with sound notifications
- ✨ **New:** Game modal with tabs: Info, Settings, Files
- ✨ **New:** Launch arguments support per game
- ✨ **New:** System tray support — downloads continue when minimized
- ✨ **New:** Game page with Steam screenshots and description
- ✨ **New:** Statistics page with 14-day playtime chart
- ✨ **New:** Sort and filter in library (Recent / Name / Playtime, All / Installed / Downloading)
- ✨ **New:** Dark / Light theme toggle
- ✨ **New:** Export / Import library backup (JSON)
- ✨ **New:** Auto-updater with animated update screen *(temporarily disabled)*

### v1.0.1
- 🐛 **Fix:** `existing.destroy is not a function` error
- 🐛 **Fix:** HTML entities in magnet links (`&#038;`)
- 🐛 **Fix:** `lastId()` in database returning 0
- ✨ **New:** Real-time download speed chart with gap markers
- ✨ **New:** Steam Store API game covers
- ✨ **New:** Settings page — accent color, background, button style

### v1.0.0 — *Initial Release*
- ✨ FitGirl Repacks and SteamRIP search
- ✨ WebTorrent-powered torrent downloader
- ✨ Game library with Steam covers
- ✨ Custom frameless Electron window
- ✨ SQLite database (sql.js)
- ✨ Downloads page with real-time progress

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** this repository
2. **Create** a branch: `git checkout -b feature/your-feature`
3. **Commit** your changes: `git commit -m "Add: your feature"`
4. **Push**: `git push origin feature/your-feature`
5. **Open** a Pull Request

### Areas that need help
- 📸 Screenshots for the README
- 🌍 More languages (German, French, Polish, etc.)
- 🐛 Bug reports via [Issues](https://github.com/Ma7eyka/NonStopLauncher/issues)
- 💡 Feature ideas via [Discussions](https://github.com/Ma7eyka/NonStopLauncher/discussions)

---

## 📦 Publishing a Release

> Only for maintainers

1. Bump `version` in `package.json`
2. Add entry to `src/renderer/components/Changelog.jsx`
3. Get a [**classic** GitHub Token](https://github.com/settings/tokens) with `repo` scope (token starts with `ghp_`)
4. Run:
```powershell
$env:GH_TOKEN = "ghp_your_token_here"
npm run electron:build -- --publish always
```

---

## ⚠️ Disclaimer

This project is for **educational purposes only**. The developers are not responsible for how the software is used. Please respect intellectual property rights and copyright laws in your country.

---

## 📄 License

[MIT](LICENSE) © 2026 [Ma7eyka](https://github.com/Ma7eyka)

---

<div align="center">
  <br/>
  <b>NonStop Launcher</b> — Game more, hassle less.
  <br/>
  <br/>
  <a href="https://github.com/Ma7eyka/NonStopLauncher/releases/latest">⬇ Download</a> •
  <a href="https://github.com/Ma7eyka/NonStopLauncher/issues">🐛 Report Bug</a> •
  <a href="https://github.com/Ma7eyka/NonStopLauncher/discussions">💬 Discuss</a>
  <br/>
  <br/>
  <sub>If you like this project, give it a ⭐</sub>
</div>
