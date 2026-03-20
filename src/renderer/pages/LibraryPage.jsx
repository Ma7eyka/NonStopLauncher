import { useState, useEffect, useCallback } from 'react'
import { IconPlay, IconTrash, IconController, IconSearch, IconSettings } from '../components/Icons'
import GameModal from '../components/GameModal'
import GamePage from './GamePage'
import Changelog from '../components/Changelog'
import { showNotification } from '../components/Notification'
import './LibraryPage.css'

export default function LibraryPage({ onNavigate }) {
  const [games, setGames]         = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [progMap, setProgMap]     = useState({})
  const [selectedGame, setSelectedGame] = useState(null)
  const [gamePageGame, setGamePageGame] = useState(null)
  const [sortBy, setSortBy]   = useState('recent')  // recent | name | playtime
  const [filterBy, setFilterBy] = useState('all')   // all | installed | downloading

  const loadGames = useCallback(async () => {
    try {
      const data = await window.electron?.getGames() ?? []
      setGames(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGames()

    // ipcRenderer.on накапливает листенеры — используем флаг чтобы добавить только раз
    const onProgress = (data) => {
      setProgMap(prev => ({ ...prev, [data.gameId]: data.progress }))
    }
    const onDone = ({ gameId, name }) => {
      setTimeout(() => loadGames(), 500)
      // Показываем уведомление только один раз через ref
      if (!window._shownDoneFor) window._shownDoneFor = new Set()
      if (!window._shownDoneFor.has(gameId)) {
        window._shownDoneFor.add(gameId)
        showNotification({
          type: 'success',
          title: 'Загрузка завершена!',
          desc: name || 'Игра готова к установке',
        })
      }
    }
    const onCover = ({ gameId, cover }) => {
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, cover_url: cover } : g))
    }

    window.electron?.onProgress(onProgress)
    window.electron?.onDone(onDone)
    window.electron?.onCoverUpdated(onCover)

    // Реальный счётчик времени — обновляем каждую минуту пока игра открыта
    window.electron?.onPlaytimeTick?.(({ gameId, addMinutes }) => {
      setGames(prev => prev.map(g =>
        g.id === gameId
          ? { ...g, playtime_minutes: (g.playtime_minutes || 0) + addMinutes }
          : g
      ))
    })

    // Игра закрылась — перезагружаем библиотеку
    window.electron?.onGameClosed?.(() => {
      setTimeout(() => loadGames(), 500)
    })
  }, [])

  // Уведомление о рекорде при обновлении игр
  useEffect(() => {
    const prev = window._prevPlaytimes || {}
    games.forEach(g => {
      if (g.playtime_minutes > 0 && prev[g.id] !== undefined && g.playtime_minutes > prev[g.id]) {
        const hrs = Math.floor(g.playtime_minutes / 60)
        if (hrs > 0 && Math.floor(prev[g.id] / 60) < hrs) {
          showNotification({
            type: 'record',
            title: `Рекорд! ${hrs} часов`,
            desc: g.title,
          })
        }
      }
    })
    window._prevPlaytimes = Object.fromEntries(games.map(g => [g.id, g.playtime_minutes]))
  }, [games])

  const filtered = games
    .filter(g => {
      if (!g.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterBy === 'installed')   return g.status === 'installed'
      if (filterBy === 'downloading') return g.status === 'downloading' || g.status === 'paused'
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'name')     return a.title.localeCompare(b.title)
      if (sortBy === 'playtime') return (b.playtime_minutes||0) - (a.playtime_minutes||0)
      return new Date(b.added_at||0) - new Date(a.added_at||0) // recent
    })

  return (
    <div className="library">
      <div className="library-header">
        <div>
          <h1>Библиотека</h1>
          <p className="subtitle">{games.length} игр</p>
        </div>
        <div className="library-controls">
          <div className="search-wrapper">
            <span className="search-icon"><IconSearch /></span>
            <input className="search-input" placeholder="Поиск..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="lib-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="recent">Недавние</option>
            <option value="name">По названию</option>
            <option value="playtime">По времени</option>
          </select>
          <select className="lib-select" value={filterBy} onChange={e => setFilterBy(e.target.value)}>
            <option value="all">Все</option>
            <option value="installed">Установленные</option>
            <option value="downloading">Загрузка</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="state-view"><div className="spinner" /><span>Загрузка...</span></div>
      ) : filtered.length === 0 ? (
        <EmptyLibrary onNavigate={onNavigate} />
      ) : (
        <div className="games-grid">
          {filtered.map(game => (
            <GameCard
              key={game.id}
              game={game}
              progress={progMap[game.id]}
              onUpdate={loadGames}
              onOpen={() => setSelectedGame(game)}
              onOpenGamePage={() => setGamePageGame(game)}
            />
          ))}
        </div>
      )}

      <Changelog />

      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onUpdate={() => { loadGames(); setSelectedGame(null) }}
        />
      )}

      {gamePageGame && (
        <GamePage
          game={gamePageGame}
          onClose={() => setGamePageGame(null)}
          onLaunch={async () => {
            await window.electron?.launchGame(gamePageGame.id, gamePageGame.exe_path)
            setGamePageGame(null)
          }}
        />
      )}
    </div>
  )
}

