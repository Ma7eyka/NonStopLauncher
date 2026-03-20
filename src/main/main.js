const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } = require('electron')

// Auto-updater — только в production build
let autoUpdater = null
try {
  autoUpdater = require('electron-updater').autoUpdater
  autoUpdater.autoDownload = false // качаем только по запросу пользователя
  autoUpdater.autoInstallOnAppQuit = true
} catch (e) {
  console.warn('[Updater] electron-updater not available (dev mode)')
}
const path = require('path')
const fs   = require('fs')

const isDev = process.env.NODE_ENV === 'development'
const torrent  = require('./torrentManager')
const db       = require('./database')
const scraper  = require('./repackScraper')
const covers   = require('./coverFetcher')
const detector = require('./gameDetector')

let mainWindow
let tray = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 600,
    frame: false, backgroundColor: '#0d0d0f',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'))
  }

  // Автообновление
  if (autoUpdater) {
    autoUpdater.on('checking-for-update', () => {
      mainWindow?.webContents.send('update:status', { status: 'checking' })
    })
    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('update:status', {
        status: 'available',
        data: { version: info.version, releaseNotes: info.releaseNotes }
      })
    })
    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('update:status', { status: 'idle' })
    })
    autoUpdater.on('download-progress', (p) => {
      mainWindow?.webContents.send('update:status', {
        status: 'downloading',
        data: { percent: p.percent, version: autoUpdater.currentVersion?.version }
      })
    })
    autoUpdater.on('update-downloaded', (info) => {
      mainWindow?.webContents.send('update:status', {
        status: 'ready',
        data: { version: info.version }
      })
    })
    autoUpdater.on('error', (err) => {
      console.error('[Updater] Error:', err.message)
      mainWindow?.webContents.send('update:status', {
        status: 'error',
        data: { error: err.message }
      })
    })
  }

  // Трей
  try {
    const iconPath = path.join(__dirname, '../../assets/icon.png')
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(trayIcon)
    tray.setToolTip('NonStop Launcher')

    const updateTrayMenu = () => {
      const menu = Menu.buildFromTemplate([
        { label: 'NonStop Launcher', enabled: false },
        { type: 'separator' },
        { label: 'Открыть', click: () => { mainWindow.show(); mainWindow.focus() } },
        { label: 'Свернуть', click: () => mainWindow.hide() },
        { type: 'separator' },
        { label: 'Выход', click: () => { tray.destroy(); app.quit() } },
      ])
      tray.setContextMenu(menu)
    }
    updateTrayMenu()

    tray.on('click', () => {
      if (mainWindow.isVisible()) mainWindow.focus()
      else mainWindow.show()
    })
  } catch (e) {
    console.warn('[Tray] Failed to create tray:', e.message)
  }

  // При закрытии окна — сворачиваем в трей если есть активные загрузки
  mainWindow.on('close', (e) => {
    const downloads = db.getAllDownloads()
    const active = downloads.filter(d => d.status === 'downloading')
    if (active.length > 0 && tray) {
      e.preventDefault()
      mainWindow.hide()
      tray.displayBalloon?.({
        title: 'NonStop Launcher',
        content: `Загрузка продолжается (${active.length} активных)`,
        iconType: 'info',
      })
    }
  })

  // Когда окно загрузилось — автовозобновляем и синхронизируем обложки
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => resumePausedDownloads(), 2000)
    setTimeout(() => syncMissingCovers(), 4000)
  })
}

// ── Автовозобновление прерванных загрузок ─────────────────────────────────────
async function resumePausedDownloads() {
  const paused = db.getPausedDownloads()
  if (paused.length === 0) return

  console.log(`[Auto-resume] Found ${paused.length} interrupted downloads, resuming...`)

  for (const dl of paused) {
    const title = dl.title || 'Неизвестная игра'
    console.log(`[Auto-resume] Resuming: ${title} (${(dl.progress||0).toFixed(1)}% done)`)
    db.updateDownloadProgress(dl.id, dl.progress || 0, 'downloading')
    db.updateGameStatus(dl.game_id, 'downloading')

    // Сразу шлём сохранённый прогресс — чтобы не показывалось 0%
    mainWindow?.webContents.send('torrent:progress', {
      gameId:    dl.game_id,
      dlId:      dl.id,
      infoHash:  dl.info_hash,
      name:      title,
      progress:  dl.progress || 0,
      downloadedFmt: '...',
      totalFmt:  '...',
      speedFmt:  '0 B/s',
      maxSpeedFmt: '0 B/s',
      peers:     0,
      eta:       '—',
      status:    'downloading',
      speedHistory: [],
    })

    startTorrent(dl.magnet_url, dl.save_path, dl.game_id, dl.id)

    // Подтягиваем обложку если её нет
    const game = db.getAllGames().find(g => g.id === dl.game_id)
    if (game && !game.cover_url && title && title !== 'Неизвестная игра') {
      covers.fetchCover(title).then(info => {
        if (info?.cover) {
          db.updateGame(dl.game_id, { cover_url: info.cover })
          mainWindow?.webContents.send('game:coverUpdated', { gameId: dl.game_id, cover: info.cover })
          console.log('[Cover] Applied for resumed game:', title)
        }
      }).catch(() => {})
    }

    await new Promise(r => setTimeout(r, 500))
  }
  
  // Также подтягиваем обложки для всех игр без обложки в библиотеке
  syncMissingCovers()
}

