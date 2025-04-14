import { ApiService } from './api-service.js';
import { showNotification } from './utils.js';

export async function initApp() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('Nenhum token encontrado em localStorage'); // Debug
        return;
    }

    try {
        console.log('Validando token com chamada à API...'); // Debug
        await ApiService.getAdminQueues();
        console.log('Token validado com sucesso'); // Debug
    } catch (error) {
        console.error('Erro ao validar token:', error); // Debug
        showNotification('Sessão inválida, faça login novamente', 'error');
        // Não chama logout() imediatamente para evitar loops
        // logout();
    }
}

export function logout() {
    console.log('Executando logout...'); // Debug
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
}