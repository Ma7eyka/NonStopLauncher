import { useState, useEffect } from 'react'
import { IconTrophy, IconBell, IconInfo, IconClose, IconCheck } from './Icons'
import './Notification.css'

let _listeners = []
export function showNotification(msg) {
  _listeners.forEach(fn => fn(msg))
}

const TYPE_ICONS = {
  achievement: IconTrophy,
  record:      IconStar,
  info:        IconInfo,
  success:     IconCheck,
}

function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  )
}

export default function NotificationSystem() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const fn = (msg) => {
      const id = Date.now()
      setItems(prev => [...prev, { id, ...msg }])

      // Звук через Web Audio API
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(660, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
      } catch (e) {}

      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 4500)
    }
    _listeners.push(fn)
    return () => { _listeners = _listeners.filter(l => l !== fn) }
  }, [])

  return (
    <div className="notif-container">
      {items.map(item => {
        const Icon = TYPE_ICONS[item.type] || IconBell
        return (
          <div key={item.id} className={`notif notif-${item.type || 'info'}`}>
            <div className="notif-icon"><Icon /></div>
            <div className="notif-body">
              <div className="notif-title">{item.title}</div>
              {item.desc && <div className="notif-desc">{item.desc}</div>}
            </div>
            <button className="notif-close" onClick={() =>
              setItems(prev => prev.filter(i => i.id !== item.id))
            }><IconClose /></button>
          </div>
        )
      })}
    </div>
  )
}