// ── Общая функция запуска торрента ────────────────────────────────────────────
function startTorrent(magnetUrl, savePath, gameId, dlId) {
  torrent.downloadTorrent(
    magnetUrl,
    savePath,
    (progress) => {
      // Сохраняем infoHash и прогресс
      if (progress.infoHash) {
        db.updateDownloadInfoHash(dlId, progress.infoHash)
      }
      // Сохраняем прогресс каждые ~10 секунд через счётчик
      if (!startTorrent._cnt) startTorrent._cnt = {}
      startTorrent._cnt[dlId] = (startTorrent._cnt[dlId] || 0) + 1
      if (startTorrent._cnt[dlId] % 10 === 0) {
        db.updateDownloadProgress(dlId, progress.progress, 'downloading')
      }
      mainWindow?.webContents.send('torrent:progress', { ...progress, gameId, dlId })
    },
    ({ infoHash, name, path: gamePath }) => {
      db.finishDownload(dlId)
      db.updateGameStatus(gameId, 'installed')
      if (name) db.updateGame(gameId, { title: name })

      // Автоопределение exe
      const det = gamePath ? detector.detectGameExe(gamePath) : null
      if (det) db.updateGame(gameId, { exe_path: det.exePath, exe_type: det.type, install_path: gamePath })

      mainWindow?.webContents.send('torrent:done', { gameId, dlId, name, detected: det })
      console.log(`[Torrent] Done: ${name}`)
      
      // Если нашли setup.exe — уведомляем что нужно установить игру
      if (det?.type === 'setup') {
        mainWindow?.webContents.send('game:needsInstall', { gameId, name, exePath: det.exePath })
      }

      // Если до сих пор нет обложки — ищем по реальному имени торрента
      const g = db.getAllGames().find(x => x.id === gameId)
      if (!g?.cover_url && name) {
        covers.fetchCover(name).then(info => {
          if (info?.cover) {
            db.updateGame(gameId, { cover_url: info.cover })
            mainWindow?.webContents.send('game:coverUpdated', { gameId, cover: info.cover })
            console.log('[Cover] Applied after done:', info.cover.slice(0,60))
          }
        }).catch(() => {})
      }
    }
  )
}

// ── Window ────────────────────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow.minimize())
ipcMain.handle('update:check',   () => { autoUpdater?.checkForUpdates(); return true })
ipcMain.handle('update:download',() => { autoUpdater?.downloadUpdate(); return true })
ipcMain.handle('update:install', () => { autoUpdater?.quitAndInstall(); return true })
ipcMain.on('window:hide',    () => mainWindow.hide())
ipcMain.on('app:quit',       () => { tray?.destroy(); app.quit() })
ipcMain.on('window:maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
ipcMain.on('window:close',    () => mainWindow.close())
ipcMain.on('open:external',   (_, url) => shell.openExternal(url))

// ── Dialog ────────────────────────────────────────────────────────────────────
ipcMain.handle('dialog:chooseSavePath', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  return r.canceled ? null : r.filePaths[0]
})
ipcMain.handle('dialog:chooseFile', async (_, filters) => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: filters||[] })
  return r.canceled ? null : r.filePaths[0]
})

// ── Settings ──────────────────────────────────────────────────────────────────
const cfgPath = () => path.join(app.getPath('userData'), 'settings.json')
ipcMain.handle('settings:get', () => {
  try { const f = cfgPath(); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,'utf8')) : {} }
  catch { return {} }
})
ipcMain.handle('settings:set', (_, s) => { fs.writeFileSync(cfgPath(), JSON.stringify(s,null,2)); return true })

