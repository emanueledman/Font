import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Queues from './components/Queues';
import Call from './components/Call';
import Reports from './components/Reports';
import Users from './components/Users';
import Settings from './components/Settings';
import Profile from './components/Profile';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const socket = io('https://fila-facilita2-0.onrender.com', { path: '/tickets' });

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
        socket.on('ticket_update', (data) => {
            toast.info(`Senha ${data.ticket_id}: ${data.status}`);
        });
        return () => socket.off('ticket_update');
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        toast.success('Sessão encerrada');
    };

    return (
        <Router>
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="app">
                {user ? (
                    <div className="d-flex">
                        <Sidebar onLogout={handleLogout} />
                        <div className="content p-4">
                            <Routes>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/queues" element={<Queues />} />
                                <Route path="/call" element={<Call />} />
                                <Route path="/reports" element={<Reports />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/profile" element={<Profile setUser={setUser} />} />
                                <Route path="*" element={<Navigate to="/dashboard" />} />
                            </Routes>
                        </div>
                    </div>
                ) : (
                    <Login onLogin={handleLogin} />
                )}
            </div>
        </Router>
    );
}

export default App;