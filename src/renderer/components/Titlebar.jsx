import { IconLogoMark } from './Icons'
import './Titlebar.css'

export default function Titlebar() {
  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <div className="titlebar-logo">
          <IconLogoMark />
          <span>NONSTOP</span>
        </div>
      </div>
      <div className="titlebar-controls">
        <button className="ctrl-btn" onClick={() => window.electron?.minimize()} title="Свернуть">
          <svg width="10" height="2" viewBox="0 0 10 2"><rect width="10" height="2" fill="currentColor"/></svg>
        </button>
        <button className="ctrl-btn" onClick={() => window.electron?.maximize()} title="Развернуть">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="8" height="8"/>
          </svg>
        </button>
        <button className="ctrl-btn ctrl-close" onClick={() => window.electron?.close()} title="Закрыть">
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
