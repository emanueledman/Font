import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Call from './components/Call';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);

    useEffect(() => {
        // Verificar se há token salvo
        const token = localStorage.getItem('token');
        if (token) {
            setUser({
                token,
                user_id: localStorage.getItem('user_id'),
                user_tipo: localStorage.getItem('user_tipo')
            });
        }

        // Inicializar WebSocket
        const socket = io('https://fila-facilita2-0.onrender.com', {
            path: '/tickets',
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        socket.on('connect', () => {
            console.log('WebSocket conectado');
            setSocketConnected(true);
            toast.info('Conectado ao servidor de notificações');
        });

        socket.on('connect_error', (error) => {
            console.error('Erro na conexão WebSocket:', error.message);
            setSocketConnected(false);
            toast.warn('Falha na conexão com notificações. O login ainda funciona.');
        });

        socket.on('ticket_update', (data) => {
            console.log('Atualização de ticket:', data);
            toast.info(`Ticket ${data.ticket_id} atualizado: ${data.status}`);
        });

        socket.on('queue_update', (data) => {
            console.log('Atualização de fila:', data);
            toast.info(data.message);
        });

        return () => {
            socket.disconnect();
            console.log('WebSocket desconectado');
        };
    }, []);

    const handleLogin = (userData) => {
        setUser({
            token: userData.token,
            user_id: userData.user_id,
            user_tipo: userData.user_tipo
        });
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_tipo');
        setUser(null);
        toast.info('Sessão encerrada');
        return <Navigate to="/login" />;
    };

    return (
        <Router>
            <div className="app">
                {user && <Sidebar onLogout={handleLogout} />}
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
                    <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;