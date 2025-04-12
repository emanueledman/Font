// js/index.js
import { login } from './auth.js';
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('token')) {
        window.location.href = 'dashboard.html';
        return;
    }

    const form = document.getElementById('login-form');
    const btn = document.getElementById('login-btn');
    const error = document.getElementById('error-message');
    const spinner = btn.querySelector('.spinner');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.disabled = true;
        spinner.classList.remove('hidden');
        error.classList.add('hidden');

        try {
            await login(form.email.value, form.password.value);
            showToast('Login bem-sucedido!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (err) {
            error.textContent = err.message;
            error.classList.remove('hidden');
            showToast('Erro ao autenticar', 'error');
        } finally {
            btn.disabled = false;
            spinner.classList.add('hidden');
        }
    });
});