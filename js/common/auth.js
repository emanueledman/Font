import { ApiService } from './api-service.js';
import { showNotification } from './utils.js';

export async function initApp() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('initApp: Nenhum token encontrado');
        return { isAuthenticated: false };
    }

    try {
        await ApiService.getAdminQueues();
        console.log('initApp: Token validado');
        return { isAuthenticated: true };
    } catch (error) {
        console.error('initApp: Falha na validação do token:', error);
        showNotification('Sessão inválida, faça login novamente', 'error');
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        return { isAuthenticated: false };
    }
}

export function logout() {
    console.log('logout: Limpando localStorage');
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    window.location.href = '/index.html';
}

export async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');
    const loginBtn = document.querySelector('#login-form button');

    errorDiv.style.display = 'none';
    loginBtn.disabled = true;

    try {
        const result = await ApiService.login(email, password);
        const userInfo = {
            id: result.user_id,
            email: result.email,
            role: result.user_role,
            department_id: result.department_id,
            institution_id: result.institution_id
        };
        localStorage.setItem('token', result.token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));

        const role = userInfo.role.toLowerCase();
        if (['dept_admin', 'inst_admin', 'sys_admin'].includes(role)) {
            window.location.href = '/admin.html';
        } else {
            throw new Error(`Função de usuário inválida: ${userInfo.role}`);
        }
    } catch (error) {
        errorDiv.textContent = `Erro: ${error.message}`;
        errorDiv.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
});