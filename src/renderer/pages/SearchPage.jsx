import { useState, useEffect, useRef } from 'react'
import { IconSearch, IconLink, IconDownload, IconSad } from '../components/Icons'
import './SearchPage.css'

export default function SearchPage({ initialQuery }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const [history, setHistory]   = useState([])
  const [downloading, setDownloading] = useState(new Set())
  const inputRef = useRef(null)

  useEffect(() => {
    window.electron?.getSearchHistory().then(h => setHistory(h.map(r => r.query)))
    inputRef.current?.focus()
    if (initialQuery) {
      setQuery(initialQuery)
      // Автозапуск поиска
      setTimeout(() => handleSearch(null, initialQuery), 100)
    }
  }, [])

  async function handleSearch(e, overrideQuery) {
    e?.preventDefault()
    const q = overrideQuery || query
    if (!q.trim()) return
    if (overrideQuery) setQuery(overrideQuery)
    setLoading(true)
    setSearched(true)
    try {
      const data = await window.electron?.searchRepacks(q) ?? []
      setResults(data)
    } catch (err) {
      console.error(err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(item) {
    const key = item.detailUrl || item.title
    setDownloading(prev => new Set(prev).add(key))

    try {
      let magnet = item.magnet
      
      // Получаем magnet со страницы если его нет
      if (!magnet && item.detailUrl) {
        magnet = await window.electron?.getMagnet(item.detailUrl)
      }

      if (!magnet) {
        alert(`Не удалось получить magnet-ссылку для "${item.title}".\n\nПопробуй открыть страницу вручную.`)
        return
      }

      // Выбираем папку (или используем путь по умолчанию из настроек)
      const settings = await window.electron?.getSettings()
      let savePath = settings?.defaultSavePath || null
      
      if (!savePath) {
        savePath = await window.electron?.chooseSavePath()
        if (!savePath) return
      }

      const result = await window.electron?.downloadGame({
        magnetUrl: magnet,
        savePath,
        gameTitle: item.title,
      })

      if (result?.reason === 'duplicate') {
        alert(`"${item.title}" уже скачивается!`)
      }
    } finally {
      setDownloading(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  const POPULAR_GAMES = [
    'GTA V', 'Red Dead Redemption 2', 'Cyberpunk 2077',
    'Elden Ring', "Baldur's Gate 3", 'The Witcher 3',
    'God of War', 'Hogwarts Legacy', 'Half-Life 2',
    'GTA IV', 'Far Cry 5', 'Resident Evil 4',
  ]

  return (
    <div className="search-page">
      <div className="search-page-header">
        <h1>Найти игру</h1>
        <p className="subtitle">Поиск репаков по названию</p>
      </div>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-wrapper big">
          <span className="search-icon"><IconSearch /></span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Введи название игры..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            list="history-list"
          />
          <datalist id="history-list">
            {history.map((h, i) => <option key={i} value={h} />)}
          </datalist>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner-sm" /> : 'Найти'}
        </button>
      </form>

      {/* Популярные игры — показываем если нет результатов */}
      {!loading && !searched && (
        <div className="popular-section-search">
          <p className="popular-title-search">Популярные игры</p>
          <div className="popular-cards-grid">
            {POPULAR_GAMES.map(title => (
              <button key={title} className="popular-card"
                onClick={() => { setQuery(title); handleSearch(null, title) }}>
                <span className="popular-card-letter">{title[0]}</span>
                <span className="popular-card-title">{title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="state-view"><div className="spinner" /><span>Ищем репаки...</span></div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="state-view">
          <IconSad />
          <p>Ничего не найдено по запросу «{query}»</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="results-list">
          <p className="results-count">{results.length} результатов</p>
          {results.map((item, i) => (
            <RepackRow key={i} item={item} onDownload={handleDownload}
              isLoading={downloading.has(item.detailUrl)} />
          ))}
        </div>
      )}
    </div>
  )
}

function RepackRow({ item, onDownload, isLoading }) {
  const seederColor = item.seeders > 1000 ? 'badge-green' : item.seeders > 300 ? 'badge-yellow' : 'badge-red'

  return (
    <div className="repack-row card">
      <div className="repack-info">
        <div className="repack-title">{item.title}</div>
        <div className="repack-meta">
          <span className="badge badge-red">{item.source}</span>
          <span>{item.size}</span>
          <span className={`badge ${seederColor}`}>{item.seeders} сидов</span>
          <span className="badge">{item.leechers} личей</span>
        </div>
      </div>
      <div className="repack-actions">
        {item.detailUrl && (
          <button className="btn btn-ghost icon-text"
            onClick={() => window.electron?.openExternal(item.detailUrl)}>
            <IconLink /> Страница
          </button>
        )}
        <button className="btn btn-primary icon-text" onClick={() => onDownload(item)} disabled={isLoading}>
          {isLoading ? <span className="spinner-sm" /> : <><IconDownload /> Скачать</>}
        </button>
      </div>
    </div>
  )
}
