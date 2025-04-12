// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { FaHome, FaPhone, FaList, FaChartBar, FaCog, FaUser, FaUsers, FaSignOutAlt, FaSun, FaMoon } from 'react-icons/fa';

function Sidebar({ onLogout, toggleTheme, theme }) {
  return (
    <aside className="w-64 bg-neutral-800 dark:bg-neutral-900 text-white flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Facilita 2.0</h1>
      </div>
      <nav className="flex-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-600 text-white' : 'hover:bg-neutral-700'
            }`
          }
        >
          <FaHome className="mr-3" /> Dashboard
        </NavLink>
        <NavLink
          to="/call"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-600 text-white' : 'hover:bg-neutral-700'
            }`
          }
        >
          <FaPhone className="mr-3" /> Chamada
        </NavLink>
        <NavLink
          to="/queues"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-600 text-white' : 'hover:bg-neutral-700'
            }`
          }
        >
          <FaList className="mr-3" /> Filas
        </NavLink>
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-600 text-white' : 'hover:bg-neutral-700'
            }`
          }
        >
          <FaChartBar className="mr-3" /> Relatórios
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-600 text-white' : 'hover:bg-neutral-700'
            }`
          }
        >
          <FaCog className="mr-3" /> Configurações
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-600 text-white' : 'hover:bg-neutral-700'
            }`
          }
        >
          <FaUser className="mr-3" /> Perfil
        </NavLink>
        <NavLink
          to="/users"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-600 text-white' : 'hover:bg-neutral-700'
            }`
          }
        >
          <FaUsers className="mr-3" /> Usuários
        </NavLink>
      </nav>
      <div className="p-6 border-t border-neutral-700">
        <button
          onClick={toggleTheme}
          className="flex items-center w-full px-6 py-3 text-sm font-medium hover:bg-neutral-700 rounded-md transition-colors"
        >
          {theme === 'light' ? <FaMoon className="mr-3" /> : <FaSun className="mr-3" />}
          {theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}
        </button>
        <button
          onClick={onLogout}
          className="flex items-center w-full px-6 py-3 text-sm font-medium text-red-400 hover:bg-neutral-700 rounded-md transition-colors"
        >
          <FaSignOutAlt className="mr-3" /> Sair
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;