import { useState, useEffect } from 'react'
import './UpdateScreen.css'

export default function UpdateScreen() {
  const [state, setState] = useState('idle') // idle | checking | available | downloading | ready | error
  const [progress, setProgress] = useState(0)
  const [version, setVersion]   = useState('')
  const [notes, setNotes]       = useState('')
  const [error, setError]       = useState('')

  useEffect(() => {
    // Слушаем события от main process
    window.electron?.onUpdateStatus?.(({ status, data }) => {
      setState(status)
      if (data?.version) setVersion(data.version)
      if (data?.releaseNotes) setNotes(data.releaseNotes)
      if (data?.percent !== undefined) setProgress(Math.round(data.percent))
      if (data?.error) setError(data.error)
    })

    // Проверяем обновление при запуске (через 3 сек)
    setTimeout(() => {
      window.electron?.checkForUpdate?.()
    }, 3000)
  }, [])

  if (state === 'idle' || state === 'error') return null

  // Полноэкранный экран только когда есть обновление или идёт загрузка
  const isFullscreen = state === 'available' || state === 'downloading' || state === 'ready'

  if (!isFullscreen && state === 'checking') return (
    <div className="update-toast">
      <div className="update-toast-spinner" />
      <span>Проверка обновлений...</span>
    </div>
  )

  if (!isFullscreen) return null

  return (
    <div className="update-overlay">
      <div className="update-box">
        {/* Анимированный фон */}
        <div className="update-bg">
          <div className="update-orb orb-1" />
          <div className="update-orb orb-2" />
          <div className="update-orb orb-3" />
        </div>

        <div className="update-content">
          {/* Лого */}
          <div className="update-logo">
            <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 8v8c0 6.6 5.1 12.8 12 14.3C22.9 28.8 28 22.6 28 16V8L16 2z"
                fill="var(--accent)" opacity="0.2"/>
              <path d="M16 2L4 8v8c0 6.6 5.1 12.8 12 14.3C22.9 28.8 28 22.6 28 16V8L16 2z"
                stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M11 16l3 3 7-7" stroke="var(--accent)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {state === 'available' && (
            <>
              <div className="update-badge">Новая версия</div>
              <h1 className="update-title">NonStop Launcher {version}</h1>
              <p className="update-subtitle">Доступно обновление</p>
              {notes && (
                <div className="update-notes">
                  <p>{notes}</p>
                </div>
              )}
              <div className="update-actions">
                <button className="update-btn-primary" onClick={() => window.electron?.downloadUpdate?.()}>
                  Скачать и установить
                </button>
                <button className="update-btn-skip" onClick={() => setState('idle')}>
                  Позже
                </button>
              </div>
            </>
          )}

          {state === 'downloading' && (
            <>
              <h1 className="update-title">Загрузка обновления</h1>
              <p className="update-subtitle">NonStop Launcher {version}</p>
              <div className="update-progress-wrap">
                <div className="update-progress-bar">
                  <div className="update-progress-fill" style={{ width: `${progress}%` }}>
                    <div className="update-progress-glow" />
                  </div>
                </div>
                <span className="update-progress-pct">{progress}%</span>
              </div>
              <p className="update-hint">Пожалуйста, не закрывай приложение</p>
            </>
          )}

          {state === 'ready' && (
            <>
              <div className="update-ready-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 className="update-title">Готово к установке!</h1>
              <p className="update-subtitle">NonStop Launcher {version} загружен</p>
              <div className="update-actions">
                <button className="update-btn-primary" onClick={() => window.electron?.installUpdate?.()}>
                  Перезапустить и установить
                </button>
                <button className="update-btn-skip" onClick={() => setState('idle')}>
                  После перезапуска
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
