const API_URL = 'https://fila-facilita2-0.onrender.com/api';

export async function login(email, password) {
    console.log('Iniciando login para:', email);
    const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    console.log('Resposta do backend:', data);
    if (!response.ok) {
        throw new Error(data.error || 'Credenciais inválidas');
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.email);
    localStorage.setItem('user_id', data.user_id);
    localStorage.setItem('department', data.department);
    localStorage.setItem('institution_id', data.institution_id);
    localStorage.setItem('user_tipo', data.user_tipo);
    return data;
}

export function logout() {
    localStorage.clear();
    window.location.href = '/';
}

export function isAuthenticated() {
    return !!localStorage.getItem('token');
}

export function getToken() {
    return localStorage.getItem('token');
}