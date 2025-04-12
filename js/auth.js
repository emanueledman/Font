// js/auth.js
const API_URL = 'http://localhost:5000/api';

export async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Falha no login');
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', email);
        return data;
    } catch (error) {
        throw error;
    }
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    window.location.href = 'index.html';
}

export function isAuthenticated() {
    return !!localStorage.getItem('token');
}