// ── Database ──────────────────────────────────────────────────────────────────
ipcMain.handle('db:getGames',     () => db.getAllGames())
ipcMain.handle('db:getDownloads', () => db.getAllDownloads())
ipcMain.handle('db:addGame',      (_, g)     => ({ id: db.addGame(g) }))
ipcMain.handle('db:updateGame',   (_, id, f) => { db.updateGame(id, f); return true })
ipcMain.handle('db:deleteGame',   (_, id)    => { db.deleteGame(id); return true })

// ── Covers ────────────────────────────────────────────────────────────────────
ipcMain.handle('cover:fetch',  async (_, t) => covers.fetchCover(t))
ipcMain.handle('game:detect',  (_, p)       => detector.detectGameExe(p))

// ── Search ────────────────────────────────────────────────────────────────────
ipcMain.handle('search:repacks',   async (_, q)   => { db.addSearchHistory(q); return scraper.searchRepacks(q) })
ipcMain.handle('search:getMagnet', async (_, url) => scraper.getMagnetFromDetailPage(url))
ipcMain.handle('search:history',   ()             => db.getSearchHistory())

// ── Torrent download ──────────────────────────────────────────────────────────
ipcMain.handle('torrent:download', async (_, { magnetUrl, savePath, gameTitle }) => {
  // Проверяем нет ли уже активной загрузки с таким же magnet
  const existing = db.getAllDownloads().find(d =>
    d.magnet_url === magnetUrl && d.status !== 'done'
  )
  if (existing) {
    console.log('[Download] Already exists, skipping duplicate for:', gameTitle)
    return { ok: false, reason: 'duplicate', gameId: existing.game_id, dlId: existing.id }
  }

  const gameId = db.addGame({
    title: gameTitle || 'Загрузка...',
    cover_url: null, install_path: savePath,
    exe_path: null, size_bytes: 0, status: 'downloading',
  })
  const dlId = db.addDownload({ game_id: gameId, magnet_url: magnetUrl, save_path: savePath })

  console.log('[Download] Starting:', gameTitle, '| savePath:', savePath)

  startTorrent(magnetUrl, savePath, gameId, dlId)

  // Обложка асинхронно — пробуем сразу
  covers.fetchCover(gameTitle).then(info => {
    if (info?.cover) {
      db.updateGame(gameId, { cover_url: info.cover })
      mainWindow?.webContents.send('game:coverUpdated', { gameId, cover: info.cover })
      console.log('[Cover] Applied to game', gameId, ':', info.cover.slice(0,60))
    } else {
      // Если не нашли — повторим через 10 секунд (когда торрент получит реальное имя)
      setTimeout(() => {
        const g = db.getAllGames().find(x => x.id === gameId)
        if (!g?.cover_url && g?.title && g.title !== 'Загрузка...') {
          covers.fetchCover(g.title).then(i => {
            if (i?.cover) {
              db.updateGame(gameId, { cover_url: i.cover })
              mainWindow?.webContents.send('game:coverUpdated', { gameId, cover: i.cover })
              console.log('[Cover] Retry success:', i.cover.slice(0,60))
            }
          }).catch(() => {})
        }
      }, 10000)
    }
  }).catch(() => {})

  return { ok: true, gameId, dlId }
})

ipcMain.handle('torrent:pause', (_, { infoHash, dlId }) => {
  torrent.pauseTorrent(infoHash)
  if (dlId) db.updateDownloadProgress(dlId, null, 'paused')
  return true
})
ipcMain.handle('torrent:resume', (_, { infoHash, dlId, magnetUrl, savePath, gameId }) => {
  // Если есть infoHash — просто resumeTorrent
  // Если нет — перезапускаем через magnet
  if (infoHash && torrent.findTorrent(infoHash)) {
    torrent.resumeTorrent(infoHash)
  } else if (magnetUrl) {
    startTorrent(magnetUrl, savePath, gameId, dlId)
  }
  if (dlId) db.updateDownloadProgress(dlId, null, 'downloading')
  return true
})
ipcMain.handle('torrent:remove', async (_, { infoHash, dlId, del, gameId }) => {
  // Останавливаем торрент
  if (infoHash) torrent.removeTorrent(infoHash, false) // сначала без удаления файлов

  // Получаем путь до удаления из БД
  let savePath = null
  if (dlId) {
    const downloads = db.getAllDownloads()
    const dl = downloads.find(d => d.id === dlId)
    savePath = dl?.save_path
    db.deleteDownload(dlId)
  }

  // Удаляем игру из библиотеки
  if (gameId) db.deleteGame(gameId)

  // Удаляем папку с файлами если пользователь подтвердил
  if (del && savePath && fs.existsSync(savePath)) {
    try {
      fs.rmSync(savePath, { recursive: true, force: true })
      console.log('[Delete] Removed folder:', savePath)
    } catch (e) {
      console.error('[Delete] Failed to remove folder:', e.message)
    }
  }

  return true
})

