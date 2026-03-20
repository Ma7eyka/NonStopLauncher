import { useState, useEffect, useRef, useCallback } from 'react'
import { IconPause, IconResume, IconClose, IconInbox } from '../components/Icons'
import './DownloadsPage.css'

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState({})
  const ready = useRef(false)

  const upsert = useCallback((gameId, patch) => {
    setDownloads(prev => ({
      ...prev,
      [gameId]: { ...(prev[gameId] ?? {}), ...patch },
    }))
  }, [])

  useEffect(() => {
    // Загружаем из БД (включая прерванные)
    window.electron?.getDownloads().then(list => {
      const map = {}
      for (const d of list ?? []) {
        map[d.game_id] = {
          ...d,
          gameId: d.game_id,
          dlId:   d.id,
          name:   d.title || 'Загрузка...',
          progress: d.progress || 0,
        }
      }
      setDownloads(map)
    })

    if (!ready.current) {
      ready.current = true

      window.electron?.onProgress(data => {
        if (!data.gameId) return
        upsert(data.gameId, { ...data, status: data.status || 'downloading' })
      })

      window.electron?.onDone(data => {
        upsert(data.gameId, { progress: 100, status: 'done' })
        setTimeout(() => {
          setDownloads(prev => {
            const n = { ...prev }
            delete n[data.gameId]
            return n
          })
        }, 4000)
      })

      window.electron?.onCoverUpdated(data => {
        upsert(data.gameId, { cover_url: data.cover })
      })
    }
  }, [])

  const list = Object.values(downloads)
  const activeCount = list.filter(d => d.status === 'downloading').length

  async function handlePause(item) {
    await window.electron?.pauseDownload({
      infoHash: item.infoHash,
      dlId: item.dlId,
    })
    upsert(item.gameId, { status: 'paused' })
  }

  async function handleResume(item) {
    await window.electron?.resumeDownload({
      infoHash:  item.infoHash,
      dlId:      item.dlId,
      magnetUrl: item.magnet_url,
      savePath:  item.save_path,
      gameId:    item.gameId,
    })
    upsert(item.gameId, { status: 'downloading' })
  }

  async function handleRemove(item) {
    const name = item.name || item.title || 'загрузку'
    if (!confirm(`Удалить «${name}»?`)) return
    
    // Спрашиваем удалять ли файлы с диска
    const delFiles = item.save_path
      ? confirm(`Удалить скачанные файлы с диска?\n${item.save_path}`)
      : false

    await window.electron?.removeDownload({
      infoHash: item.infoHash,
      dlId:     item.dlId || item.id,
      gameId:   item.gameId || item.game_id,
      del:      delFiles,
    })
    setDownloads(prev => { const n = { ...prev }; delete n[item.gameId ?? item.game_id]; return n })
  }

  return (
    <div className="downloads-page">
      <div className="dl-header">
        <h1>Загрузки</h1>
        <p className="subtitle">{activeCount} активных</p>
      </div>

      {list.length === 0 ? (
        <div className="state-view">
          <IconInbox />
          <p>Нет загрузок</p>
          <span className="hint">Найди игру и нажми «Скачать»</span>
        </div>
      ) : (
        <div className="dl-list">
          {list.map((dl, i) => (
            <DownloadCard
              key={dl.gameId ?? dl.game_id ?? i}
              item={dl}
              onPause={handlePause}
              onResume={handleResume}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DownloadCard({ item, onPause, onResume, onRemove }) {
  const status   = item.status ?? 'queued'
  const progress = Math.min(100, Math.max(0, parseFloat(item.progress) || 0))
  const history  = item.speedHistory ?? []

  const labels = {
    downloading: 'Загрузка', paused: 'Пауза',
    queued: 'Ожидание', done: 'Готово', error: 'Ошибка'
  }
  const colors = {
    downloading: 'badge-green', paused: 'badge-yellow',
    queued: 'badge-red', done: 'badge-green', error: 'badge-red'
  }

  return (
    <div className="dl-card card">
      {item.cover_url && (
        <img src={item.cover_url} className="dl-cover" alt=""
          onError={e => e.target.style.display='none'} />
      )}

      <div className="dl-body">
        <div className="dl-top">
          <span className="dl-title">{item.name || item.title || 'Загрузка...'}</span>
          <span className={`badge ${colors[status]}`}>{labels[status]}</span>
        </div>

        <div className="dl-progress-bar">
          <div className="dl-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="dl-stats">
          <Stat label="Прогресс"  val={`${progress.toFixed(1)}%`} big />
          <Stat label="Загружено" val={item.downloadedFmt ?? '—'} />
          <Stat label="Размер"    val={item.totalFmt ?? '?'} />
          <Stat label="Скорость"  val={item.speedFmt ?? '0 B/s'} accent />
          <Stat label="Макс"      val={item.maxSpeedFmt ?? '—'} />
          <Stat label="ETA"       val={item.eta ?? '—'} />
          <Stat label="Пиры"      val={String(item.peers ?? 0)} />
        </div>

        {history.length > 2 && <SpeedChart history={history} />}

        {/* Показываем если это возобновлённая загрузка */}
        {status === 'paused' && (
          <div className="resume-hint">
            Загрузка прервана — нажми ▶ для продолжения
          </div>
        )}
      </div>

      <div className="dl-actions">
        {status === 'downloading' && (
          <button className="btn btn-ghost sq" onClick={() => onPause(item)}>
            <IconPause />
          </button>
        )}
        {(status === 'paused' || status === 'queued') && (
          <button className="btn btn-ghost sq" onClick={() => onResume(item)}>
            <IconResume />
          </button>
        )}
        {status !== 'done' && (
          <button className="btn btn-ghost sq danger" onClick={() => onRemove(item)}>
            <IconClose />
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, val, big, accent }) {
  return (
    <div className="stat-block">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${big?' big':''}${accent?' accent':''}`}>{val}</span>
    </div>
  )
}

function SpeedChart({ history }) {
  const ref = useRef(null)
  const max  = Math.max(...history.map(h => h.speed), 1)

  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const W = cv.offsetWidth || 500, H = 64
    cv.width = W
    ctx.clearRect(0, 0, W, H)

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const y = (H / 4) * i
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    const step = W / Math.max(history.length - 1, 1)
    const pt = i => ({ x: i * step, y: H - (history[i].speed / max) * (H - 6) + 3 })

    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, 'rgba(192,57,43,0.45)')
    grad.addColorStop(1, 'rgba(192,57,43,0.0)')

    ctx.beginPath(); ctx.moveTo(0, H)
    history.forEach((_, i) => { const p = pt(i); ctx.lineTo(p.x, p.y) })
    ctx.lineTo((history.length - 1) * step, H)
    ctx.fillStyle = grad; ctx.fill()

    ctx.beginPath(); ctx.strokeStyle = 'var(--accent)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'
    history.forEach((_, i) => { const p = pt(i); i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y) })
    ctx.stroke()

    const lp = pt(history.length - 1)
    ctx.beginPath(); ctx.arc(lp.x, lp.y, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = 'var(--accent-bright)'; ctx.fill()

    // Нули — обрывы соединения
    history.forEach((h, i) => {
      if (h.speed === 0 && i > 0) {
        const p = pt(i)
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#e74c3c'; ctx.fill()
      }
    })
  }, [history, max])

  const fmt = b => {
    if (!b) return '0 B/s'
    const k=1024, u=['B','KB','MB','GB']
    const i=Math.min(Math.floor(Math.log(Math.max(b,1))/Math.log(k)),3)
    return (b/Math.pow(k,i)).toFixed(1)+' '+u[i]+'/s'
  }

  return (
    <div className="speed-chart-wrap">
      <div className="chart-header">
        <span>График скорости</span>
        <div className="chart-legend">
          <span>Сейчас: <b className="accent-text">{fmt(history[history.length-1]?.speed)}</b></span>
          <span>Макс: <b>{fmt(Math.max(...history.map(h=>h.speed)))}</b></span>
        </div>
      </div>
      <canvas ref={ref} className="speed-chart" height={64} />
      <div className="chart-axis">
        <span>−{history.length}с</span>
        <span>сейчас</span>
      </div>
    </div>
  )
}
