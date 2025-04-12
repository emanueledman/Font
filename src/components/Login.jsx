import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { login } from '../api';

import logo from '../assets/logo.png';

function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            console.log('Tentando login:', { email });
            const userData = await login(email, password);
            console.log('Login bem-sucedido:', userData);

            localStorage.setItem('token', userData.token);
            localStorage.setItem('user_id', userData.user_id);
            localStorage.setItem('user_tipo', userData.user_tipo);

            onLogin(userData);
            toast.success('Login realizado com sucesso!');
            navigate('/dashboard');
        } catch (error) {
            console.error('Erro no login:', error.message);
            let errorMsg = error.message;
            if (errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
                errorMsg = 'Falha na conexão com o servidor. Verifique sua internet ou tente novamente.';
            } else if (errorMsg.includes('401')) {
                errorMsg = 'Credenciais inválidas. Verifique email e senha.';
            }
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <img src={logo} alt="Facilita Logo" className="login-logo" />
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Digite seu email"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Senha</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Digite sua senha"
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Carregando...' : 'Entrar'}
                </button>
            </form>
        </div>
    );
}

export default Login;