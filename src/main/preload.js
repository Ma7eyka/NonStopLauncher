const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  minimize:     () => ipcRenderer.send('window:minimize'),
  hideToTray:   () => ipcRenderer.send('window:hide'),
  quitApp:      () => ipcRenderer.send('app:quit'),
  maximize:     () => ipcRenderer.send('window:maximize'),
  close:        () => ipcRenderer.send('window:close'),
  openExternal: (url) => ipcRenderer.send('open:external', url),

  chooseSavePath: ()  => ipcRenderer.invoke('dialog:chooseSavePath'),
  chooseFile: (f)     => ipcRenderer.invoke('dialog:chooseFile', f),

  getSettings: ()     => ipcRenderer.invoke('settings:get'),
  setSettings: (s)    => ipcRenderer.invoke('settings:set', s),

  getGames:    ()         => ipcRenderer.invoke('db:getGames'),
  getDownloads:()         => ipcRenderer.invoke('db:getDownloads'),
  addGame:     (g)        => ipcRenderer.invoke('db:addGame', g),
  updateGame:  (id, f)    => ipcRenderer.invoke('db:updateGame', id, f),
  deleteGame:  (id)       => ipcRenderer.invoke('db:deleteGame', id),

  fetchCover:  (t)        => ipcRenderer.invoke('cover:fetch', t),
  detectExe:   (p)        => ipcRenderer.invoke('game:detect', p),

  searchRepacks:    (q)   => ipcRenderer.invoke('search:repacks', q),
  getMagnet:        (url) => ipcRenderer.invoke('search:getMagnet', url),
  getSearchHistory: ()    => ipcRenderer.invoke('search:history'),

  downloadGame:  (opts)   => ipcRenderer.invoke('torrent:download', opts),

  // Пауза/Возобновление теперь принимают полный объект
  pauseDownload:  (opts)  => ipcRenderer.invoke('torrent:pause', opts),
  resumeDownload: (opts)  => ipcRenderer.invoke('torrent:resume', opts),
  removeDownload: (opts)  => ipcRenderer.invoke('torrent:remove', opts),

  launchGame: (id, exe)   => ipcRenderer.invoke('game:launch', { gameId: id, exePath: exe }),

  onProgress:     (cb) => ipcRenderer.on('torrent:progress',  (_, d) => cb(d)),
  onUpdateStatus: (cb) => ipcRenderer.on('update:status',     (_, d) => cb(d)),
  checkForUpdate:  ()  => ipcRenderer.invoke('update:check'),
  downloadUpdate:  ()  => ipcRenderer.invoke('update:download'),
  installUpdate:   ()  => ipcRenderer.invoke('update:install'),
  onPlaytimeTick: (cb) => ipcRenderer.on('game:playtimeTick', (_, d) => cb(d)),
  onGameClosed:   (cb) => ipcRenderer.on('game:closed',       (_, d) => cb(d)),
  onNeedsInstall: (cb) => ipcRenderer.on('game:needsInstall', (_, d) => cb(d)),
  onDone:         (cb) => ipcRenderer.on('torrent:done',       (_, d) => cb(d)),
  onCoverUpdated: (cb) => ipcRenderer.on('game:coverUpdated',  (_, d) => cb(d)),
})
