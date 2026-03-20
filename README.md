<div align="center">
  <img src="assets/icon.png" width="80" alt="NonStop Launcher"/>
  <h1>NonStop Launcher</h1>
  <p>Игровой лаунчер с поиском репаков, торрент-загрузчиком и библиотекой игр</p>

  ![Version](https://img.shields.io/badge/version-1.0.2-red?style=flat-square)
  ![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)
  ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
  ![Electron](https://img.shields.io/badge/Electron-29-47848F?style=flat-square)
</div>

---

## Что умеет

- **Поиск репаков** — FitGirl, SteamRIP и другие источники
- **Торрент-загрузчик** — встроенный WebTorrent, продолжает качать в трее
- **Библиотека игр** — обложки из Steam, время в игре, сортировка и фильтры
- **Страница игры** — описание, скриншоты и детали прямо из Steam
- **Достижения** — разблокируй по мере игры
- **Статистика** — графики времени по дням, топ игр
- **Кастомизация** — цвет акцента, фон (gif/видео/картинка), светлая/тёмная тема
- **Автообновление** — уведомление о новых версиях с красивым экраном
- **Трей** — сворачивай, загрузки продолжаются

## Скриншоты

> Скоро

## Установка

### Готовый билд
Скачай последний `.exe` из [Releases](https://github.com/Ma7eyka/NonStopLauncher/releases)

### Из исходников
```bash
git clone https://github.com/Ma7eyka/NonStopLauncher
cd NonStopLauncher
npm install
npm run electron:dev
```

### Сборка .exe
```bash
npm run electron:build
# Готовый установщик в папке release/
```

## Технологии

| | |
|---|---|
| **Frontend** | React 18 + Vite |
| **Desktop** | Electron 29 |
| **БД** | sql.js (SQLite) |
| **Торренты** | WebTorrent |
| **Обложки** | Steam Store API |

## Публикация обновлений

1. Измени версию в `package.json`
2. Обнови `Changelog.jsx`
3. Получи [GitHub Token](https://github.com/settings/tokens) с правами `repo`
4. Запусти:
```powershell
$env:GH_TOKEN = "твой_токен"
npm run electron:build -- --publish always
```

## Вклад в проект

Pull requests приветствуются! Открывай Issues если нашёл баг.

## Лицензия

MIT — делай что хочешь

---

<div align="center">
  Сделано с ❤️ | <a href="https://github.com/Ma7eyka/NonStopLauncher/releases">Скачать</a>
</div>
