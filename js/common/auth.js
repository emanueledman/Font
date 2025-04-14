import { ApiService } from './api-service.js';
import { showNotification } from './utils.js';

export async function initApp() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        await ApiService.getAdminQueues();
    } catch (error) {
        logout();
    }
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
}