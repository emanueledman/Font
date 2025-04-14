import { ApiService } from './common/api-service.js';
import { showNotification } from './common/utils.js';

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
        };
        localStorage.setItem('token', result.token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));

        // Mapeia user_role para a página correta
        if (['DEPARTMENT_ADMIN', 'admin', 'administrador'].includes(userInfo.role.toLowerCase())) {
            window.location.href = '/admin.html';
        } else if (['USER', 'gestor', 'manager'].includes(userInfo.role.toLowerCase())) {
            window.location.href = '/manager.html';
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
    document.getElementById('login-form').addEventListener('submit', handleLogin);
});