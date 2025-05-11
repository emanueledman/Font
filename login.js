const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

// Sanitiza entradas para evitar XSS
const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

// Exibe mensagens de erro
const showError = (message) => {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = sanitizeInput(message);
        errorElement.classList.remove('hidden');
        setTimeout(() => errorElement.classList.add('hidden'), 5000);
    } else {
        console.error('Elemento de erro não encontrado:', message);
    }
};

// Limpa dados sensíveis
const clearSensitiveData = () => {
    console.log('Limpando dados sensíveis');
    ['localStorage', 'sessionStorage'].forEach(storageType => {
        const storage = window[storageType];
        ['adminToken', 'userRole', 'redirectCount'].forEach(key => storage.removeItem(key));
    });
};

// Obtém token
const getToken = () => {
    return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
};

// Armazena dados de autenticação
const storeAuthData = (data, rememberMe) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('adminToken', data.token);
    storage.setItem('userRole', data.user_role);
    if (data.queues) storage.setItem('queues', JSON.stringify(data.queues));
    console.log('Dados armazenados:', { token: data.token.substring(0, 10) + '...', userRole: data.user_role });
};

// Redireciona com base no papel
const redirectUser = (userRole) => {
    console.log('Redirecionando para:', userRole);
    const redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0');
    const now = Date.now();
    sessionStorage.setItem('redirectCount', (redirectCount + 1).toString());
    sessionStorage.setItem('lastRedirect', now.toString());

    // Prevenir loops
    if (redirectCount > 2) {
        console.error('Múltiplos redirecionamentos detectados');
        clearSensitiveData();
        showError('Problema de autenticação. Por favor, faça login novamente.');
        return;
    }

    switch (userRole) {
        case 'attendant':
            window.location.href = '/attendant.html';
            break;
        case 'branch_admin':
            window.location.href = '/branch-admin.html';
            break;
        case 'inst_admin':
            window.location.href = '/institution-admin.html';
            break;
        case 'sys_admin':
            window.location.href = '/system-admin.html';
            break;
        default:
            showError('Papel de usuário inválido.');
            clearSensitiveData();
            window.location.href = '/index.html';
    }
};

// Verificação inicial
document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    const lastRedirect = sessionStorage.getItem('lastRedirect');
    const now = Date.now();

    // Detectar loop de redirecionamento
    if (token && lastRedirect && (now - parseInt(lastRedirect)) < 3000) {
        console.warn('Possível loop de redirecionamento detectado');
        clearSensitiveData();
        showError('Problema de autenticação detectado. Por favor, faça login novamente.');
        return;
    }

    // Redirecionar se autenticado
    if (token && userRole) {
        console.log('Token encontrado, redirecionando...');
        redirectUser(userRole);
        return;
    }

    // Configurar formulário de login
    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
        console.error('Formulário de login não encontrado');
        showError('Erro interno: formulário de login não encontrado.');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = sanitizeInput(document.getElementById('email').value.trim());
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;

        if (!email || !password) {
            showError('Email e senha são obrigatórios.');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Email inválido.');
            return;
        }

        try {
            const response = await axios.post(
                `${API_BASE}/api/admin/login`,
                { email, password },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            const data = response.data;
            if (!data.token || !data.user_role) {
                throw new Error('Resposta inválida: token ou user_role ausentes');
            }

            console.log('Login bem-sucedido:', { user_role: data.user_role });
            storeAuthData(data, rememberMe);
            sessionStorage.removeItem('redirectCount'); // Resetar contador
            redirectUser(data.user_role);

        } catch (error) {
            console.error('Erro no login:', error);
            let message = 'Erro ao fazer login. Verifique suas credenciais.';
            if (error.response) {
                message = error.response.data?.error || message;
                if (error.response.status === 401) message = 'Credenciais inválidas.';
                else if (error.response.status === 403) message = 'Acesso não autorizado.';
                else if (error.response.status === 500) message = 'Erro interno no servidor.';
            } else if (error.code === 'ECONNABORTED') {
                message = 'Tempo de conexão excedido.';
            } else if (error.message.includes('Network Error')) {
                message = 'Falha na conexão com o servidor.';
            }
            showError(message);
        } finally {
            document.getElementById('password').value = '';
        }
    });
});