import { useState } from 'react'
import { IconClose } from './Icons'
import './Changelog.css'

const VERSIONS = [
  {
    version: '1.0.2', date: '18 марта 2026', tag: 'Актуальная',
    changes: [
      { type: 'fix', text: 'Исправлен запуск setup.exe — теперь с правами администратора' },
      { type: 'fix', text: 'Устранены дубли загрузок и фантомные записи в БД' },
      { type: 'fix', text: 'Правильное сохранение прогресса при закрытии лаунчера' },
      { type: 'new', text: 'Автовозобновление загрузок после перезапуска' },
      { type: 'new', text: 'Умный поиск обложек: GTA IV, Half-Life 2, RDR2 и аббревиатуры' },
      { type: 'new', text: 'Удаление папки с файлами при отмене загрузки' },
      { type: 'new', text: 'Достижения и уведомления со звуком' },
      { type: 'new', text: 'Модалка игры с вкладками: информация, настройки, файлы' },
      { type: 'new', text: 'Параметры запуска игры' },
      { type: 'new', text: 'Кастомная иконка приложения' },
    ]
  },
  {
    version: '1.0.1', date: '18 марта 2026', tag: null,
    changes: [
      { type: 'fix', text: 'Исправлена ошибка existing.destroy is not a function' },
      { type: 'fix', text: 'Фикс HTML-entities в magnet-ссылках (&#038;)' },
      { type: 'fix', text: 'Исправлен lastId() в базе данных (возвращал 0)' },
      { type: 'new', text: 'График скорости загрузки в реальном времени' },
      { type: 'new', text: 'Обложки из Steam Store API' },
      { type: 'new', text: 'Страница настроек: цвет акцента, фон, стиль кнопок' },
    ]
  },
  {
    version: '1.0.0', date: '18 марта 2026', tag: 'Первый релиз',
    changes: [
      { type: 'new', text: 'Поиск репаков через FitGirl Repacks' },
      { type: 'new', text: 'Загрузка торрентов через WebTorrent' },
      { type: 'new', text: 'Библиотека игр с обложками' },
      { type: 'new', text: 'Кастомный Electron интерфейс без системной рамки' },
      { type: 'new', text: 'SQLite база данных для хранения библиотеки' },
      { type: 'new', text: 'Страница загрузок с прогрессом и статистикой' },
    ]
  },
]

export default function Changelog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="changelog-btn" onClick={() => setOpen(true)}>
        <span className="changelog-dot" />
        Обновление v1.0.2 — нажми чтобы узнать что нового
      </button>

      {open && (
        <div className="changelog-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="changelog-box">
            <div className="changelog-head">
              <h2>История обновлений</h2>
              <button className="modal-close-btn" onClick={() => setOpen(false)}>
                <IconClose />
              </button>
            </div>
            <div className="changelog-body">
              {VERSIONS.map(v => (
                <div key={v.version} className="version-block">
                  <div className="version-header">
                    <span className="version-num">v{v.version}</span>
                    {v.tag && <span className={`version-tag ${v.tag === 'Актуальная' ? 'current' : ''}`}>{v.tag}</span>}
                    <span className="version-date">{v.date}</span>
                  </div>
                  <div className="version-changes">
                    {v.changes.map((c, i) => (
                      <div key={i} className={`change-item change-${c.type}`}>
                        <span className="change-badge">{{ new: 'NEW', fix: 'FIX', upd: 'UPD' }[c.type]}</span>
                        <span>{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
