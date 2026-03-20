import { useState, useEffect } from 'react'
import { IconPlay, IconClose, IconStar, IconClock, IconController } from '../components/Icons'
import './GamePage.css'

export default function GamePage({ game, onClose, onLaunch }) {
  const [steamData, setSteamData] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [activeShot, setActiveShot] = useState(0)

  useEffect(() => {
    if (!game) return
    fetchSteamData()
  }, [game?.id])

  async function fetchSteamData() {
    setLoading(true)
    try {
      const info = await window.electron?.fetchCover(game.title)
      if (info?.steamId) {
        const resp = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${info.steamId}&l=russian`
        )
        const json = await resp.json()
        const data = json[info.steamId]?.data
        if (data) setSteamData(data)
      }
    } catch (e) {
      console.warn('[GamePage] Steam fetch failed:', e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!game) return null

  const playtime = game.playtime_minutes >= 60
    ? `${Math.floor(game.playtime_minutes / 60)} ч ${game.playtime_minutes % 60} мин`
    : game.playtime_minutes > 0 ? `${game.playtime_minutes} мин` : 'Не запускалась'

  const isSetup = game.exe_type === 'setup'
  const screenshots = steamData?.screenshots?.slice(0, 8) || []
  const genres = steamData?.genres?.map(g => g.description).join(', ') || game.meta_genres || ''
  const desc = steamData?.short_description || ''
  const rating = steamData?.metacritic?.score

  return (
    <div className="gamepage-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gamepage">

        {/* Hero */}
        <div className="gamepage-hero" style={{
          backgroundImage: steamData?.header_image
            ? `url(${steamData.header_image})`
            : game.cover_url ? `url(${game.cover_url})` : undefined
        }}>
          <div className="gamepage-hero-overlay" />
          <button className="gamepage-close" onClick={onClose}><IconClose /></button>
          <div className="gamepage-hero-content">
            <h1 className="gamepage-title">{steamData?.name || game.title}</h1>
            <div className="gamepage-hero-meta">
              {genres && <span className="gp-tag">{genres.split(',')[0].trim()}</span>}
              {rating && <span className="gp-rating"><IconStar size={12} /> {rating}</span>}
              {steamData?.release_date?.date && <span className="gp-date">{steamData.release_date.date}</span>}
            </div>
            <div className="gamepage-hero-actions">
              <button className="btn btn-primary gp-play-btn" onClick={onLaunch} disabled={!game.exe_path}>
                <IconPlay /> {isSetup ? 'Установить' : 'Играть'}
              </button>
              <div className="gp-stat">
                <IconClock size={13} />
                <span>{playtime}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="gamepage-body">
          {/* Скриншоты */}
          {screenshots.length > 0 && (
            <div className="gp-screenshots">
              <div className="gp-main-shot">
                <img src={screenshots[activeShot]?.path_full} alt="screenshot" />
              </div>
              <div className="gp-shots-strip">
                {screenshots.map((s, i) => (
                  <img key={i} src={s.path_thumbnail} alt=""
                    className={activeShot === i ? 'active' : ''}
                    onClick={() => setActiveShot(i)} />
                ))}
              </div>
            </div>
          )}

          <div className="gp-info">
            {/* Описание */}
            {loading ? (
              <div className="state-view" style={{padding:'40px 0'}}>
                <div className="spinner"/><span>Загрузка из Steam...</span>
              </div>
            ) : desc ? (
              <div className="gp-description">
                <h3>Об игре</h3>
                <p>{desc}</p>
              </div>
            ) : (
              <div className="gp-no-data">
                <IconController size={32} />
                <p>Описание недоступно</p>
              </div>
            )}

            {/* Детали */}
            {steamData && (
              <div className="gp-details">
                {steamData.developers?.length > 0 && (
                  <div className="gp-detail-row">
                    <span className="gp-detail-label">Разработчик</span>
                    <span>{steamData.developers.join(', ')}</span>
                  </div>
                )}
                {steamData.publishers?.length > 0 && (
                  <div className="gp-detail-row">
                    <span className="gp-detail-label">Издатель</span>
                    <span>{steamData.publishers.join(', ')}</span>
                  </div>
                )}
                {steamData.release_date?.date && (
                  <div className="gp-detail-row">
                    <span className="gp-detail-label">Выход</span>
                    <span>{steamData.release_date.date}</span>
                  </div>
                )}
                {genres && (
                  <div className="gp-detail-row">
                    <span className="gp-detail-label">Жанры</span>
                    <span>{genres}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
