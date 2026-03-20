const path = require('path')
const fs   = require('fs')
const { app } = require('electron')

let db = null

async function initDb() {
  if (db) return db
  const SQL  = await require('sql.js')()
  const dir  = app.getPath('userData')
  const file = path.join(dir, 'nonstop.db')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  db = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database()

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      title            TEXT NOT NULL,
      cover_url        TEXT,
      install_path     TEXT,
      exe_path         TEXT,
      exe_type         TEXT DEFAULT 'game',
      size_bytes       INTEGER DEFAULT 0,
      playtime_minutes INTEGER DEFAULT 0,
      last_played      TEXT,
      added_at         TEXT DEFAULT (datetime('now')),
      status           TEXT DEFAULT 'installed',
      meta_rating      REAL,
      meta_genres      TEXT,
      launch_args      TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS downloads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id     INTEGER NOT NULL,
      magnet_url  TEXT NOT NULL,
      info_hash   TEXT,
      save_path   TEXT NOT NULL,
      progress    REAL DEFAULT 0,
      status      TEXT DEFAULT 'queued',
      added_at    TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS search_history (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      at    TEXT DEFAULT (datetime('now'))
    );
  `)

  // При старте — активные загрузки помечаем как paused (можно возобновить)
  db.run(`UPDATE downloads SET status='paused' WHERE status='downloading'`)
  db.run(`UPDATE games SET status='paused' WHERE status='downloading'`)
  
  // Удаляем фантомные загрузки — без magnet_url или с пустым
  db.run(`DELETE FROM downloads WHERE magnet_url IS NULL OR magnet_url = ''`)
  
  // Удаляем дубли — оставляем только последнюю запись для каждой game_id
  db.run(`DELETE FROM downloads WHERE id NOT IN (
    SELECT MAX(id) FROM downloads GROUP BY game_id
  ) AND status != 'done'`)
  
  // Удаляем игры-фантомы — без скачиваний и без install_path
  db.run(`DELETE FROM games WHERE status='paused' AND install_path IS NULL AND id NOT IN (
    SELECT game_id FROM downloads
  )`)

  save()
  console.log('[DB] Ready at', file)
  return db
}

function save() {
  if (!db) return
  fs.writeFileSync(path.join(app.getPath('userData'), 'nonstop.db'), Buffer.from(db.export()))
}

function all(sql, p=[]) {
  const s = db.prepare(sql); s.bind(p)
  const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r
}
function run(sql, p=[]) { db.run(sql, p); save() }
function lastId() {
  // Получаем ID ДО save() — после save() last_insert_rowid сбрасывается
  const res = db.exec('SELECT last_insert_rowid()')
  return res[0]?.values[0]?.[0] ?? null
}
function runAndGetId(sql, p=[]) {
  db.run(sql, p)
  const id = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] ?? null
  save()
  return id
}

function getAllGames() {
  return all('SELECT * FROM games ORDER BY last_played DESC, added_at DESC')
}
function addGame(g) {
  return runAndGetId(
    `INSERT INTO games (title,cover_url,install_path,exe_path,size_bytes,status) VALUES (?,?,?,?,?,?)`,
    [g.title, g.cover_url??null, g.install_path??null, g.exe_path??null, g.size_bytes??0, g.status??'installed']
  )
}
function updateGame(id, fields) {
  const keys = Object.keys(fields); if (!keys.length) return
  run(`UPDATE games SET ${keys.map(k=>k+'=?').join(',')} WHERE id=?`, [...Object.values(fields), id])
}
function updateGameStatus(id, status) { run('UPDATE games SET status=? WHERE id=?', [status, id]) }
function updatePlaytime(id, mins) {
  run(`UPDATE games SET playtime_minutes=playtime_minutes+?,last_played=datetime('now') WHERE id=?`,[mins,id])
}
function deleteGame(id) {
  run('DELETE FROM downloads WHERE game_id=?', [id])
  run('DELETE FROM games WHERE id=?', [id])
}

// Все незавершённые загрузки (для автовозобновления и показа в UI)
function getAllDownloads() {
  return all(`
    SELECT d.*, g.title, g.cover_url
    FROM downloads d
    LEFT JOIN games g ON g.id = d.game_id
    WHERE d.status != 'done'
      AND d.magnet_url IS NOT NULL
      AND d.magnet_url != ''
    ORDER BY d.added_at DESC
  `)
}
// Загрузки которые были прерваны — для автовозобновления
function getPausedDownloads() {
  return all(`
    SELECT d.*, g.title, g.cover_url
    FROM downloads d
    INNER JOIN games g ON g.id = d.game_id
    WHERE d.status = 'paused' AND d.magnet_url IS NOT NULL AND d.magnet_url != ''
    ORDER BY d.added_at DESC
  `)
}
function addDownload(d) {
  return runAndGetId(
    `INSERT INTO downloads (game_id,magnet_url,save_path,status) VALUES (?,?,?,?)`,
    [d.game_id, d.magnet_url, d.save_path, 'downloading']
  )
}
function updateDownloadInfoHash(id, hash) { run('UPDATE downloads SET info_hash=? WHERE id=?', [hash, id]) }
function updateDownloadProgress(dlId, progress, status) {
  run('UPDATE downloads SET progress=?,status=? WHERE id=?', [progress, status, dlId])
}
function finishDownload(dlId) {
  run(`UPDATE downloads SET status='done',progress=100,finished_at=datetime('now') WHERE id=?`, [dlId])
}
function deleteDownload(id) { run('DELETE FROM downloads WHERE id=?', [id]) }

function addSearchHistory(q) { run('INSERT INTO search_history (query) VALUES (?)', [q]) }
function getSearchHistory(n=10) { return all('SELECT DISTINCT query FROM search_history ORDER BY at DESC LIMIT ?',[n]) }

module.exports = {
  initDb, getAllGames, addGame, updateGame, updateGameStatus, updatePlaytime, deleteGame,
  getAllDownloads, getPausedDownloads, addDownload, updateDownloadInfoHash,
  updateDownloadProgress, finishDownload, deleteDownload,
  addSearchHistory, getSearchHistory,
}
