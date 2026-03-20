import { useState, useEffect } from 'react'
import { IconTrophy, IconController, IconLibrary, IconClock, IconStar, IconLock, IconCheck, IconDownload } from '../components/Icons'
import './AchievementsPage.css'

const ACHIEVEMENTS = [
  { id: 'first_game',     Icon: IconController, title: 'Первый шаг',         desc: 'Добавь первую игру в библиотеку',     req: g => g.length >= 1 },
  { id: 'five_games',     Icon: IconLibrary,    title: 'Коллекционер',       desc: 'Собери 5 игр в библиотеке',           req: g => g.length >= 5 },
  { id: 'ten_games',      Icon: IconTrophy,     title: 'Архивариус',         desc: 'Собери 10 игр в библиотеке',          req: g => g.length >= 10 },
  { id: 'play_1h',        Icon: IconClock,      title: 'Первый час',         desc: 'Наиграй 1 час в любую игру',          req: g => g.some(x => x.playtime_minutes >= 60) },
  { id: 'play_10h',       Icon: IconClock,      title: 'Заядлый геймер',     desc: 'Наиграй 10 часов в одну игру',        req: g => g.some(x => x.playtime_minutes >= 600) },
  { id: 'play_100h',      Icon: IconStar,       title: 'Задрот',             desc: 'Наиграй 100 часов в одну игру',       req: g => g.some(x => x.playtime_minutes >= 6000) },
  { id: 'play_total_24',  Icon: IconClock,      title: 'Бессонная ночь',     desc: 'Суммарно наиграй 24 часа',            req: g => g.reduce((s,x) => s + (x.playtime_minutes||0), 0) >= 1440 },
  { id: 'play_total_100', Icon: IconStar,       title: 'Мастер геймплея',    desc: 'Суммарно наиграй 100 часов',          req: g => g.reduce((s,x) => s + (x.playtime_minutes||0), 0) >= 6000 },
  { id: 'big_game',       Icon: IconDownload,   title: 'Тяжёлая артиллерия', desc: 'Скачай игру больше 50 ГБ',            req: g => g.some(x => (x.size_bytes||0) > 50*1024**3) },
  { id: 'nonstop',        Icon: IconTrophy,     title: 'NonStop гамер',      desc: 'Запусти игру через NonStop',          req: g => g.some(x => x.last_played) },
]

export default function AchievementsPage() {
  const [games, setGames]       = useState([])
  const [unlocked, setUnlocked] = useState(new Set())

  useEffect(() => {
    window.electron?.getGames().then(g => {
      const list = g ?? []
      setGames(list)
      const u = new Set()
      ACHIEVEMENTS.forEach(a => { if (a.req(list)) u.add(a.id) })
      setUnlocked(u)
    })
  }, [])

  const totalMins  = games.reduce((s, g) => s + (g.playtime_minutes || 0), 0)
  const totalHours = (totalMins / 60).toFixed(1)
  const mostPlayed = [...games].sort((a,b) => (b.playtime_minutes||0) - (a.playtime_minutes||0))[0]

  return (
    <div className="ach-page">
      <div className="ach-header">
        <h1>Достижения</h1>
        <p className="subtitle">{unlocked.size} / {ACHIEVEMENTS.length} разблокировано</p>
      </div>

      <div className="ach-stats">
        <StatCard Icon={IconClock}      label="Всего наиграно"   value={`${totalHours} ч`} />
        <StatCard Icon={IconController} label="Игр в библиотеке" value={games.length} />
        <StatCard Icon={IconStar}       label="Больше всего"      value={mostPlayed?.title?.split(' ').slice(0,2).join(' ') || '—'} />
        <StatCard Icon={IconTrophy}     label="Достижений"        value={`${unlocked.size}/${ACHIEVEMENTS.length}`} />
      </div>

      <div className="ach-grid">
        {ACHIEVEMENTS.map(a => {
          const done = unlocked.has(a.id)
          const AchIcon = a.Icon
          return (
            <div key={a.id} className={`ach-card card ${done ? 'unlocked' : 'locked'}`}>
              <div className="ach-icon-wrap">
                {done ? <AchIcon /> : <IconLock />}
              </div>
              <div className="ach-info">
                <div className="ach-title">{a.title}</div>
                <div className="ach-desc">{a.desc}</div>
              </div>
              {done && <div className="ach-check"><IconCheck /></div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ Icon, label, value }) {
  return (
    <div className="stat-card card">
      <div className="stat-icon"><Icon /></div>
      <div>
        <div className="stat-val">{value}</div>
        <div className="stat-lbl">{label}</div>
      </div>
    </div>
  )
}
