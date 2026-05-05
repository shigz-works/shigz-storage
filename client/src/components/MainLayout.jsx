import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LogOut, LayoutDashboard, Settings, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const API_URL = `http://${window.location.hostname}:5000/api`;

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [states, setStates] = useState([]);
  const location = useLocation();

  useEffect(() => {
    axios.get(`${API_URL}/states`).then(res => setStates(res.data));
  }, []);

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className="h-16 border-b flex items-center justify-between px-4 sticky top-0 bg-inherit z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
            <Menu size={20} />
          </button>
          <h1 className="font-bold text-xl">Cert IV Real Estate CMS</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleDarkMode} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm hidden md:block">{user.username} ({user.role})</span>
            <button onClick={logout} className="p-2 hover:bg-red-100 text-red-500 rounded">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <aside className="w-64 border-r overflow-y-auto flex-shrink-0 bg-white dark:bg-gray-800">
            <nav className="p-4 space-y-2">
              <Link to="/" className={`flex items-center gap-2 p-2 rounded ${location.pathname === '/' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className={`flex items-center gap-2 p-2 rounded ${location.pathname.startsWith('/admin') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  <Settings size={18} />
                  <span>CMS Admin</span>
                </Link>
              )}
              <div className="pt-4 pb-2 border-t mt-4"><span className="text-xs font-semibold uppercase text-gray-500 px-2">States</span></div>
              {states.map(state => (
                <div key={state.id} className="px-4 py-1 text-sm text-gray-600 dark:text-gray-400">{state.name} ({state.code})</div>
              ))}
            </nav>
          </aside>
        )}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
