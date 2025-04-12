// src/components/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { toast } from 'react-toastify';
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
      const userData = await login(email, password);
      localStorage.setItem('token', userData.token);
      localStorage.setItem('user_id', userData.user_id);
      localStorage.setItem('user_tipo', userData.user_tipo);
      onLogin(userData);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <img src={logo} alt="Facilita Logo" className="login-logo" />
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group mb-3">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Digite seu email"
          />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="password">Senha</label>
          <input
            type="password"
            id="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Digite sua senha"
          />
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
          {isLoading ? 'Carregando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default Login;