function EmptyLibrary({ onNavigate }) {
  const popular = [
    'GTA V', 'Cyberpunk 2077', 'Red Dead Redemption 2',
    'Elden Ring', "Baldur's Gate 3", 'The Witcher 3',
    'God of War', 'Spider-Man Remastered', 'Hogwarts Legacy', 'Starfield',
  ]
  return (
    <div className="empty-library">
      <IconController />
      <h2>Библиотека пуста</h2>
      <p>Найди и скачай игры</p>
      <button className="btn btn-primary" onClick={() => onNavigate?.('search')}>Найти игру</button>
      <div className="popular-section">
        <p className="popular-title">Популярные игры</p>
        <div className="popular-grid">
          {popular.map(t => (
            <button key={t} className="popular-item" onClick={() => onNavigate?.('search', t)}>{t}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function GameCard({ game, progress, onUpdate, onOpen, onOpenGamePage }) {
  const [hover, setHover]   = useState(false)
  const [imgErr, setImgErr] = useState(false)

  const isDownloading = game.status === 'downloading' || game.status === 'paused'
  const isSetup = game.exe_type === 'setup'
  const hasExe  = !!game.exe_path
  const pct = progress ?? game.progress ?? 0

  const playtime = game.playtime_minutes >= 60
    ? `${Math.floor(game.playtime_minutes / 60)} ч`
    : game.playtime_minutes > 0 ? `${game.playtime_minutes} мин` : null

  async function handleLaunch(e) {
    e.stopPropagation()
    if (isDownloading) return
    if (!hasExe) {
      if (game.install_path) {
        const det = await window.electron?.detectExe(game.install_path)
        if (det) {
          await window.electron?.updateGame(game.id, { exe_path: det.exePath, exe_type: det.type })
          onUpdate(); return
        }
      }
      const chosen = await window.electron?.chooseFile([{ name: 'Executable', extensions: ['exe'] }])
      if (chosen) { await window.electron?.updateGame(game.id, { exe_path: chosen, exe_type: 'game' }); onUpdate() }
      return
    }
    await window.electron?.launchGame(game.id, game.exe_path)
  }

  const showCover = game.cover_url && !imgErr
  const btnLabel  = isDownloading ? 'Загрузка...' : isSetup ? 'Установить' : !hasExe ? 'Найти .exe' : 'Играть'

  return (
    <div className="game-card card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpenGamePage}
    >
      <div className="game-cover">
        {showCover
          ? <img src={game.cover_url} alt={game.title} onError={() => setImgErr(true)} />
          : <CoverPlaceholder title={game.title} isDownloading={isDownloading} pct={pct} />
        }
        <div className={`game-overlay ${hover ? 'visible' : ''}`}>
          <button className={`play-btn ${isSetup ? 'setup' : ''} ${!hasExe && !isDownloading ? 'find' : ''}`}
            onClick={handleLaunch} disabled={isDownloading}>
            {isDownloading ? <span className="spinner-sm" /> : <IconPlay />}
            {btnLabel}
          </button>
          <div className="overlay-actions">
            <button className="icon-btn" onClick={e => { e.stopPropagation(); onOpen() }} title="Настройки игры">
              <IconSettings />
            </button>
          </div>
        </div>
        {isDownloading && (
          <div className="card-dl-bar">
            <div className="card-dl-fill" style={{ width: pct > 0 ? `${pct}%` : '100%', opacity: pct > 0 ? 1 : 0.4 }} />
          </div>
        )}
        {isSetup && !isDownloading && <div className="card-badge">Setup</div>}
      </div>
      <div className="game-info">
        <div className="game-title">{game.title}</div>
        <div className="game-meta">
          {isDownloading
            ? <span className="dl-text">{pct > 0 ? `${pct.toFixed(1)}%` : 'Скачивается...'}</span>
            : playtime ? <span>{playtime}</span>
            : <span className="dim">Не запускалась</span>
          }
        </div>
      </div>
    </div>
  )
}

function CoverPlaceholder({ title, isDownloading, pct }) {
  const letter = title?.[0]?.toUpperCase() ?? '?'
  const colors = ['#c0392b','#2980b9','#27ae60','#8e44ad','#e67e22','#16a085','#e91e63','#f39c12']
  const color  = colors[(letter.charCodeAt(0) || 0) % colors.length]
  return (
    <div className="cover-placeholder" style={{ '--ph-color': color }}>
      <div className="ph-letter">{letter}</div>
      {isDownloading && pct > 0 && (
        <div className="ph-progress">
          <svg viewBox="0 0 36 36" width="56" height="56">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="2.5"
              strokeDasharray={`${pct} ${100-pct}`} strokeLinecap="round" transform="rotate(-90 18 18)"/>
          </svg>
          <span className="ph-pct">{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  )
}
