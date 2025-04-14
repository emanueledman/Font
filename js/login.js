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
        console.log('Enviando requisição de login para:', email); // Debug
        const result = await ApiService.login(email, password);
        console.log('Resposta do login:', result); // Debug
        const userInfo = {
            id: result.user_id,
            email: result.email,
            role: result.user_role,
            department_id: result.department_id,
        };
        localStorage.setItem('token', result.token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        console.log('Token salvo:', result.token); // Debug
        console.log('UserInfo salvo:', userInfo); // Debug

        const role = userInfo.role.toLowerCase();
        if (['dept_admin', 'inst_admin', 'sys_admin'].includes(role)) {
            console.log('Redirecionando para admin.html'); // Debug
            window.location.href = '/admin.html';
        } else if (['user'].includes(role)) {
            console.log('Redirecionando para manager.html'); // Debug
            window.location.href = '/manager.html';
        } else {
            throw new Error(`Função de usuário inválida: ${userInfo.role}`);
        }
    } catch (error) {
        console.error('Erro no login:', error); // Debug
        errorDiv.textContent = `Erro: ${error.message}`;
        errorDiv.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (form) {
        console.log('Formulário de login encontrado'); // Debug
        form.addEventListener('submit', handleLogin);
    } else {
        console.error('Formulário de login não encontrado'); // Debug
    }
});