// ── Launch ────────────────────────────────────────────────────────────────────
ipcMain.handle('game:launch', async (_, { gameId, exePath }) => {
  const game = db.getAllGames().find(g => g.id === gameId)
  const launchArgs = game?.launch_args || ''
  console.log('[Launch] Launching:', exePath, launchArgs || '')

  // Останавливаем торрент для этой игры — файлы освобождаются
  if (game) {
    const downloads = db.getAllDownloads()
    const dl = downloads.find(d => d.game_id === gameId)
    if (dl?.info_hash) {
      torrent.removeTorrent(dl.info_hash, false)
      console.log('[Launch] Released torrent files')
      // Небольшая пауза чтобы файлы освободились
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  const { spawn } = require('child_process')
  const start = Date.now()

  try {
    const isSetup = game?.exe_type === 'setup' || path.basename(exePath).toLowerCase().includes('setup')
    const { spawn } = require('child_process')
    const workDir = path.dirname(exePath)

    if (isSetup) {
      // Setup — через shell.openPath чтобы Windows показал UAC
      const err = await shell.openPath(exePath)
      if (err) {
        console.error('[Launch] openPath failed:', err)
        return { ok: false, error: err }
      }
      console.log('[Launch] Setup opened via shell')
      return { ok: true, method: 'shell' }
    }

    // Игра — spawn с рабочей директорией и параметрами
    const args = launchArgs ? launchArgs.trim().split(/\s+/).filter(Boolean) : []
    
    const child = spawn(exePath, args, {
      cwd: workDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    })

    child.on('error', (err) => {
      console.error('[Launch] spawn error:', err.message)
    })

    console.log('[Launch] Game spawned, PID:', child.pid, '| cwd:', workDir)

    const startTime = Date.now()
    
    // Каждую минуту сохраняем прогресс пока игра открыта
    const playtimeInterval = setInterval(() => {
      db.updatePlaytime(gameId, 1)
      mainWindow?.webContents.send('game:playtimeTick', { gameId, addMinutes: 1 })
    }, 60000)

    child.on('close', (code) => {
      clearInterval(playtimeInterval)
      const mins = Math.round((Date.now() - startTime) / 60000)
      console.log(`[Launch] Game closed after ${mins} min`)
      // Финальное обновление (на случай если < 1 минуты)
      if (mins === 0) {
        const secs = Math.round((Date.now() - startTime) / 1000)
        if (secs > 10) db.updatePlaytime(gameId, 1)
      }
      mainWindow?.webContents.send('game:closed', { gameId })
    })

    child.unref()
    return { ok: true, pid: child.pid }
  } catch (err) {
    console.error('[Launch] Error:', err.message)
    // Запасной вариант — shell
    try {
      const e = await shell.openPath(exePath)
      return e ? { ok: false, error: e } : { ok: true, method: 'shell' }
    } catch (e2) {
      return { ok: false, error: err.message }
    }
  }
})


// Подтягивает обложки для всех игр в библиотеке у которых нет обложки
async function syncMissingCovers() {
  const games = db.getAllGames().filter(g => 
    !g.cover_url && g.title && 
    g.title !== 'Загрузка...' && 
    g.title !== 'Неизвестная игра'
  )
  if (!games.length) { console.log('[Cover] All games have covers'); return }
  console.log(`[Cover] Syncing ${games.length} games without covers...`)
  for (const game of games) {
    try {
      const info = await covers.fetchCover(game.title)
      if (info?.cover) {
        db.updateGame(game.id, { cover_url: info.cover })
        mainWindow?.webContents.send('game:coverUpdated', { gameId: game.id, cover: info.cover })
        console.log('[Cover] Synced:', game.title, '->', info.name)
      } else {
        console.warn('[Cover] Not found for:', game.title)
      }
    } catch (e) {
      console.warn('[Cover] Error for', game.title, ':', e.message)
    }
    // Небольшая задержка между запросами чтобы не спамить Steam API
    await new Promise(r => setTimeout(r, 500))
  }
  console.log('[Cover] Sync complete')
}

// Позволяет вызвать синхронизацию из renderer через IPC


ipcMain.handle('cover:syncAll', async () => {
  syncMissingCovers()
  return true
})

// ── App ───────────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await db.initDb()
  createWindow()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !tray) app.quit() })
