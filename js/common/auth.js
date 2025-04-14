import { ApiService } from './api-service.js';
import { initWebSocket, startPolling, stopPolling } from './websocket.js';
import { showNotification } from './utils.js';

let token = localStorage.getItem('token');
let userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};

export async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');
    const loginBtn = document.querySelector('#login-section button');

    errorDiv.style.display = 'none';
    loginBtn.disabled = true;

    try {
        const result = await ApiService.login(email, password);
        token = result.token;
        userInfo = {
            id: result.user_id,
            email: result.email,
            role: result.user_role,
            department_id: result.department_id,
        };
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        initApp();
    } catch (error) {
        errorDiv.textContent = `Erro: ${error.message}`;
        errorDiv.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
    }
}

export function logout(message) {
    token = null;
    userInfo = {};
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    initApp(message);
}

export async function initApp(message) {
    const loginSection = document.getElementById('login-section');
    const mainContent = document.getElementById('main-content');
    const userInfoSpan = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');

    if (message) {
        showNotification(message, 'error');
    }

    if (!token || !userInfo.email) {
        loginSection.style.display = 'block';
        mainContent.className = 'main-content full';
        return;
    }

    try {
        await ApiService.getAdminQueues();
        loginSection.style.display = 'none';
        mainContent.className = 'main-content';
        userInfoSpan.textContent = userInfo.email;
        logoutBtn.style.display = 'block';
        document.getElementById('dashboard-section').classList.add('active');
    } catch (error) {
        logout('Sessão inválida');
    }
}