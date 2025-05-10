const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

// Função para sanitizar entradas e evitar XSS
const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

// Função para validar o token JWT
const isValidToken = (token) => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        return payload.exp && payload.exp > now;
    } catch (e) {
        console.error('Erro ao validar token:', e);
        return false;
    }
};

// Função para limpar dados sensíveis
const clearSensitiveData = (useSessionStorage = false) => {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    storage.removeItem('adminToken');
    storage.removeItem('userId');
    storage.removeItem('userRole');
    storage.removeItem('userEmail');
    storage.removeItem('institutionId');
    storage.removeItem('branchId');
    storage.removeItem('queues');
    storage.removeItem('departments');
    storage.removeItem('attendants');
    storage.removeItem('branch_admins');
    storage.removeItem('branches');
    storage.removeItem('institutions');
};

// Função para exibir mensagem de erro
const showError = (message) => {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = sanitizeInput(message);
        errorElement.classList.remove('hidden');
        setTimeout(() => errorElement.classList.add('hidden'), 5000);
    }
};

// Função para redirecionar com base no papel
const redirectUser = (userRole) => {
    switch (userRole) {
        case 'sys_admin':
            window.location.href = '/system-admin.html';
            break;
        case 'inst_admin':
            window.location.href = '/institution-admin.html';
            break;
        case 'branch_admin':
            window.location.href = '/branch-admin.html';
            break;
        case 'attendant':
            window.location.href = '/attendant.html';
            break;
        default:
            showError('Papel de usuário não suportado.');
            clearSensitiveData();
            break;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const useSessionStorage = !document.getElementById('remember-me')?.checked;
    const storage = useSessionStorage ? sessionStorage : localStorage;
    const existingToken = storage.getItem('adminToken');
    if (existingToken && isValidToken(existingToken)) {
        const userRole = storage.getItem('userRole');
        redirectUser(userRole);
        return;
    } else {
        clearSensitiveData(useSessionStorage);
    }

    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
        console.error('Formulário de login não encontrado');
        showError('Erro interno. Formulário de login não encontrado.');
        return;
    }

    const forgotPasswordLink = document.querySelector('a[href="#"]');
    if (forgotPasswordLink && forgotPasswordLink.textContent.includes('Esqueceu a senha')) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt('Digite seu email para redefinição de senha:');
            if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                try {
                    await axios.post(`${API_BASE}/api/auth/forgot-password`, { email });
                    showError('Instruções de redefinição enviadas para o email.');
                } catch (error) {
                    showError(error.response?.data?.error || 'Erro ao solicitar redefinição de senha.');
                }
            } else {
                showError('Email inválido.');
            }
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const rememberMe = document.getElementById('remember-me')?.checked;
        const email = sanitizeInput(emailInput.value.trim());
        const password = passwordInput.value;

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
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    timeout: 10000,
                }
            );

            const { token, user_id, user_role, institution_id, branch_id, email: userEmail, queues, departments, attendants, branch_admins, branches, institutions } = response.data;

            if (!token || !user_id || !user_role) {
                throw new Error('Resposta inválida: token, user_id ou user_role ausentes');
            }
            if (!isValidToken(token)) {
                throw new Error('Token inválido ou expirado');
            }

            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('adminToken', token);
            storage.setItem('userId', user_id);
            storage.setItem('userRole', user_role);
            storage.setItem('userEmail', userEmail);
            if (institution_id) storage.setItem('institutionId', institution_id);
            if (branch_id) storage.setItem('branchId', branch_id);
            if (queues) storage.setItem('queues', JSON.stringify(queues));
            if (departments) storage.setItem('departments', JSON.stringify(departments));
            if (attendants) storage.setItem('attendants', JSON.stringify(attendants));
            if (branch_admins) storage.setItem('branch_admins', JSON.stringify(branch_admins));
            if (branches) storage.setItem('branches', JSON.stringify(branches));
            if (institutions) storage.setItem('institutions', JSON.stringify(institutions));

            console.log('Login bem-sucedido:', { user_id, user_role, userEmail });
            redirectUser(user_role);

        } catch (error) {
            console.error('Erro no login:', error);
            let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';
            if (error.response) {
                errorMessage = error.response.data?.error || errorMessage;
                if (error.response.status === 401) errorMessage = 'Credenciais inválidas.';
                else if (error.response.status === 403) errorMessage = 'Acesso não autorizado.';
                else if (error.response.status === 500) errorMessage = 'Erro interno no servidor.';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Tempo de conexão excedido.';
            } else if (error.message.includes('Network Error')) {
                errorMessage = 'Falha na conexão com o servidor.';
            }
            showError(errorMessage);
        } finally {
            passwordInput.value = '';
        }
    });
});