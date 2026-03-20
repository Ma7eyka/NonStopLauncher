import { useState, useEffect } from 'react'
import { IconPlay, IconTrash, IconSettings, IconClose, IconSearch, IconFolder } from './Icons'
import './GameModal.css'

export default function GameModal({ game, onClose, onUpdate }) {
  const [tab, setTab] = useState('info')
  const [launchArgs, setLaunchArgs] = useState(game.launch_args || '')
  const [saving, setSaving] = useState(false)

  const playtime = game.playtime_minutes >= 60
    ? `${Math.floor(game.playtime_minutes / 60)} ч ${game.playtime_minutes % 60} мин`
    : game.playtime_minutes > 0 ? `${game.playtime_minutes} мин` : 'Не запускалась'

  async function handleLaunch() {
    await window.electron?.launchGame(game.id, game.exe_path)
    onClose()
  }

  async function handleSaveSettings() {
    setSaving(true)
    await window.electron?.updateGame(game.id, { launch_args: launchArgs })
    setSaving(false)
    onUpdate()
  }

  async function handlePickExe() {
    const chosen = await window.electron?.chooseFile([{ name: 'Executable', extensions: ['exe'] }])
    if (chosen) {
      await window.electron?.updateGame(game.id, { exe_path: chosen, exe_type: 'game' })
      onUpdate()
      onClose()
    }
  }

  async function handleRescan() {
    if (!game.install_path) return alert('Папка установки не указана')
    const det = await window.electron?.detectExe(game.install_path)
    if (det) {
      await window.electron?.updateGame(game.id, { exe_path: det.exePath, exe_type: det.type })
      onUpdate()
      onClose()
    } else {
      alert('Exe не найден. Выбери вручную.')
      handlePickExe()
    }
  }

  async function handleDelete() {
    if (!confirm(`Удалить «${game.title}» из библиотеки?`)) return
    await window.electron?.deleteGame(game.id)
    onUpdate()
    onClose()
  }

  const isSetup = game.exe_type === 'setup'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Шапка с обложкой */}
        <div className="modal-header" style={{
          backgroundImage: game.cover_url ? `url(${game.cover_url})` : undefined
        }}>
          <div className="modal-header-overlay" />
          <button className="modal-close-btn" onClick={onClose}><IconClose /></button>
          <div className="modal-title-block">
            <h2 className="modal-game-title">{game.title}</h2>
            <div className="modal-meta">
              <span>{playtime}</span>
              {game.exe_type && <span className={`badge ${isSetup ? 'badge-yellow' : 'badge-green'}`}>
                {isSetup ? 'Setup' : 'Game'}
              </span>}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary modal-play-btn" onClick={handleLaunch} disabled={!game.exe_path}>
              <IconPlay /> {isSetup ? 'Установить' : 'Играть'}
            </button>
          </div>
        </div>

        {/* Вкладки */}
        <div className="modal-tabs">
          {['info', 'settings', 'files'].map(t => (
            <button key={t} className={`modal-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {{ info: 'Информация', settings: 'Настройки', files: 'Файлы' }[t]}
            </button>
          ))}
        </div>

        {/* Контент вкладок */}
        <div className="modal-content">
          {tab === 'info' && (
            <div className="tab-info">
              <div className="info-grid">
                <InfoRow label="Время в игре"  value={playtime} />
                <InfoRow label="Статус"        value={game.status === 'installed' ? 'Установлена' : 'Скачивается'} />
                <InfoRow label="Папка"         value={game.install_path || 'Не указана'} mono />
                <InfoRow label="Exe"           value={game.exe_path ? game.exe_path.split(/[\\/]/).pop() : 'Не найден'} mono />
                <InfoRow label="Добавлена"     value={game.added_at ? new Date(game.added_at).toLocaleDateString('ru') : '—'} />
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="tab-settings">
              <div className="setting-group">
                <label className="setting-label">Параметры запуска</label>
                <input
                  className="search-input"
                  placeholder="-fullscreen -novid -console"
                  value={launchArgs}
                  onChange={e => setLaunchArgs(e.target.value)}
                />
                <p className="setting-hint">Аргументы которые передаются при запуске игры</p>
              </div>
              <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          )}

          {tab === 'files' && (
            <div className="tab-files">
              <div className="file-row">
                <span className="file-label">Exe файл:</span>
                <span className="file-path">{game.exe_path || 'Не найден'}</span>
                <button className="btn btn-ghost" onClick={handlePickExe}>Выбрать</button>
              </div>
              <div className="file-row">
                <span className="file-label">Папка игры:</span>
                <span className="file-path">{game.install_path || 'Не указана'}</span>
              </div>
              <div className="files-actions">
                <button className="btn btn-ghost" onClick={handleRescan}>
                  Найти exe автоматически
                </button>
                <button className="btn btn-ghost" onClick={() =>
                  game.install_path && window.electron?.openExternal('file:///' + game.install_path.replace(/\\/g, '/'))
                }>
                  Открыть папку
                </button>
                <button className="btn btn-ghost danger" onClick={handleDelete}>
                  <IconTrash /> Удалить из библиотеки
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className={`info-value ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  )
}
