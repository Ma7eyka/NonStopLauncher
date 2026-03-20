import { useState, useEffect } from 'react'
import './SettingsPage.css'

const ACCENT_COLORS = [
  { name: 'Красный',  value: '#c0392b' },
  { name: 'Синий',    value: '#2980b9' },
  { name: 'Зелёный',  value: '#27ae60' },
  { name: 'Фиолет',   value: '#8e44ad' },
  { name: 'Оранжев',  value: '#e67e22' },
  { name: 'Циан',     value: '#16a085' },
  { name: 'Розовый',  value: '#e91e63' },
  { name: 'Белый',    value: '#ecf0f1' },
]

const DEFAULT = {
  accentColor: '#c0392b',
  bgType: 'solid',
  bgValue: '', bgValuePath: '',
  bgGrad1: '#0d0d0f', bgGrad2: '#1a0a0a',
  bgOpacity: 0.85, bgBlur: 0,
  btnStyle: 'rounded',
  fontSize: 'normal',
  cardStyle: 'cover',
  defaultSavePath: '',
  animationsOn: true,
}

export default function SettingsPage({ onSettingsChange }) {
  const [s, setS]       = useState(DEFAULT)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.electron?.getSettings().then(loaded => {
      if (loaded && Object.keys(loaded).length) setS(prev => ({ ...prev, ...loaded }))
    }).catch(() => {})
  }, [])

  function update(key, val) {
    setS(prev => {
      const next = { ...prev, [key]: val }
      onSettingsChange?.(next)
      return next
    })
  }

  async function handleExport() {
    const games = await window.electron?.getGames()
    const data = JSON.stringify({ version: '1.0.2', games, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'nonstop-library-backup.json'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return
      const text = await file.text()
      try {
        const { games } = JSON.parse(text)
        if (!Array.isArray(games)) throw new Error('Invalid format')
        for (const g of games) {
          await window.electron?.addGame({
            title: g.title, cover_url: g.cover_url,
            install_path: g.install_path, exe_path: g.exe_path,
            exe_type: g.exe_type, status: g.status || 'installed',
          })
        }
        alert(`Импортировано ${games.length} игр!`)
      } catch(err) {
        alert('Ошибка импорта: ' + err.message)
      }
    }
    input.click()
  }

  async function handleSave() {
    await window.electron?.setSettings(s)
    onSettingsChange?.(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function chooseBgFile() {
    const file = await window.electron?.chooseFile([
      { name: 'Media', extensions: ['gif','mp4','webm','jpg','jpeg','png','webp'] }
    ])
    if (!file) return
    const ext  = file.split('.').pop().toLowerCase()
    const type = ['mp4','webm'].includes(ext) ? 'video' : ext === 'gif' ? 'gif' : 'image'
    const fp   = 'file:///' + file.replace(/\\/g, '/')
    setS(prev => ({ ...prev, bgType: type, bgValue: file, bgValuePath: fp }))
  }

  async function chooseDefaultPath() {
    const p = await window.electron?.chooseSavePath()
    if (p) update('defaultSavePath', p)
  }

  return (
    <div className="settings-page">
      <div className="settings-header"><h1>Настройки</h1></div>

      <div className="settings-sections">

        <Section title="Цвет акцента">
          <div className="color-grid">
            {ACCENT_COLORS.map(c => (
              <button key={c.value}
                className={`color-btn ${s.accentColor === c.value ? 'active' : ''}`}
                style={{ '--c': c.value }}
                onClick={() => update('accentColor', c.value)}
                title={c.name}
              />
            ))}
            <input type="color" className="color-custom"
              value={s.accentColor}
              onChange={e => update('accentColor', e.target.value)}
              title="Свой цвет"
            />
          </div>
        </Section>

        <Section title="Фон приложения">
          <div className="bg-types">
            {['solid','gradient','image','gif','video'].map(t => (
              <button key={t}
                className={`type-btn ${s.bgType === t ? 'active' : ''}`}
                onClick={() => update('bgType', t)}
              >
                {{ solid:'Однотонный', gradient:'Градиент', image:'Картинка', gif:'GIF', video:'Видео' }[t]}
              </button>
            ))}
          </div>

          {['image','gif','video'].includes(s.bgType) && (
            <div className="bg-file-row">
              <span className="bg-file-path">{s.bgValue || 'Файл не выбран'}</span>
              <button className="btn btn-ghost" onClick={chooseBgFile}>Выбрать файл</button>
            </div>
          )}

          {s.bgType === 'gradient' && (
            <div className="gradient-row">
              <input type="color" value={s.bgGrad1} onChange={e => update('bgGrad1', e.target.value)} />
              <span className="gradient-arrow">→</span>
              <input type="color" value={s.bgGrad2} onChange={e => update('bgGrad2', e.target.value)} />
            </div>
          )}

          {['image','gif','video'].includes(s.bgType) && s.bgValue && (
            <>
              <label className="slider-label">
                Затемнение: {Math.round(s.bgOpacity * 100)}%
                <input type="range" min="0" max="100"
                  value={Math.round(s.bgOpacity * 100)}
                  onChange={e => update('bgOpacity', e.target.value / 100)} />
              </label>
              <label className="slider-label">
                Размытие: {s.bgBlur}px
                <input type="range" min="0" max="20"
                  value={s.bgBlur}
                  onChange={e => update('bgBlur', parseInt(e.target.value))} />
              </label>
            </>
          )}
        </Section>

        <Section title="Интерфейс">
          <OptionRow label="Стиль кнопок">
            <ToggleGroup
              options={[['rounded','Округлые'],['sharp','Острые'],['pill','Пилюля']]}
              value={s.btnStyle} onChange={v => update('btnStyle', v)}
            />
          </OptionRow>
          <OptionRow label="Размер текста">
            <ToggleGroup
              options={[['small','Мелкий'],['normal','Средний'],['large','Крупный']]}
              value={s.fontSize} onChange={v => update('fontSize', v)}
            />
          </OptionRow>
          <OptionRow label="Вид карточек">
            <ToggleGroup
              options={[['cover','Обложки'],['compact','Компакт'],['list','Список']]}
              value={s.cardStyle} onChange={v => update('cardStyle', v)}
            />
          </OptionRow>
          <OptionRow label="Анимации">
            <Switch value={s.animationsOn} onChange={v => update('animationsOn', v)} />
          </OptionRow>
        </Section>

        <Section title="Тема">
          <OptionRow label="Светлая / тёмная тема">
            <ToggleGroup
              options={[['dark','Тёмная'],['light','Светлая']]}
              value={s.theme || 'dark'} onChange={v => {
                update('theme', v)
                document.documentElement.setAttribute('data-theme', v)
              }}
            />
          </OptionRow>
        </Section>

        <Section title="Библиотека (бэкап)">
          <div className="backup-row">
            <div>
              <div className="setting-label">Экспорт библиотеки</div>
              <p className="setting-hint">Сохранить список игр в JSON файл</p>
            </div>
            <button className="btn btn-ghost" onClick={handleExport}>Экспорт</button>
          </div>
          <div className="backup-row">
            <div>
              <div className="setting-label">Импорт библиотеки</div>
              <p className="setting-hint">Восстановить из JSON файла</p>
            </div>
            <button className="btn btn-ghost" onClick={handleImport}>Импорт</button>
          </div>
        </Section>

        <Section title="Загрузки">
          <OptionRow label="Папка по умолчанию">
            <div className="path-row">
              <span className="path-text">{s.defaultSavePath || 'Не задана'}</span>
              <button className="btn btn-ghost" onClick={chooseDefaultPath}>Выбрать</button>
            </div>
          </OptionRow>
        </Section>

      </div>

      <div className="settings-footer">
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="settings-section">
      <div className="section-title">{title}</div>
      <div className="section-body">{children}</div>
    </div>
  )
}

function OptionRow({ label, children }) {
  return (
    <div className="option-row">
      <span>{label}</span>
      {children}
    </div>
  )
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="toggle-group">
      {options.map(([v, label]) => (
        <button key={v}
          className={`toggle-btn ${value === v ? 'active' : ''}`}
          onClick={() => onChange(v)}
        >{label}</button>
      ))}
    </div>
  )
}

function Switch({ value, onChange }) {
  return (
    <div className="toggle-switch" onClick={() => onChange(!value)}>
      <div className={`toggle-track ${value ? 'on' : ''}`}>
        <div className="toggle-thumb" />
      </div>
    </div>
  )
}
