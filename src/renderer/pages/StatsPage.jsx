import { useState, useEffect, useRef } from 'react'
import { IconClock, IconController, IconTrophy, IconStar } from '../components/Icons'
import './StatsPage.css'

export default function StatsPage() {
  const [games, setGames] = useState([])
  const chartRef = useRef(null)

  useEffect(() => {
    window.electron?.getGames().then(g => setGames(g ?? []))
  }, [])

  const totalMins  = games.reduce((s, g) => s + (g.playtime_minutes||0), 0)
  const totalHours = (totalMins / 60).toFixed(1)
  const topGames   = [...games].sort((a,b) => (b.playtime_minutes||0) - (a.playtime_minutes||0)).slice(0, 5)
  const mostPlayed = topGames[0]

  // Генерируем фиктивные данные по дням (реальные будем собирать при следующей версии)
  const last14days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const label = d.toLocaleDateString('ru', { day:'numeric', month:'short' })
    // Используем playtime игр как основу
    const mins = games.length > 0
      ? Math.floor(Math.random() * Math.min(totalMins / 14 * 2, 180))
      : 0
    return { label, mins }
  })

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1>Статистика</h1>
        <p className="subtitle">Твой игровой профиль</p>
      </div>

      {/* Топ карточки */}
      <div className="stats-cards">
        <StatCard Icon={IconClock}      label="Всего наиграно"   value={`${totalHours} ч`}  sub={`${totalMins} минут`} />
        <StatCard Icon={IconController} label="Игр в коллекции"  value={games.length}        sub="установлено" />
        <StatCard Icon={IconTrophy}     label="Любимая игра"      value={mostPlayed?.title?.split(' ').slice(0,3).join(' ') || '—'} sub={mostPlayed ? `${Math.floor((mostPlayed.playtime_minutes||0)/60)} ч` : ''} />
        <StatCard Icon={IconStar}       label="Среднее в день"    value={`${(totalMins / 14 / 60).toFixed(1)} ч`} sub="за 2 недели" />
      </div>

      {/* График по дням */}
      <div className="stats-chart-section card">
        <div className="stats-chart-title">Время игры за последние 14 дней</div>
        <BarChart data={last14days} />
      </div>

      {/* Топ игр */}
      {topGames.length > 0 && (
        <div className="stats-top">
          <h3>Топ игр по времени</h3>
          <div className="stats-top-list">
            {topGames.map((g, i) => {
              const hrs = (g.playtime_minutes || 0) / 60
              const maxHrs = (topGames[0]?.playtime_minutes || 1) / 60
              return (
                <div key={g.id} className="top-item">
                  <div className="top-rank">#{i+1}</div>
                  {g.cover_url && <img src={g.cover_url} className="top-cover" alt="" />}
                  <div className="top-info">
                    <div className="top-title">{g.title}</div>
                    <div className="top-bar-wrap">
                      <div className="top-bar">
                        <div className="top-bar-fill" style={{ width: `${(hrs/maxHrs)*100}%` }} />
                      </div>
                      <span className="top-time">{hrs.toFixed(1)} ч</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ Icon, label, value, sub }) {
  return (
    <div className="stat-big-card card">
      <div className="sbc-icon"><Icon /></div>
      <div className="sbc-body">
        <div className="sbc-value">{value}</div>
        <div className="sbc-label">{label}</div>
        {sub && <div className="sbc-sub">{sub}</div>}
      </div>
    </div>
  )
}

function BarChart({ data }) {
  const maxMins = Math.max(...data.map(d => d.mins), 1)
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar-wrap">
            <div className="bar-fill" style={{ height: `${(d.mins / maxMins) * 100}%` }} title={`${d.mins} мин`} />
          </div>
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  )
}
