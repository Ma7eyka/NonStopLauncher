import { IconLibrary, IconSearch, IconDownload, IconSettings, IconTrophy, IconStar } from './Icons'
import './Sidebar.css'

const navItems = [
  { id: 'library',      Icon: IconLibrary,  label: 'Библиотека' },
  { id: 'search',       Icon: IconSearch,   label: 'Найти игру'  },
  { id: 'downloads',    Icon: IconDownload, label: 'Загрузки'    },
  { id: 'achievements', Icon: IconTrophy,   label: 'Достижения'  },
  { id: 'stats',        Icon: IconStar,     label: 'Статистика'  },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map(({ id, Icon, label }) => (
          <button key={id}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <span className="nav-icon"><Icon /></span>
            <span className="nav-label">{label}</span>
            {activePage === id && <div className="nav-indicator" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className={`nav-item ${activePage === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}>
          <span className="nav-icon"><IconSettings /></span>
          <span className="nav-label">Настройки</span>
          {activePage === 'settings' && <div className="nav-indicator" />}
        </button>
      </div>
    </aside>
  )
}
