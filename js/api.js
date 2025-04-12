// js/api.js
import { getToken } from './auth.js';
const API_URL = 'https://fila-facilita2-0.onrender.com/api';

export async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!token) {
        throw new Error('Não autenticado');
    }
    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
    }
    return data;
}