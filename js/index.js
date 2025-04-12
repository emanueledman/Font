import { login } from './auth.js';
import { showToast } from './toast.js';

console.log('index.js carregado');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado');

    const form = document.getElementById('login-form');
    const btn = document.getElementById('login-btn');
    const error = document.getElementById('error-message');
    const spinner = btn.querySelector('.spinner');

    if (!form || !btn || !error || !spinner) {
        console.error('Elementos do formulário não encontrados');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Formulário submetido');

        btn.disabled = true;
        spinner.classList.remove('hidden');
        error.classList.add('hidden');

        const email = form.email.value;
        const password = form.password.value;

        try {
            console.log('Tentando login com:', email);
            await login(email, password);
            console.log('Login bem-sucedido, redirecionando');
            showToast('Login bem-sucedido!', 'success');
            window.location.href = '/dashboard.html';
        } catch (err) {
            console.error('Erro no login:', err.message);
            error.textContent = err.message;
            error.classList.remove('hidden');
            showToast('Erro ao autenticar', 'error');
        } finally {
            btn.disabled = false;
            spinner.classList.add('hidden');
        }
    });
});