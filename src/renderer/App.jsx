import { useState, useEffect } from 'react'
import Titlebar           from './components/Titlebar'
import Sidebar            from './components/Sidebar'
import NotificationSystem from './components/Notification'
import UpdateScreen       from './components/UpdateScreen'
import LibraryPage        from './pages/LibraryPage'
import SearchPage         from './pages/SearchPage'
import DownloadsPage      from './pages/DownloadsPage'
import SettingsPage       from './pages/SettingsPage'
import AchievementsPage   from './pages/AchievementsPage'
import StatsPage          from './pages/StatsPage'
import './styles/global.css'

function lightenHex(hex, amt) {
  try {
    const n = parseInt(hex.replace('#',''), 16)
    const r = Math.min(255, (n >> 16) + amt)
    const g = Math.min(255, ((n >> 8) & 0xff) + amt)
    const b = Math.min(255, (n & 0xff) + amt)
    return '#' + ((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')
  } catch { return hex }
}

function applySettings(s) {
  if (!s) return
  const root = document.documentElement
  if (s.accentColor) {
    root.style.setProperty('--accent', s.accentColor)
    root.style.setProperty('--accent-bright', lightenHex(s.accentColor, 25))
    root.style.setProperty('--accent-glow', s.accentColor + '55')
  }
  const sizes = { small: '13px', normal: '14px', large: '15px' }
  const radii = { rounded: '6px', sharp: '2px', pill: '20px' }
  if (s.fontSize) root.style.setProperty('--base-font', sizes[s.fontSize] || '14px')
  if (s.btnStyle) root.style.setProperty('--btn-radius', radii[s.btnStyle] || '6px')
  if (s.theme)    root.setAttribute('data-theme', s.theme)
}

export default function App() {
  const [page, setPage]         = useState('library')
  const [settings, setSettings] = useState({})
  const [initQuery, setInitQuery] = useState('')

  useEffect(() => {
    window.electron?.getSettings().then(s => {
      if (s && Object.keys(s).length) { setSettings(s); applySettings(s) }
    }).catch(() => {})
  }, [])

  function navigate(target, query) {
    if (query) setInitQuery(query)
    setPage(target)
  }

  return (
    <div className="app">
      <AppBackground settings={settings} />
      <Titlebar />
      <div className="app-body">
        <Sidebar activePage={page} onNavigate={setPage} />
        <main className="app-content">
          {page === 'library'      && <LibraryPage      onNavigate={navigate} />}
          {page === 'search'       && <SearchPage       initialQuery={initQuery} />}
          {page === 'downloads'    && <DownloadsPage />}
          {page === 'achievements' && <AchievementsPage />}
          {page === 'stats'        && <StatsPage />}
          {page === 'settings'     && (
            <SettingsPage onSettingsChange={(s) => { setSettings(s); applySettings(s) }} />
          )}
        </main>
      </div>
      <NotificationSystem />
      <UpdateScreen />
    </div>
  )
}

function AppBackground({ settings }) {
  const { bgType, bgValuePath, bgGrad1, bgGrad2, bgOpacity = 0.85, bgBlur = 0 } = settings || {}
  if (!bgType || bgType === 'solid') return null
  const base = { position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }
  if (bgType === 'gradient')
    return <div style={{ ...base, background: `linear-gradient(135deg, ${bgGrad1||'#0d0d0f'}, ${bgGrad2||'#1a0a0a'})` }} />
  if ((bgType === 'image' || bgType === 'gif' || bgType === 'video') && bgValuePath) {
    return (
      <div style={base}>
        {bgType === 'video'
          ? <video autoPlay loop muted style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:`blur(${bgBlur}px)` }} src={bgValuePath} />
          : <img src={bgValuePath} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:`blur(${bgBlur}px)` }} alt="" />
        }
        <div style={{ position:'absolute',inset:0,background:`rgba(13,13,15,${bgOpacity})` }} />
      </div>
    )
  }
  return null
}
