import { handleAdminLogin } from './auth.js';
import { showToast } from './toast.js';

console.log('index.js carregado');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado');

    // Redirecionar se já autenticado
    if (localStorage.getItem('token')) {
        console.log('Token encontrado, redirecionando para dashboard');
        window.location.href = '/dashboard.html';
        return;
    }

    const form = document.getElementById('login-form');
    const btn = document.getElementById('login-btn');
    const error = document.getElementById('error-message');
    const spinner = btn.querySelector('.spinner');

    // Verificar elementos
    if (!form || !btn || !error || !spinner) {
        console.error('Elementos do formulário não encontrados:', {
            form: !!form,
            btn: !!btn,
            error: !!error,
            spinner: !!spinner,
        });
        showToast('Erro: Interface não carregada corretamente', 'error');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Formulário submetido');

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        btn.disabled = true;
        spinner.classList.remove('hidden');
        error.classList.add('hidden');

        try {
            await handleAdminLogin(email, password);
            showToast('Login bem-sucedido!', 'success');
            console.log('Redirecionando para dashboard');
            window.location.href = '/dashboard.html';
        } catch (err) {
            console.error('Erro no login:', err.message);
            showToast('Erro ao autenticar', 'error');
        } finally {
            btn.disabled = false;
            spinner.classList.add('hidden');
        }
    });
});