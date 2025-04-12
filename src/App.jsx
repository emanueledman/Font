// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Call from './components/Call';
import Sidebar from './components/Sidebar';
import Queues from './components/Queues';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Users from './components/Users';

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({
        token,
        user_id: localStorage.getItem('user_id'),
        user_tipo: localStorage.getItem('user_tipo'),
      });
    }

    const socket = io('https://fila-facilita2-0.onrender.com', {
      path: '/tickets',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket conectado');
    });

    socket.on('connect_error', () => {
      toast.warn('Falha na conexão com notificações');
    });

    socket.on('ticket_update', (data) => {
      toast.info(`Ticket ${data.ticket_id} atualizado: ${data.status}`);
    });

    socket.on('queue_update', (data) => {
      toast.info(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleLogin = (userData) => {
    setUser({
      token: userData.token,
      user_id: userData.user_id,
      user_tipo: userData.user_tipo,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_tipo');
    setUser(null);
    toast.info('Sessão encerrada');
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Router>
      <div className="min-h-screen flex">
        {user && <Sidebar onLogout={handleLogout} toggleTheme={toggleTheme} theme={theme} />}
        <main className="flex-1">
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />}
            />
            <Route
              path="/dashboard"
              element={user ? <Dashboard /> : <Navigate to="/login" />}
            />
            <Route
              path="/call"
              element={user ? <Call /> : <Navigate to="/login" />}
            />
            <Route
              path="/queues"
              element={user ? <Queues /> : <Navigate to="/login" />}
            />
            <Route
              path="/reports"
              element={user ? <Reports /> : <Navigate to="/login" />}
            />
            <Route
              path="/settings"
              element={user ? <Settings /> : <Navigate to="/login" />}
            />
            <Route
              path="/profile"
              element={user ? <Profile setUser={setUser} /> : <Navigate to="/login" />}
            />
            <Route
              path="/users"
              element={user ? <Users /> : <Navigate to="/login" />}
            />
            <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;