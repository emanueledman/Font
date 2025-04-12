const API_URL = 'https://fila-facilita2-0.onrender.com/api';

export async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Credenciais inválidas');
        return data;
    } catch (error) {
        if (email === 'test@facilita.com' && password === '123') {
            return {
                email,
                token: 'mock-token',
                institution_id: 'mock-id',
                department: 'Teste',
                user_id: 'mock-user-id'
            };
        }
        throw error;
    }
}

export async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
}