const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
const socket = io(API_BASE);

// Carregar DOMPurify para sanitização
const DOMPurify = window.DOMPurify;

// Tratamento de erros centralizado
const handleError = (error, defaultMessage = 'Ocorreu um erro.') => {
    const message = error.response?.data?.error || error.message || defaultMessage;
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.innerHTML = DOMPurify.sanitize(message);
        errorElement.classList.remove('hidden');
        setTimeout(() => errorElement.classList.add('hidden'), 5000);
    } else {
        console.error('Error element not found:', message);
    }
};

// Limpar dados sensíveis
const clearSensitiveData = () => {
    console.log('Limpando dados sensíveis');
    ['adminToken', 'userRole', 'queues'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
};

// Obter token
const getToken = () => localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

// Armazenar dados de autenticação
const storeAuthData = (data, rememberMe) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('adminToken', data.access_token);
    storage.setItem('userRole', data.user_role);
    if (data.queues) storage.setItem('queues', JSON.stringify(data.queues));
    console.log('Dados armazenados:', { token: data.access_token.substring(0, 10) + '...', userRole: data.user_role });
};

// Redirecionar com base no papel
const redirectUser = (userRole) => {
    console.log('Redirecionando para:', userRole);
    const routes = {
        'attendant': '/attendant.html',
        'branch_admin': '/branch-admin.html',
        'inst_admin': '/institution-admin.html',
        'sys_admin': '/system-admin.html'
    };
    const route = routes[userRole] || '/index.html';
    if (route === '/index.html') {
        handleError('Papel de usuário inválido.');
        clearSensitiveData();
    }
    window.location.href = route;
};

// Verificar token
const verifyToken = async () => {
    const token = getToken();
    if (!token) {
        console.log('Token não encontrado, redirecionando para login');
        window.location.href = '/index.html';
        return;
    }

    try {
        const response = await axios.get(`${API_BASE}/api/auth/verify-token`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const data = response.data;
        if (!data.user_role) throw new Error('Resposta inválida: user_role ausente');
        localStorage.setItem('userRole', data.user_role);
        redirectUser(data.user_role);

    } catch (error) {
        if (error.response?.status === 401) {
            // Tentar atualizar o token
            try {
                const refreshResponse = await axios.post(`${API_BASE}/api/auth/refresh`, {}, {
                    withCredentials: true
                });
                storeAuthData(refreshResponse.data, true);
                verifyToken();
            } catch (refreshError) {
                handleError(refreshError, 'Sessão expirada. Faça login novamente.');
                clearSensitiveData();
                window.location.href = '/index.html';
            }
        } else {
            handleError(error, 'Erro ao verificar token.');
            clearSensitiveData();
            window.location.href = '/index.html';
        }
    }
};

// Carregar dados da instituição
const loadInstitutionData = async () => {
    try {
        const token = getToken();
        const response = await axios.get(`${API_BASE}/api/institution`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const { branches, departments, attendants, branch_admins } = response.data;

        // Atualizar UI com dados
        const branchesContainer = document.getElementById('branches-container');
        branchesContainer.innerHTML = branches.map(b => `
            <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-lg font-semibold">${DOMPurify.sanitize(b.name)}</h3>
                <p>${DOMPurify.sanitize(b.location)}</p>
                <button class="edit-branch" data-id="${b.id}">Editar</button>
                <button class="delete-branch" data-id="${b.id}">Excluir</button>
            </div>
        `).join('');

        const departmentsContainer = document.getElementById('departments-container');
        departmentsContainer.innerHTML = departments.map(d => `
            <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-lg font-semibold">${DOMPurify.sanitize(d.name)}</h3>
                <p>Setor: ${DOMPurify.sanitize(d.sector)}</p>
                <p>Filial: ${DOMPurify.sanitize(d.branch_name)}</p>
                <button class="edit-department" data-id="${d.id}">Editar</button>
                <button class="delete-department" data-id="${d.id}">Excluir</button>
            </div>
        `).join('');

        // Adicionar listeners para botões
        document.querySelectorAll('.edit-branch').forEach(btn => {
            btn.addEventListener('click', () => editBranch(btn.dataset.id));
        });
        document.querySelectorAll('.delete-branch').forEach(btn => {
            btn.addEventListener('click', () => deleteBranch(btn.dataset.id));
        });
        document.querySelectorAll('.edit-department').forEach(btn => {
            btn.addEventListener('click', () => editDepartment(btn.dataset.id));
        });
        document.querySelectorAll('.delete-department').forEach(btn => {
            btn.addEventListener('click', () => deleteDepartment(btn.dataset.id));
        });

    } catch (error) {
        handleError(error, 'Erro ao carregar dados da instituição.');
    }
};

// Funções de CRUD (exemplo)
const editBranch = async (id) => {
    // Implementar modal de edição
    console.log('Editar filial:', id);
};

const deleteBranch = async (id) => {
    if (confirm('Deseja excluir esta filial?')) {
        try {
            const token = getToken();
            await axios.delete(`${API_BASE}/api/branches/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadInstitutionData();
        } catch (error) {
            handleError(error, 'Erro ao excluir filial.');
        }
    }
};

const editDepartment = async (id) => {
    // Implementar modal de edição
    console.log('Editar departamento:', id);
};

const deleteDepartment = async (id) => {
    if (confirm('Deseja excluir este departamento?')) {
        try {
            const token = getToken();
            await axios.delete(`${API_BASE}/api/departments/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadInstitutionData();
        } catch (error) {
            handleError(error, 'Erro ao excluir departamento.');
        }
    }
};

// WebSocket para notificações
socket.on('institution-updated', () => {
    console.log('Instituição atualizada, recarregando dados');
    loadInstitutionData();
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html')) {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) {
            handleError(null, 'Formulário de login não encontrado.');
            return;
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = DOMPurify.sanitize(document.getElementById('email').value.trim());
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me')?.checked || false;

            if (!email || !password) {
                handleError(null, 'Email e senha são obrigatórios.');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                handleError(null, 'Email inválido.');
                return;
            }

            try {
                const response = await axios.post(
                    `${API_BASE}/api/admin/login`,
                    { email, password },
                    { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
                );
                storeAuthData(response.data, rememberMe);
                redirectUser(response.data.user_role);
            } catch (error) {
                handleError(error, 'Falha no login. Verifique suas credenciais.');
            } finally {
                document.getElementById('password').value = '';
            }
        });
    } else {
        verifyToken();
        if (localStorage.getItem('userRole') === 'inst_admin') {
            loadInstitutionData();
        }
    }
});