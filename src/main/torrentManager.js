const path = require('path')
const os   = require('os')
const fs   = require('fs')

let wtClient = null
const intervals = new Map()

async function getClient() {
  if (wtClient) return wtClient
  const { default: WebTorrent } = await import('webtorrent')
  wtClient = new WebTorrent()
  wtClient.on('error', err => console.error('[WT global error]', err))
  console.log('[WT] Client created')
  return wtClient
}

async function downloadTorrent(magnetUrl, savePath, onProgress, onDone) {
  // Декодируем HTML entities в magnet ссылке
  magnetUrl = magnetUrl
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

  console.log('[WT] downloadTorrent called')
  console.log('[WT] savePath:', savePath)
  console.log('[WT] magnet:', magnetUrl.slice(0, 80))

  const wt  = await getClient()
  const dir = savePath || path.join(require('os').homedir(), 'Downloads', 'NonStop')

  // Создаём папку
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log('[WT] Created dir:', dir)
  } else {
    console.log('[WT] Dir exists:', dir)
  }

  console.log('[WT] Calling wt.add...')

  try {
    wt.add(magnetUrl, { path: dir }, (torrent) => {
      console.log('[WT] Torrent added! name:', torrent.name, 'infoHash:', torrent.infoHash)
      console.log('[WT] Files:', torrent.files?.map(f => f.name))

      const id = torrent.infoHash
      const speedHistory = []

      // Сразу шлём прогресс
      onProgress({
        infoHash: id, name: torrent.name || 'Загрузка...',
        progress: 0, downloadedFmt: '0 B', totalFmt: fmtBytes(torrent.length),
        speedFmt: '0 B/s', maxSpeedFmt: '0 B/s',
        peers: torrent.numPeers, eta: '—',
        status: 'downloading', speedHistory: [],
      })

      const interval = setInterval(() => {
        const speed = torrent.downloadSpeed || 0
        speedHistory.push({ t: Date.now(), speed })
        if (speedHistory.length > 60) speedHistory.shift()
        const maxSpeed = Math.max(...speedHistory.map(s => s.speed), 0)

        const prog = +(torrent.progress * 100).toFixed(2)

        if (prog > 0 || torrent.numPeers > 0) {
          console.log(`[WT] Progress: ${prog}% | speed: ${fmtBytes(speed)}/s | peers: ${torrent.numPeers}`)
        }

        onProgress({
          infoHash: id,
          name: torrent.name || 'Загрузка...',
          progress: prog,
          downloadedFmt: fmtBytes(torrent.downloaded),
          totalFmt: fmtBytes(torrent.length),
          speed, speedFmt: fmtBytes(speed) + '/s',
          maxSpeed, maxSpeedFmt: fmtBytes(maxSpeed) + '/s',
          peers: torrent.numPeers,
          eta: fmtEta(torrent.timeRemaining),
          status: torrent.paused ? 'paused' : 'downloading',
          speedHistory: speedHistory.slice(-30),
        })

        if (torrent.done) {
          clearInterval(interval)
          intervals.delete(id)
          console.log('[WT] DONE:', torrent.name)
          onDone({ infoHash: id, name: torrent.name, path: dir })
        }
      }, 1000)

      intervals.set(id, interval)

      torrent.on('error', err => {
        console.error('[WT torrent error]', err)
        clearInterval(interval)
        intervals.delete(id)
      })

      torrent.on('warning', w => console.warn('[WT warning]', w))
    })
  } catch (err) {
    console.error('[WT] wt.add threw:', err)
  }
}

function findTorrent(id) {
  return wtClient?.torrents?.find(t => t.infoHash === id) || null
}

function pauseTorrent(id) {
  const t = findTorrent(id)
  if (t) { t.pause(); console.log('[WT] Paused:', id) }
}

function resumeTorrent(id) {
  const t = findTorrent(id)
  if (t) { t.resume(); console.log('[WT] Resumed:', id) }
}

function removeTorrent(id, del = false) {
  const t = findTorrent(id)
  if (t) {
    clearInterval(intervals.get(id))
    intervals.delete(id)
    t.destroy({ destroyStore: !!del })
    console.log('[WT] Removed:', id)
  }
}

function fmtBytes(b) {
  if (!b || b <= 0) return '0 B'
  const k = 1024, u = ['B','KB','MB','GB']
  const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), 3)
  return (b / Math.pow(k, i)).toFixed(1) + ' ' + u[i]
}
function fmtEta(ms) {
  if (!ms || !isFinite(ms) || ms <= 0) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}с`
  if (s < 3600) return `${Math.floor(s/60)}м ${s%60}с`
  return `${Math.floor(s/3600)}ч ${Math.floor((s%3600)/60)}м`
}

module.exports = { downloadTorrent, pauseTorrent, resumeTorrent, removeTorrent, findTorrent }
