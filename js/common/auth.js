import { ApiService } from './api-service.js';
import { showNotification } from './utils.js';

export async function initApp() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('initApp: Nenhum token encontrado'); // Debug
        return { isAuthenticated: false, error: 'Nenhum token' };
    }

    try {
        console.log('initApp: Validando token com API...'); // Debug
        await ApiService.getAdminQueues(); // Valida o token
        console.log('initApp: Token validado com sucesso'); // Debug
        return { isAuthenticated: true };
    } catch (error) {
        console.error('initApp: Erro ao validar token:', error); // Debug
        showNotification('Sessão inválida, faça login novamente', 'error');
        return { isAuthenticated: false, error: error.message };
    }
}

export function logout() {
    console.log('logout: Limpando localStorage'); // Debug
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
}