# Публикация обновлений NonStop Launcher

## Настройка (один раз)

1. Зайди на https://github.com/settings/tokens/new
2. Название: `NonStopLauncher`
3. Выбери scope: `repo` (полный доступ)
4. Нажми Generate → **скопируй токен** (показывается один раз!)

## Публикация новой версии

**1. Обнови версию** в `package.json`:
```json
"version": "1.0.3"
```

**2. Добавь запись** в `src/renderer/components/Changelog.jsx`

**3. Собери и опубликуй:**
```powershell
$env:GH_TOKEN = "ghp_твойтокен"
npm run electron:build -- --publish always
```

Electron Builder:
- Соберёт `NonStop Launcher Setup 1.0.3.exe`
- Создаст Release на GitHub автоматически
- Загрузит файлы обновления

**Пользователи** при следующем запуске увидят экран обновления!

## Ссылки

- Репо: https://github.com/Ma7eyka/NonStopLauncher
- Releases: https://github.com/Ma7eyka/NonStopLauncher/releases
- Tokens: https://github.com/settings/tokens
