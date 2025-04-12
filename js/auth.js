const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';
let token = localStorage.getItem('token');
let userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};

export async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
        mode: 'cors',
        credentials: 'omit',
    };
    if (body) {
        config.body = JSON.stringify(body);
    }

    console.log(`[API] Requisição para: ${API_BASE_URL}${endpoint}`, { method, headers, body });

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        console.log(`[API] Resposta: Status ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || response.statusText || 'Erro desconhecido';
            console.error(`[API] Erro ${response.status}: ${errorMessage}`);
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('[API] Dados:', data);
        return data;
    } catch (error) {
        console.error(`[API] Erro em ${endpoint}:`, error);
        throw error;
    }
}

export async function handleAdminLogin(email, password) {
    console.log('[Login] Iniciando para:', email);
    const errorMessage = document.getElementById('error-message');

    if (!email || !password) {
        errorMessage.textContent = 'Email e senha são obrigatórios';
        console.warn('[Login] Email ou senha vazios');
        throw new Error('Email e senha são obrigatórios');
    }

    try {
        const data = await apiRequest('/api/admin/login', 'POST', { email, password });
        console.log('[Login] Resposta:', data);

        if (data.error) {
            errorMessage.textContent = data.error;
            console.warn('[Login] Erro do backend:', data.error);
            throw new Error(data.error);
        }

        token = data.token;
        userInfo = {
            user_id: data.user_id,
            user_tipo: data.user_tipo,
            institution_id: data.institution_id,
            department: data.department,
            email: data.email,
        };

        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        console.log('[Login] Sucesso, token e userInfo salvos');

        return data;
    } catch (error) {
        const message = error.message.includes('Credenciais')
            ? 'Credenciais inválidas'
            : `Erro ao fazer login: ${error.message}`;
        errorMessage.textContent = message;
        console.error('[Login] Erro:', error);
        throw error;
    }
}

export function logout() {
    token = null;
    userInfo = {};
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    window.location.href = '/';
}

export function isAuthenticated() {
    return !!token;
}

export function getToken() {
    return token;
}

export function getUserInfo() {
    return userInfo;
}