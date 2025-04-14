// Combined ApiService, utils, and login logic
const ApiService = {
    async request(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };

        const options = { method, headers };
        if (data) options.body = JSON.stringify(data);

        try {
            const response = await fetch(`/api${endpoint}`, options);
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userInfo');
                window.location.href = '/index.html';
                throw new Error('Sessão expirada');
            }
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falha na requisição');
            return result;
        } catch (error) {
            throw error;
        }
    },

    login(email, password) {
        return this.request('/admin/login', 'POST', { email, password });
    }
};

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

async function handleLogin(event) {
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
        console.log('Formulário de login inicializado');
    } else {
        console.error('Formulário de login não encontrado');
    }
});