// src/api/index.js
import { toast } from 'react-toastify';

const BASE_URL = 'https://fila-facilita2-0.onrender.com/api';

export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_tipo');
        window.location.href = '/login';
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      const error = await response.json();
      throw new Error(error.error || `Erro HTTP: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Erro na requisição para ${endpoint}:`, error);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Credenciais inválidas');
    }

    return response.json();
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
};